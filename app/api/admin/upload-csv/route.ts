import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { parse } from "csv-parse/sync"
import { requireAdmin } from "@/lib/requireAdmin"

export const runtime = "nodejs"

const REQUIRED = ["email", "title", "date"]
const OPTIONAL = ["time", "tag", "speaker", "description", "join_link"]

function normalizeHeader(h: string) {
  return h.trim().toLowerCase()
}

function detectDelimiter(sample: string): string {
  const lines = sample.split(/\r?\n/).filter((l) => l.trim().length > 0)
  const headerLine = lines[0] ?? ""

  const counts: Record<string, number> = {
    ",": (headerLine.match(/,/g) || []).length,
    "\t": (headerLine.match(/\t/g) || []).length,
    ";": (headerLine.match(/;/g) || []).length,
    "|": (headerLine.match(/\|/g) || []).length,
  }

  let best = ","
  let bestCount = counts[best]
  for (const [delim, ct] of Object.entries(counts)) {
    if (ct > bestCount) {
      best = delim
      bestCount = ct
    }
  }
  return best
}

export async function POST(req: Request) {

  const unauthorized = await requireAdmin()
  if (unauthorized) return unauthorized
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 })

    const raw = await file.text()
    const delimiter = detectDelimiter(raw.slice(0, 2000))

    const rowsRaw: Record<string, any>[] = parse(raw, {
      columns: (headers: string[]) => headers.map(normalizeHeader),
      skip_empty_lines: true,
      trim: true,
      delimiter,
    })

    if (!rowsRaw.length) {
      return NextResponse.json({ error: "CSV has no data rows" }, { status: 400 })
    }

    const headersPresent = new Set(Object.keys(rowsRaw[0] || {}))
    const missingRequired = REQUIRED.filter((h) => !headersPresent.has(h))
    if (missingRequired.length) {
      return NextResponse.json(
        {
          error: `Missing required columns: ${missingRequired.join(", ")}`,
          required: REQUIRED,
          optional: OPTIONAL,
          detectedDelimiter: delimiter === "\t" ? "TAB" : delimiter,
        },
        { status: 400 }
      )
    }

    // ✅ Group rows by email so we can replace assignments per user
    const byEmail = new Map<string, any[]>()
    for (const row of rowsRaw) {
      const email = (row.email ?? "").toString().trim().toLowerCase()
      const title = (row.title ?? "").toString().trim()
      const date = (row.date ?? "").toString().trim()
      if (!email || !email.includes("@") || !title || !date) continue

      if (!byEmail.has(email)) byEmail.set(email, [])
      byEmail.get(email)!.push(row)
    }

    let processed = 0
    let users = 0
    let webinars = 0
    let assignmentsInserted = 0
    let assignmentsDeleted = 0

    for (const [email, rows] of byEmail.entries()) {
      // 1) Upsert user
      const { data: user, error: userErr } = await supabaseAdmin
        .from("users")
        .upsert({ email }, { onConflict: "email" })
        .select("id,email")
        .single()

      if (userErr || !user) {
        console.error("user upsert error", userErr)
        continue
      }
      users++

      // Keep a list of webinar IDs that *should remain* assigned to this user
      const keepWebinarIds: string[] = []

      for (const row of rows) {
        const title = (row.title ?? "").toString().trim()
        const date = (row.date ?? "").toString().trim()
        const time = (row.time ?? "").toString().trim()
        const tag = ((row.tag ?? "upcoming").toString().trim() || "upcoming")
        const speaker = (row.speaker ?? "").toString().trim()
        const description = (row.description ?? "").toString().trim()
        const join_link = (row.join_link ?? "").toString().trim()

        const dtString = time ? `${date} ${time}` : `${date} 12:00 PM ET`
        const dt = new Date(dtString)
        if (isNaN(dt.getTime())) continue

        processed++

        // 2) Upsert webinar (stable unique key)
        const import_key = `${title.toLowerCase()}__${dt.toISOString()}`

        const { data: webinar, error: webinarErr } = await supabaseAdmin
          .from("webinars")
          .upsert(
            {
              import_key,
              title,
              description,
              speaker,
              tag,
              join_link,
              webinar_date: dt.toISOString(),
            },
            { onConflict: "import_key" }
          )
          .select("id")
          .single()

        if (webinarErr || !webinar) {
          console.error("webinar upsert error", webinarErr)
          continue
        }
        webinars++
        keepWebinarIds.push(webinar.id)

        // 3) Upsert assignment
        const { error: assignErr } = await supabaseAdmin
          .from("user_webinars")
          .upsert({ user_id: user.id, webinar_id: webinar.id }, { onConflict: "user_id,webinar_id" })

        if (assignErr) {
          console.error("assignment upsert error", assignErr)
          continue
        }
        assignmentsInserted++
      }

      // 4) ✅ Delete assignments that are NOT in keep list (replace behavior)
      // If keep list is empty, we skip deletion to avoid wiping user accidentally
      if (keepWebinarIds.length > 0) {
        const { data: current } = await supabaseAdmin
          .from("user_webinars")
          .select("webinar_id")
          .eq("user_id", user.id)

        const currentIds = new Set((current ?? []).map((r) => r.webinar_id))
        const keepIds = new Set(keepWebinarIds)

        const toDelete = [...currentIds].filter((id) => !keepIds.has(id))

        if (toDelete.length > 0) {
          const { error: delErr } = await supabaseAdmin
            .from("user_webinars")
            .delete()
            .eq("user_id", user.id)
            .in("webinar_id", toDelete)

          if (delErr) {
            console.error("delete old assignments error", delErr)
          } else {
            assignmentsDeleted += toDelete.length
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      detectedDelimiter: delimiter === "\t" ? "TAB" : delimiter,
      processed,
      users,
      webinars,
      assignmentsInserted,
      assignmentsDeleted,
      note: "CSV upload replaces assignments per user email",
    })
  } catch (err) {
    console.error("upload-csv route error:", err)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}