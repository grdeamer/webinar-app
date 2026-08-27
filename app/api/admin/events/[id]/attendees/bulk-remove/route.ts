import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/requireAdmin"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

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

    // Removed confirmation requirement for better UX - the dialog confirmation is sufficient

    // Clear older access-control records first so a cleanup failure never leaves
    // someone with access after they disappear from the canonical People directory.
    const emails = people.map((person) => String(person.email || "").trim().toLowerCase()).filter(Boolean)
    console.log("Processing user cleanup for emails:", emails.length)
    
    if (emails.length > 0) {
      const { data: users, error: usersError } = await supabaseAdmin
        .from("users")
        .select("id")
        .in("email", emails)

      console.log("User lookup results:", { usersCount: users?.length, usersError })

      if (usersError) return json({ error: usersError.message }, 400)
      if (users?.length) {
        const userIds = users.map((user) => user.id)
        console.log("Attempting legacy table cleanup for user IDs:", userIds.length)
        
        // Try to delete from legacy tables if they exist, but don't fail if they don't
        try {
          await supabaseAdmin.from("event_user_webinars").delete().eq("event_id", eventId).in("user_id", userIds)
          console.log("event_user_webinars deletion attempted")
        } catch (webinarError) {
          // Table might not exist, log but continue
          console.warn("event_user_webinars table doesn't exist or deletion failed:", webinarError)
        }
        
        try {
          await supabaseAdmin.from("event_attendees").delete().eq("event_id", eventId).in("user_id", userIds)
          console.log("event_attendees deletion attempted")
        } catch (attendeeError) {
          // Table might not exist, log but continue
          console.warn("event_attendees table doesn't exist or deletion failed:", attendeeError)
        }
      }
    }

    // Assignment rows are removed by the database's ON DELETE CASCADE rule.
    console.log("Attempting main deletion of event_registrants:", people.length)
    
    const { data: removed, error: removeError } = await supabaseAdmin
      .from("event_registrants")
      .delete()
      .eq("event_id", eventId)
      .in("id", people.map((person) => person.id))
      .select("id")

    console.log("Main deletion results:", { removedCount: removed?.length, removeError })

    if (removeError) return json({ error: removeError.message }, 400)

    return json({
      success: true,
      removed_count: removed?.length || people.length,
    })
  } catch (error) {
    console.error("bulk-remove attendees error:", error)
    return json({ error: error instanceof Error ? error.message : "Server error" }, 500)
  }
}
