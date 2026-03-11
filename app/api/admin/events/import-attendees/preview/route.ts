import { NextResponse } from "next/server"
import Papa from "papaparse"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/requireAdmin"
import type { CsvCell, CsvRow } from "@/lib/types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function json(data: any, status = 200) {
  return NextResponse.json(data, { status })
}

function normEmail(v: unknown) {
  return typeof v === "string" ? v.trim().toLowerCase() : ""
}

function pick(row: CsvRow, keys: string[]) {
  for (const k of keys) {
    const v = row[k]
    if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim()
  }
  return ""
}

function truthyCell(v: CsvCell) {
  if (v === null || v === undefined) return false
  const s = String(v).trim().toLowerCase()
  if (!s) return false
  return s === "1" || s === "y" || s === "yes" || s === "true" || s === "x" || s === "✓" || s === "on"
}

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)
}

async function resolveEventId(eventIdFromForm: string | null, rows: CsvRow[]) {
  if (eventIdFromForm) return eventIdFromForm

  const first = rows[0] || {}
  const slug = pick(first, ["event", "event_slug", "eventSlug", "Event"])
  if (!slug) return null

  const { data: ev } = await supabaseAdmin.from("events").select("id").eq("slug", slug).single()
  return ev?.id || null
}

async function resolveWebinarId(identifierRaw: string) {
  const identifier = String(identifierRaw || "").trim()
  if (!identifier) return { id: null as string | null, reason: "Empty webinar identifier" }

  if (isUuid(identifier)) {
    const { data } = await supabaseAdmin
      .from("webinars")
      .select("id")
      .eq("id", identifier)
      .maybeSingle()
    if (data?.id) return { id: data.id, reason: null as string | null }
  }

  const { data: byKey } = await supabaseAdmin
    .from("webinars")
    .select("id")
    .eq("import_key", identifier)
    .maybeSingle()
  if (byKey?.id) return { id: byKey.id, reason: null as string | null }

  const { data: byTitle } = await supabaseAdmin
    .from("webinars")
    .select("id")
    .eq("title", identifier)
    .maybeSingle()
  if (byTitle?.id) return { id: byTitle.id, reason: null as string | null }

  return { id: null as string | null, reason: `Unknown webinar: ${identifier}` }
}

export async function POST(req: Request) {
  try {
    const authResult = await requireAdmin()
    if (authResult instanceof Response) return authResult

    const form = await req.formData()
    const file = form.get("file")
    const event_id = (form.get("event_id") as string | null) || null

    if (!(file instanceof File)) {
      return json({ error: "CSV file is required" }, 400)
    }

    const csvText = await file.text()
    const parsed = Papa.parse<CsvRow>(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
    })

    if (parsed.errors?.length) {
      return json(
        { error: "CSV parse error", details: parsed.errors.slice(0, 5) },
        400
      )
    }

    const rows = (parsed.data ?? []).filter(Boolean)
    if (!rows.length) return json({ error: "CSV has no rows" }, 400)

    const finalEventId = await resolveEventId(event_id, rows)
    if (!finalEventId) {
      return json(
        {
          error:
            "Missing event. Provide event_id or include an 'event' column with the event slug.",
        },
        400
      )
    }

    const headers = (parsed.meta?.fields || []).map((h) => h.trim())
    const hasRowPerWebinar = headers.some((h) =>
      ["webinar", "webinar_slug", "webinar_id", "webinarId"].includes(h)
    )

    const baseCols = new Set([
      "event",
      "event_slug",
      "eventSlug",
      "eventId",
      "event_id",
      "email",
      "Email",
      "user",
      "user_email",
      "userEmail",
      "first_name",
      "last_name",
      "name",
    ])

    const rowErrors: Array<{ row: number; error: string }> = []
    const emails = new Set<string>()
    const webinarIdents = new Set<string>()
    let assignmentsPlanned = 0
    let invalidEmailCount = 0
    let missingWebinarCount = 0

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const email = normEmail(pick(row, ["email", "Email", "user", "user_email", "userEmail"]))
      if (!email || !email.includes("@")) {
        invalidEmailCount++
        rowErrors.push({ row: i + 2, error: "Missing/invalid email" })
        continue
      }
      emails.add(email)

      if (hasRowPerWebinar) {
        const w = pick(row, ["webinar", "webinar_slug", "webinar_id", "webinarId"])
        if (!w) {
          missingWebinarCount++
          rowErrors.push({
            row: i + 2,
            error: "Missing webinar (webinar/webinar_slug/webinar_id)",
          })
          continue
        }
        webinarIdents.add(w)
        assignmentsPlanned++
      } else {
        const cols = headers.filter((h) => !baseCols.has(h))
        for (const col of cols) {
          if (truthyCell(row[col])) {
            webinarIdents.add(col)
            assignmentsPlanned++
          }
        }
      }
    }

    const cache = new Map<string, { id: string | null; reason: string | null }>()
    const unknownWebinars: string[] = []

    for (const ident of webinarIdents) {
      const r = await resolveWebinarId(ident)
      cache.set(ident, { id: r.id, reason: r.reason })
      if (!r.id) unknownWebinars.push(ident)
    }

    if (unknownWebinars.length) {
      if (!hasRowPerWebinar) {
        for (const ident of unknownWebinars.slice(0, 25)) {
          rowErrors.push({ row: 1, error: `Unknown webinar column: ${ident}` })
        }
      }
    }

    return json({
      success: true,
      event_id: finalEventId,
      format: hasRowPerWebinar ? "row_per_webinar" : "matrix",
      usersDetected: emails.size,
      webinarsDetected: webinarIdents.size,
      assignmentsPlanned,
      invalidEmailCount,
      missingWebinarCount,
      unknownWebinarsCount: unknownWebinars.length,
      unknownWebinars: unknownWebinars.slice(0, 200),
      rowErrors: rowErrors.slice(0, 400),
      notes: unknownWebinars.length
        ? "Some webinar columns/identifiers do not match an existing webinar (by id, import_key, or exact title)."
        : null,
    })
  } catch (err: any) {
    console.error("import-attendees preview error:", err)
    return json({ error: "Server error" }, 500)
  }
}