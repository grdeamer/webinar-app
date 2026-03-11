import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function json(data: any, status = 200) {
  return NextResponse.json(data, { status })
}

function isHexColor(v: unknown) {
  return typeof v === "string" && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v.trim())
}

async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { ok: false as const, response: json({ error: "Unauthorized" }, 401) }
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("role,is_active")
    .eq("id", user.id)
    .maybeSingle()

  if (profileError) {
    return { ok: false as const, response: json({ error: profileError.message }, 400) }
  }

  if (!profile || profile.role !== "admin" || profile.is_active === false) {
    return { ok: false as const, response: json({ error: "Unauthorized" }, 401) }
  }

  return { ok: true as const }
}

export async function GET() {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.response

    const { data, error } = await supabaseAdmin
      .from("general_session_theme")
      .select("*")
      .eq("id", 1)
      .maybeSingle()

    if (error) {
      return json({ error: error.message }, 400)
    }

    return json({
      ok: true,
      theme: data || {
        id: 1,
        bg_color: "#020617",
        text_color: "#ffffff",
        font_family: "System",
        font_weight: "normal",
        font_style: "normal",
        panel_bg_color: "#0f172a",
        panel_text_color: "#ffffff",
        panel_font_family: "System",
        header_bg_color: "#ffffff",
        header_text_color: "#111111",
      },
    })
  } catch (e: any) {
    return json({ error: e?.message || "GET failed" }, 500)
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.response

    const body = await req.json().catch(() => ({}))

    const bg_color = isHexColor(body?.bg_color)
      ? String(body.bg_color).trim()
      : "#020617"

    const text_color = isHexColor(body?.text_color)
      ? String(body.text_color).trim()
      : "#ffffff"

    const font_family =
      typeof body?.font_family === "string" && body.font_family.trim()
        ? body.font_family.trim()
        : "System"

    const font_weight =
      typeof body?.font_weight === "string" && body.font_weight.trim()
        ? body.font_weight.trim()
        : "normal"

    const font_style =
      typeof body?.font_style === "string" && body.font_style.trim()
        ? body.font_style.trim()
        : "normal"

    const panel_bg_color = isHexColor(body?.panel_bg_color)
      ? String(body.panel_bg_color).trim()
      : "#0f172a"

    const panel_text_color = isHexColor(body?.panel_text_color)
      ? String(body.panel_text_color).trim()
      : "#ffffff"

    const panel_font_family =
      typeof body?.panel_font_family === "string" && body.panel_font_family.trim()
        ? body.panel_font_family.trim()
        : "System"

    const header_bg_color = isHexColor(body?.header_bg_color)
      ? String(body.header_bg_color).trim()
      : "#ffffff"

    const header_text_color = isHexColor(body?.header_text_color)
      ? String(body.header_text_color).trim()
      : "#111111"

    const payload = {
      id: 1,
      bg_color,
      text_color,
      font_family,
      font_weight,
      font_style,
      panel_bg_color,
      panel_text_color,
      panel_font_family,
      header_bg_color,
      header_text_color,
    }

    const { data, error } = await supabaseAdmin
      .from("general_session_theme")
      .upsert(payload)
      .select("*")
      .single()

    if (error) {
      return json({ error: error.message, details: error, payload }, 400)
    }

    return json({ ok: true, theme: data, payload })
  } catch (e: any) {
    return json(
      {
        error: e?.message || "Failed to save theme.",
        stack: e?.stack || null,
      },
      500
    )
  }
}