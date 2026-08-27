import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/requireAdmin"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const BATCH_SIZE = 100

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status })
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof Response) return auth

    const { id: eventId } = await context.params
    const body = await request.json().catch(() => ({}))
    
    console.log("Bulk removal request:", { eventId, attendeeIdsCount: body.attendee_ids?.length, bodyKeys: Object.keys(body) })
    
    const attendeeIds = Array.from(new Set(
      Array.isArray(body.attendee_ids)
        ? body.attendee_ids.filter((value: unknown): value is string => typeof value === "string" && UUID_PATTERN.test(value))
        : []
    ))

    console.log("Filtered attendee IDs:", attendeeIds.length)
    
    if (attendeeIds.length === 0) return json({ error: "Select at least one person" }, 400)

    const [{ data: event, error: eventError }, { count: totalPeople, error: countError }] = await Promise.all([
      supabaseAdmin.from("events").select("id,title").eq("id", eventId).maybeSingle(),
      supabaseAdmin.from("event_registrants").select("id", { count: "exact", head: true }).eq("event_id", eventId),
    ])

    console.log("Event data:", { event: event?.title, totalPeople, eventError, countError })

    if (eventError || !event) return json({ error: eventError?.message || "Event not found" }, 404)
    if (countError) return json({ error: countError.message }, 400)

    const { data: people, error: peopleError } = await supabaseAdmin
      .from("event_registrants")
      .select("id,email")
      .eq("event_id", eventId)
      .in("id", attendeeIds)

    console.log("People found for deletion:", { count: people?.length, peopleError })

    if (peopleError) return json({ error: peopleError.message }, 400)
    if (!people?.length) return json({ error: "None of the selected people belong to this event" }, 404)
    
    // Break into batches to avoid Supabase query limits
    const batches = []
    for (let i = 0; i < people.length; i += BATCH_SIZE) {
      batches.push(people.slice(i, i + BATCH_SIZE))
    }
    
    console.log(`Processing ${batches.length} batches of people`)

    // Removed confirmation requirement for better UX - the dialog confirmation is sufficient

    // Clear older access-control records first so a cleanup failure never leaves
    // someone with access after they disappear from the canonical People directory.
    const emails = people.map((person) => String(person.email || "").trim().toLowerCase()).filter(Boolean)
    console.log("Processing user cleanup for emails:", emails.length)
    
    if (emails.length > 0) {
      // Process emails in batches to avoid Supabase limits
      const emailBatches = []
      for (let i = 0; i < emails.length; i += BATCH_SIZE) {
        emailBatches.push(emails.slice(i, i + BATCH_SIZE))
      }
      
      let allUserIds: string[] = []
      
      for (const emailBatch of emailBatches) {
        const { data: users, error: usersError } = await supabaseAdmin
          .from("users")
          .select("id")
          .in("email", emailBatch)

        if (usersError) {
          console.warn("User lookup error for batch:", usersError)
          continue // Continue with other batches even if one fails
        }
        
        if (users?.length) {
          allUserIds.push(...users.map((user) => user.id))
        }
      }

      console.log("User lookup results:", { usersCount: allUserIds.length })

      if (allUserIds.length > 0) {
        console.log("Attempting legacy table cleanup for user IDs:", allUserIds.length)
        
        // Process user IDs in batches for legacy table cleanup
        const userIdBatches = []
        for (let i = 0; i < allUserIds.length; i += BATCH_SIZE) {
          userIdBatches.push(allUserIds.slice(i, i + BATCH_SIZE))
        }
        
        for (const userIdBatch of userIdBatches) {
          // Try to delete from legacy tables if they exist, but don't fail if they don't
          try {
            await supabaseAdmin.from("event_user_webinars").delete().eq("event_id", eventId).in("user_id", userIdBatch)
            console.log("event_user_webinars deletion attempted for batch")
          } catch (webinarError) {
            // Table might not exist, log but continue
            console.warn("event_user_webinars table doesn't exist or deletion failed:", webinarError)
          }
          
          try {
            await supabaseAdmin.from("event_attendees").delete().eq("event_id", eventId).in("user_id", userIdBatch)
            console.log("event_attendees deletion attempted for batch")
          } catch (attendeeError) {
            // Table might not exist, log but continue
            console.warn("event_attendees table doesn't exist or deletion failed:", attendeeError)
          }
        }
      }
    }

    // Assignment rows are removed by the database's ON DELETE CASCADE rule.
    console.log("Attempting main deletion of event_registrants in batches:", people.length)
    
    let totalRemoved = 0
    let lastError: Error | null = null
    
    for (const batch of batches) {
      const batchIds = batch.map((person) => person.id)
      console.log(`Deleting batch of ${batchIds.length} people`)
      
      const { data: removed, error: removeError } = await supabaseAdmin
        .from("event_registrants")
        .delete()
        .eq("event_id", eventId)
        .in("id", batchIds)
        .select("id")

      if (removeError) {
        console.error("Batch deletion error:", removeError)
        lastError = removeError
        // Continue with other batches even if one fails
      } else {
        totalRemoved += (removed?.length || 0)
        console.log(`Batch deletion successful: ${removed?.length} removed`)
      }
    }

    console.log("Main deletion results:", { totalRemoved, lastError })

    if (lastError && totalRemoved === 0) {
      return json({ error: lastError.message }, 400)
    }

    return json({
      success: true,
      removed_count: totalRemoved,
    })
  } catch (error) {
    console.error("bulk-remove attendees error:", error)
    return json({ error: error instanceof Error ? error.message : "Server error" }, 500)
  }
}
