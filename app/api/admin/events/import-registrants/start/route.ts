import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/requireAdmin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  const authResult = await requireAdmin()
  if (authResult instanceof Response) return authResult

  const form = await req.formData()
  const file = form.get("file")
  const eventId = String(form.get("event_id") || "").trim() || null

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "CSV file is required" }, { status: 400 })
  }

  const { data: job, error } = await supabaseAdmin
    .from("import_jobs")
    .insert({
      kind: "registrant_import",
      status: "queued",
      event_id: eventId,
      file_name: file.name,
      progress_pct: 0,
      processed_rows: 0,
      total_rows: 0,
      registrants_created: 0,
      registrants_updated: 0,
      assignments_written: 0,
      sessions_auto_created: 0,
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single()

  if (error || !job) {
    return NextResponse.json(
      { error: error?.message || "Failed to create import job" },
      { status: 500 }
    )
  }

  const fd = new FormData()
  fd.append("file", file)
  if (eventId) fd.append("event_id", eventId)
  fd.append("job_id", job.id)

  const importUrl = new URL("/api/admin/events/import-registrants", req.url)

  void fetch(importUrl, {
    method: "POST",
    body: fd,
    headers: {
      cookie: req.headers.get("cookie") || "",
    },
  }).catch(async (err) => {
    await supabaseAdmin
      .from("import_jobs")
      .update({
        status: "error",
        error_message: err?.message || "Failed to dispatch import job",
        finished_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", job.id)
  })

  return NextResponse.json({
    success: true,
    jobId: job.id,
  })
}