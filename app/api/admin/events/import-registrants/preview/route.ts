import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/requireAdmin"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { parseRegistrantCsv, type ParsedRegistrantImportRow } from "@/lib/imports/registrantCsv"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type EventRow = {
  id: string
  slug: string
}

type SessionRow = {
  id: string
  event_id: string
  code: string
  title: string
}

export async function POST(req: Request) {
  try {
    await requireAdmin()

    const form = await req.formData()
    const file = form.get("file")
    const forcedEventId = String(form.get("event_id") || "").trim() || null

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "CSV file is required" }, { status: 400 })
    }

    const csvText = await file.text()
    const parsed = parseRegistrantCsv(csvText)

    if (!parsed.rows.length) {
      return NextResponse.json({ error: "CSV has no rows" }, { status: 400 })
    }

    let eventMap = new Map<string, EventRow>()

    if (forcedEventId) {
      const { data: event, error } = await supabaseAdmin
        .from("events")
        .select("id,slug")
        .eq("id", forcedEventId)
        .maybeSingle()

      if (error || !event) {
        return NextResponse.json({ error: "Provided event_id was not found" }, { status: 400 })
      }

      eventMap.set(event.slug, event as EventRow)
    } else {
      const eventSlugs = Array.from(
        new Set(parsed.rows.map((r) => r.eventSlug).filter(Boolean) as string[])
      )

      const { data: events, error } = await supabaseAdmin
        .from("events")
        .select("id,slug")
        .in("slug", eventSlugs)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      eventMap = new Map((events || []).map((e) => [e.slug, e as EventRow]))
    }

    const eventIds = Array.from(new Set(Array.from(eventMap.values()).map((e) => e.id)))

    let sessionRows: SessionRow[] = []
    if (eventIds.length) {
      const { data: sessions, error } = await supabaseAdmin
        .from("event_sessions")
        .select("id,event_id,code,title")
        .in("event_id", eventIds)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      sessionRows = (sessions || []) as SessionRow[]
    }

    const sessionMap = new Map<string, SessionRow>()
    for (const session of sessionRows) {
      sessionMap.set(`${session.event_id}::${String(session.code).toUpperCase()}`, session)
    }

    const seenEventEmail = new Set<string>()
    const previewRows = parsed.rows.map((row: ParsedRegistrantImportRow) => {
      const errors = [...row.errors]

      const event =
        forcedEventId
          ? Array.from(eventMap.values())[0] || null
          : (row.eventSlug ? eventMap.get(row.eventSlug) || null : null)

      if (!event) {
        errors.push(`Unknown event slug: ${row.eventSlug || "(blank)"}`)
      }

      const dedupeKey = event ? `${event.id}::${row.email}` : `missing::${row.email}`
      if (row.email) {
        if (seenEventEmail.has(dedupeKey)) {
          errors.push("Duplicate email row for same event in this file")
        } else {
          seenEventEmail.add(dedupeKey)
        }
      }

      const unknownSessionCodes: string[] = []
      if (event) {
        for (const code of row.sessionCodes) {
          const key = `${event.id}::${code}`
          if (!sessionMap.has(key)) unknownSessionCodes.push(code)
        }
      }

      if (unknownSessionCodes.length) {
        errors.push(`Unknown session code(s): ${unknownSessionCodes.join(", ")}`)
      }

      return {
        rowNumber: row.rowNumber,
        eventSlug: row.eventSlug,
        resolvedEventId: event?.id || null,
        email: row.email,
        firstName: row.firstName,
        lastName: row.lastName,
        tag: row.tag,
        notes: row.notes,
        sessionCodes: row.sessionCodes,
        valid: errors.length === 0,
        errors,
      }
    })

    const validRows = previewRows.filter((r) => r.valid)
    const invalidRows = previewRows.filter((r) => !r.valid)

    return NextResponse.json({
      success: true,
      summary: {
        totalRows: previewRows.length,
        validRows: validRows.length,
        invalidRows: invalidRows.length,
        eventsDetected: eventMap.size,
      },
      rows: previewRows,
    })
  } catch (err: any) {
    console.error("import-registrants preview error:", err)
    return NextResponse.json(
      { error: err?.message || "Server error" },
      { status: 500 }
    )
  }
}