import { NextResponse } from "next/server"
import { requireEventOperatorAccess } from "@/lib/eventTeamAccess"
import { eventButtonStyles, eventDesignFonts, safeEventLogo, findEventDesignPreset, resolveEventDesign, sessionLayouts } from "@/lib/page-editor/eventDesignPresets"
import type { EventTheme } from "@/lib/page-editor/sectionTypes"
import { supabaseAdmin } from "@/lib/supabase/admin"

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const access = await requireEventOperatorAccess(id, ["event_admin"], "experience")
  if (access instanceof Response) return access

  const body = await request.json().catch((): null => null)
  const preset = findEventDesignPreset(body?.presetId)
  const accent = body?.accentColor
  const layout = sessionLayouts.find((option) => option.id === body?.sessionLayout)
  if ((body?.sessionLayout !== undefined && !layout) || !preset || (accent !== undefined && (typeof accent !== "string" || !/^#[0-9a-f]{6}$/i.test(accent)))) {
    return NextResponse.json({ error: "Choose a theme and a valid accent color." }, { status: 400 })
  }

  const { fontStyle, buttonStyle, logoUrl } = body
  const logo = safeEventLogo(logoUrl)
  if ((fontStyle !== undefined && fontStyle !== "" && (typeof fontStyle !== "string" || !Object.hasOwn(eventDesignFonts, fontStyle))) ||
      (buttonStyle !== undefined && !eventButtonStyles.some((style) => style === buttonStyle)) ||
      (logoUrl !== undefined && logoUrl !== "" && !logo)) {
    return NextResponse.json({ error: "Choose a supported font and button style, and enter an HTTPS logo URL." }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin.from("events").select("event_theme").eq("id", access.eventId).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const eventTheme: EventTheme = { ...data.event_theme, presetId: preset.id, accentColor: accent ?? preset.accent, ...(layout ? { sessionLayout: layout.id } : {}),
    ...(fontStyle !== undefined ? { fontStyle } : {}),
    ...(buttonStyle !== undefined ? { buttonStyle } : {}),
    ...(logoUrl !== undefined ? { logoUrl: logo } : {}), }
  const { error: updateError } = await supabaseAdmin.from("events").update({ event_theme: eventTheme }).eq("id", access.eventId)
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 })

  return NextResponse.json({ theme: resolveEventDesign(eventTheme, null) })
}
