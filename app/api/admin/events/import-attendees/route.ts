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

  const { data: ev } = await supabaseAdmin
    .from("events")
    .select("id")
    .eq("slug", slug)
    .single()

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
    if (!rows.length) {
      return json({ error: "CSV has no rows" }, 400)
    }

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
      "eventId",
      "event_id",
      "email",
      "user",
      "user_email",
      "first_name",
      "last_name",
      "name",
    ])

    let processed = 0
    let usersUpserted = 0
    let assignmentsUpserted = 0

    const rowErrors: Array<{ row: number; error: string }> = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]

      const email = normEmail(
        pick(row, ["email", "Email", "user", "user_email", "userEmail"])
      )

      if (!email || !email.includes("@")) {
        rowErrors.push({ row: i + 2, error: "Missing/invalid email" })
        continue
      }

      const { data: user, error: uErr } = await supabaseAdmin
        .from("users")
        .upsert({ email }, { onConflict: "email" })
        .select("id")
        .single()

      if (uErr || !user?.id) {
        rowErrors.push({
          row: i + 2,
          error: `User upsert failed: ${uErr?.message || "unknown"}`,
        })
        continue
      }

      usersUpserted++

      let webinarIdentifiers: string[] = []

      if (hasRowPerWebinar) {
        const w = pick(row, ["webinar", "webinar_slug", "webinar_id", "webinarId"])
        if (!w) {
          rowErrors.push({
            row: i + 2,
            error: "Missing webinar (webinar/webinar_slug/webinar_id)",
          })
          continue
        }
        webinarIdentifiers = [w]
      } else {
        webinarIdentifiers = headers
          .filter((h) => !baseCols.has(h))
          .filter((h) => truthyCell(row[h]))

        if (!webinarIdentifiers.length) {
          processed++
          continue
        }
      }

      for (const ident of webinarIdentifiers) {
        const { id: webinarId, reason } = await resolveWebinarId(ident)

        if (!webinarId) {
          rowErrors.push({ row: i + 2, error: reason || "Unknown webinar" })
          continue
        }

        const { error: uwErr } = await supabaseAdmin
          .from("user_webinars")
          .upsert(
            { user_id: user.id, webinar_id: webinarId },
            { onConflict: "user_id,webinar_id" }
          )

        if (uwErr) {
          rowErrors.push({
            row: i + 2,
            error: `user_webinars upsert failed: ${uwErr.message}`,
          })
          continue
        }

        try {
          await supabaseAdmin
            .from("event_user_webinars")
            .upsert(
              { event_id: finalEventId, user_id: user.id, webinar_id: webinarId },
              { onConflict: "event_id,user_id,webinar_id" }
            )
        } catch {
          // ignore if table does not exist yet
        }

        assignmentsUpserted++
      }

      processed++
    }

    return json({
      success: true,
      event_id: finalEventId,
      processed,
      usersUpserted,
      assignmentsUpserted,
      rowErrors,
    })
  } catch (err: any) {
    console.error("import-attendees error:", err)
    return json({ error: "Server error" }, 500)
  }
}