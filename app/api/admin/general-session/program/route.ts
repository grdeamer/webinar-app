import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/requireAdmin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function json(data: any, status = 200): Response {
  return NextResponse.json(data, { status })
}

export async function POST(req: Request): Promise<Response> {
  await requireAdmin()

  const body = await req.json().catch(() => ({}))
  const action = String(body?.action || "").trim()

  if (!action) return json({ error: "Missing action" }, 400)

  if (action === "take_video") {
    const { data: settings, error } = await supabaseAdmin
      .from("general_session_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle()

    if (error) return json({ error: error.message }, 400)

    const s = settings as any
    const program_source_type = s?.source_type || null
    const program_mp4_path = program_source_type === "mp4" ? s?.mp4_path ?? null : null
    const program_m3u8_url = program_source_type === "m3u8" ? s?.m3u8_url ?? null : null
    const program_rtmp_url = program_source_type === "rtmp" ? s?.rtmp_url ?? null : null

    const { data, error: upErr } = await supabaseAdmin
      .from("general_session_program")
      .upsert(
        {
          id: 1,
          program_kind: "video",
          program_source_type,
          program_mp4_path,
          program_m3u8_url,
          program_rtmp_url,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      )
      .select("*")
      .single()

    if (upErr) return json({ error: upErr.message }, 400)
    return json({ program: data })
  }

  if (action === "take_slide") {
    const slide_path = typeof body?.slide_path === "string" ? body.slide_path.trim() : ""
    if (!slide_path) return json({ error: "Missing slide_path" }, 400)

    const { data, error } = await supabaseAdmin
      .from("general_session_program")
      .upsert(
        {
          id: 1,
          program_kind: "slides",
          program_slide_path: slide_path,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      )
      .select("*")
      .single()

    if (error) return json({ error: error.message }, 400)
    return json({ program: data })
  }

  if (action === "set_lower_third") {
    const name = typeof body?.name === "string" ? body.name.trim().slice(0, 120) : ""
    const title = typeof body?.title === "string" ? body.title.trim().slice(0, 160) : ""
    if (!name) return json({ error: "Name is required" }, 400)

    const { data, error } = await supabaseAdmin
      .from("general_session_program")
      .upsert(
        {
          id: 1,
          lower_third_active: true,
          lower_third_name: name,
          lower_third_title: title || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      )
      .select("*")
      .single()

    if (error) return json({ error: error.message }, 400)
    return json({ program: data })
  }

  if (action === "clear_lower_third") {
    const { data, error } = await supabaseAdmin
      .from("general_session_program")
      .upsert(
        {
          id: 1,
          lower_third_active: false,
          lower_third_name: null,
          lower_third_title: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      )
      .select("*")
      .single()

    if (error) return json({ error: error.message }, 400)
    return json({ program: data })
  }

  if (action === "get") {
    const { data, error } = await supabaseAdmin
      .from("general_session_program")
      .select("*")
      .eq("id", 1)
      .maybeSingle()

    if (error) return json({ error: error.message }, 400)
    return json({ program: data || null })
  }

  if (action === "set_preview_slot") {
    const slot = Number(body?.slot)
    if (!Number.isFinite(slot) || slot < 1 || slot > 7) {
      return json({ error: "Invalid slot" }, 400)
    }

    const { data, error } = await supabaseAdmin
      .from("general_session_program")
      .upsert(
        {
          id: 1,
          preview_slot: slot,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      )
      .select("*")
      .single()

    if (error) return json({ error: error.message }, 400)
    return json({ program: data })
  }

  if (action === "set_transition_ms") {
    const ms = Math.max(0, Math.min(5000, Number(body?.ms || 0)))

    const { data, error } = await supabaseAdmin
      .from("general_session_program")
      .upsert(
        {
          id: 1,
          transition_ms: ms,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      )
      .select("*")
      .single()

    if (error) return json({ error: error.message }, 400)
    return json({ program: data })
  }

  if (action === "cut_to_preview" || action === "auto_to_preview") {
    const isAuto = action === "auto_to_preview"

    const { data: row, error: rErr } = await supabaseAdmin
      .from("general_session_program")
      .select("*")
      .eq("id", 1)
      .maybeSingle()

    if (rErr) return json({ error: rErr.message }, 400)

    const preview_slot = (row as any)?.preview_slot ?? null
    if (!preview_slot) return json({ error: "No preview slot set" }, 400)

    const { data: mv, error: mvErr } = await supabaseAdmin
      .from("general_session_multiview")
      .select("*")
      .eq("id", 1)
      .maybeSingle()

    if (mvErr) return json({ error: mvErr.message }, 400)

    const slotSource = (mv as any)?.slots?.[String(preview_slot)] || null
    if (!slotSource) return json({ error: "Preview slot is empty" }, 400)

    const kind = slotSource.kind as string
    const now = new Date().toISOString()

    const base: any = {
      id: 1,
      program_slot: preview_slot,
      transition_kind: isAuto ? "auto" : "cut",
      transition_started_at: isAuto ? now : null,
      updated_at: now,
    }

    if (kind === "slides" && slotSource.slide_path) {
      base.program_kind = "slides"
      base.program_slide_path = slotSource.slide_path
    } else {
      base.program_kind = "video"

      if (kind === "hls") {
        base.program_source_type = "m3u8"
        base.program_m3u8_url = slotSource.preview_url || null
        base.program_mp4_path = null
        base.program_rtmp_url = null
      } else if (kind === "rtmp") {
        base.program_source_type = "rtmp"
        base.program_rtmp_url = null
        base.program_mp4_path = null
        base.program_m3u8_url = null
      } else {
        base.program_source_type = "mp4"
      }
    }

    const { data, error } = await supabaseAdmin
      .from("general_session_program")
      .upsert(base, { onConflict: "id" })
      .select("*")
      .single()

    if (error) return json({ error: error.message }, 400)

    return json({ program: data })
  }

  return json({ error: "Unknown action" }, 400)
}