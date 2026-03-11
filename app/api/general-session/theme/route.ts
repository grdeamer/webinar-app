import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function json(data: any, status = 200) {
  return NextResponse.json(data, { status })
}

function isHexColor(v: unknown) {
  return typeof v === "string" && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v.trim())
}

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("general_session_theme")
      .select("*")
      .eq("id", 1)
      .maybeSingle()

    if (error) return json({ error: error.message }, 400)

    return json({
      theme: data || {
        id: 1,
        bg_color: "#020617",
        text_color: "#ffffff",
        font_family: "System",
        font_weight: "normal",
        font_style: "normal",
      },
    })
  } catch (e: any) {
    return json({ error: e?.message || "GET failed" }, 500)
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))

    const bg_color = isHexColor(body?.bg_color) ? String(body.bg_color).trim() : "#020617"
    const text_color = isHexColor(body?.text_color) ? String(body.text_color).trim() : "#ffffff"

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

    const payload = {
      id: 1,
      bg_color,
      text_color,
      font_family,
      font_weight,
      font_style,
    }

    const { data, error } = await supabaseAdmin
      .from("general_session_theme")
      .upsert(payload)
      .select("*")
      .single()

    if (error) {
      return json(
        {
          error: error.message,
          details: error,
          payload,
        },
        400
      )
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