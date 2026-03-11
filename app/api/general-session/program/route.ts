import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function json(data: any, status = 200) {
  return NextResponse.json(data, { status })
}

export async function GET() {
  const { data: pRow, error: pErr } = await supabaseAdmin
    .from("general_session_program")
    .select("*")
    .eq("id", 1)
    .maybeSingle()

  if (pErr) return json({ error: pErr.message }, 400)

  const row =
    pRow ||
    ({
      id: 1,
      program_kind: "video",
      program_source_type: null,
      program_mp4_path: null,
      program_m3u8_url: null,
      program_rtmp_url: null,
      program_slide_path: null,
      lower_third_active: false,
      lower_third_name: null,
      lower_third_title: null,
    } as any)

  // Sign any storage-backed assets (private bucket)
  let program_mp4_url: string | null = null
  if (row.program_mp4_path) {
    const { data } = await supabaseAdmin.storage
      .from("private")
      .createSignedUrl(row.program_mp4_path, 60 * 60)
    program_mp4_url = data?.signedUrl ?? null
  }

  let slide_url: string | null = null
  if (row.program_slide_path) {
    const { data } = await supabaseAdmin.storage
      .from("private")
      .createSignedUrl(row.program_slide_path, 60 * 60)
    slide_url = data?.signedUrl ?? null
  }

  return json({
    program: {
      program_kind: row.program_kind,
      program_source_type: row.program_source_type,
      program_mp4_url,
      program_m3u8_url: row.program_m3u8_url,
      program_rtmp_url: row.program_rtmp_url,
      slide_url,
      lower_third: {
        active: Boolean(row.lower_third_active),
        name: row.lower_third_name,
        title: row.lower_third_title,
      },
    },
  })
}
