import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/requireAdmin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: Request) {

  const unauthorized = await requireAdmin()
  if (unauthorized) return unauthorized

  const form = await req.formData()

  const file = form.get("file")
  const eventId = String(form.get("event_id") || "").trim() || null

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "CSV file is required" },
      { status: 400 }
    )
  }

  const { data: job, error } = await supabaseAdmin
    .from("import_jobs")
    .insert({
      kind: "registrant_import",
      status: "running",
      event_id: eventId,
      file_name: file.name,
      progress_pct: 0,
      processed_rows: 0,
      started_at: new Date().toISOString()
    })
    .select("id")
    .single()

  if (error || !job) {
    return NextResponse.json(
      { error: error?.message || "Failed to create job" },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    jobId: job.id
  })
}