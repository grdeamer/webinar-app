import { NextResponse } from "next/server"
import Papa from "papaparse"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/requireAdmin"
import type { CsvRow } from "@/lib/types"

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

function toImportKey(title: string, dateISO: string, time: string) {
  return `${title.trim().toLowerCase()}|${dateISO}|${time.trim().toLowerCase()}`
}

function toDateISO(dateRaw: string) {
  const d = new Date(dateRaw)
  if (Number.isNaN(d.getTime())) return ""
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

export async function POST(req: Request): Promise<Response> {
  try {
    await requireAdmin()

    const form = await req.formData()
    const file = form.get("file")
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "CSV file is required" }, { status: 400 })
    }

    const csvText = await file.text()

    const parsed = Papa.parse<CsvRow>(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
    })

    if (parsed.errors?.length) {
      return NextResponse.json(
        { error: "CSV parse error", details: parsed.errors.slice(0, 5) },
        { status: 400 }
      )
    }

    const rows = (parsed.data ?? []).filter(Boolean)
    if (!rows.length) {
      return NextResponse.json({ error: "CSV has no rows" }, { status: 400 })
    }

    let processed = 0
    let usersUpserted = 0
    let webinarsUpserted = 0
    let assignmentsUpserted = 0

    const rowErrors: Array<{ row: number; error: string }> = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]

      const email = normEmail(pick(row, ["email", "Email", "user_email", "userEmail"]))
      const title = pick(row, ["title", "Title", "webinar_title", "webinarTitle"])
      const description = pick(row, ["description", "Description", "desc"])
      const speaker = pick(row, ["speaker", "Speaker", "presenter"])
      const tag = pick(row, ["tag", "Tag", "status", "type"]) || "upcoming"
      const time = pick(row, ["time", "Time"])
      const join_link = pick(row, ["join_link", "joinLink", "link", "url"])

      const dateRaw =
        pick(row, ["webinar_date", "webinarDate", "date", "Date"]) ||
        pick(row, ["webinar_datetime", "datetime", "date_time"])

      if (!email || !email.includes("@")) {
        rowErrors.push({ row: i + 2, error: "Missing/invalid email" })
        continue
      }
      if (!title) {
        rowErrors.push({ row: i + 2, error: "Missing title" })
        continue
      }

      const dateISO = dateRaw ? toDateISO(dateRaw) : ""
      if (!dateISO) {
        rowErrors.push({ row: i + 2, error: "Missing/invalid date" })
        continue
      }

      const import_key = toImportKey(title, dateISO, time)
      const webinar_date = `${dateISO}T00:00:00.000Z`

      const { data: user, error: userErr } = await supabaseAdmin
        .from("users")
        .upsert({ email }, { onConflict: "email" })
        .select("id,email")
        .single()

      if (userErr || !user) {
        rowErrors.push({ row: i + 2, error: `User upsert failed: ${userErr?.message || "unknown"}` })
        continue
      }
      usersUpserted++

      const { data: webinar, error: webErr } = await supabaseAdmin
        .from("webinars")
        .upsert(
          {
            import_key,
            title,
            description: description || null,
            speaker: speaker || null,
            webinar_date,
            time: time || null,
            tag: tag || null,
            join_link: join_link || null,
          },
          { onConflict: "import_key" }
        )
        .select("id")
        .single()

      if (webErr || !webinar) {
        rowErrors.push({
          row: i + 2,
          error: `Webinar upsert failed: ${webErr?.message || "unknown"}`,
        })
        continue
      }
      webinarsUpserted++

      const { error: linkErr } = await supabaseAdmin
        .from("user_webinars")
        .upsert(
          { user_id: user.id, webinar_id: webinar.id },
          { onConflict: "user_id,webinar_id" }
        )

      if (linkErr) {
        rowErrors.push({ row: i + 2, error: `Assignment failed: ${linkErr.message}` })
        continue
      }

      assignmentsUpserted++
      processed++
    }

    return NextResponse.json({
      success: true,
      processed,
      usersUpserted,
      webinarsUpserted,
      assignmentsUpserted,
      rowErrors,
    })
  } catch (err: any) {
    console.error("upload-csv error:", err)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}