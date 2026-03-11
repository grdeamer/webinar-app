import { cookies } from "next/headers"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/requireAdmin"

import ActivityTracker from "@/components/ActivityTracker"
import FeaturedQuestionOverlay from "@/components/FeaturedQuestionOverlay"
import GeneralSessionKickGuard from "@/components/GeneralSessionKickGuard"
import GeneralSessionQA from "@/components/GeneralSessionQA"
import GeneralSessionQAModeration from "@/components/GeneralSessionQAModeration"
import OnAirCorner from "./OnAirCorner"
import StageViewSwitcher from "./StageViewSwitcher"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type SettingsRow = {
  id: number
  title: string | null
  source_type: "mp4" | "m3u8" | "rtmp"
  mp4_path: string | null
  m3u8_url: string | null
  rtmp_url: string | null
  poster_url: string | null
  is_published: boolean
  presenter_key?: string | null
  updated_at: string
}

type ControlRow = {
  id: number
  state: "holding" | "live" | "paused" | "ended"
  message: string | null
  updated_at: string | null
}

type ProgramRow = {
  id: number
  program_kind: "video" | "slides"
  program_source_type: "mp4" | "m3u8" | "rtmp" | null
  program_mp4_path: string | null
  program_m3u8_url: string | null
  program_rtmp_url: string | null
  program_slide_path: string | null
  lower_third_active: boolean
  lower_third_name: string | null
  lower_third_title: string | null
  updated_at: string | null
}

type ThemeRow = {
  id: number
  bg_color: string | null
  text_color: string | null
  font_family: string | null
  font_weight: string | null
  font_style: string | null
}

type LowerPanelRow = {
  id: number
  kind: "pdf" | "image" | null
  name: string | null
  path: string | null
  height_px: number | null
  updated_at: string | null
}

export default async function GeneralSessionPage(props: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const roomKey = "general"
  const sp = (await props.searchParams) || {}
  const presenter = String(sp.presenter || "") === "1"
  const key = typeof sp.key === "string" ? sp.key : Array.isArray(sp.key) ? sp.key[0] : ""

  // Theme (General Session only) — fetch early so all early-return branches can safely use it.
  const { data: themeDb } = await supabaseAdmin
    .from("general_session_theme")
    .select("*")
    .eq("id", 1)
    .maybeSingle<ThemeRow>()

  const theme: ThemeRow = themeDb || {
    id: 1,
    bg_color: "#020617",
    text_color: "#ffffff",
    font_family: null,
    font_weight: "normal",
    font_style: "normal",
  }

  const themeStyle: React.CSSProperties = {
    backgroundColor: theme.bg_color || "#020617",
    color: theme.text_color || "#ffffff",
    fontFamily: theme.font_family || undefined,
    fontWeight: (theme.font_weight || "normal") as any,
    fontStyle: (theme.font_style || "normal") as any,
  }

  const token = (await cookies()).get("admin_token")?.value
  const isAdmin = isAdminFromCookie(token)

  const { data, error } = await supabaseAdmin
    .from("general_session_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle<SettingsRow>()

  if (error) {
    return (
      <main className="min-h-screen p-6" style={themeStyle}>
        <ActivityTracker roomKey={roomKey} />
        <div className="mx-auto w-full max-w-screen-2xl">
          <h1 className="text-2xl font-bold">General Session</h1>
          <p className="mt-2 text-sm text-white/60">Could not load General Session settings.</p>
          <pre className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-white/70 overflow-auto">
            {error.message}
          </pre>
        </div>
      </main>
    )
  }

  const settings: SettingsRow = data || {
    id: 1,
    title: "General Session",
    source_type: "mp4",
    mp4_path: null,
    m3u8_url: null,
    rtmp_url: null,
    poster_url: null,
    is_published: false,
    presenter_key: null,
    updated_at: new Date().toISOString(),
  }

  const isPresenter = presenter && Boolean(key) && Boolean(settings.presenter_key) && key === settings.presenter_key

  // Unpublished behavior: admins + presenter can still view; attendees see message.
  if (!settings.is_published && !isAdmin && !isPresenter) {
    return (
      <main className="min-h-screen p-6" style={themeStyle}>
        <ActivityTracker roomKey={roomKey} />
        <div className="mx-auto w-full max-w-screen-2xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold">{settings.title || "General Session"}</h1>
              <p className="mt-1 text-sm text-white/60">This session is not published yet.</p>
            </div>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
              Attendee mode
            </span>
          </div>

          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/70">
            Please check back later.
          </div>
        </div>
      </main>
    )
  }

  // Control row (holding/live/paused/ended)
  const { data: ctrl } = await supabaseAdmin
    .from("general_session_control")
    .select("*")
    .eq("id", 1)
    .maybeSingle<ControlRow>()

  const control: ControlRow =
    ctrl ||
    ({
      id: 1,
      state: "holding",
      message: null,
      updated_at: new Date().toISOString(),
    } as any)

  // Under-player panel (PDF/Image)
  const { data: lowerDb } = await supabaseAdmin
    .from("general_session_lower_panel")
    .select("*")
    .eq("id", 1)
    .maybeSingle<LowerPanelRow>()

  const lowerPanel: LowerPanelRow | null = lowerDb || null

  // If MP4 is selected, generate a signed URL for playback from the private bucket
  let signedMp4Url: string | null = null
  if (settings.source_type === "mp4" && settings.mp4_path) {
    const { data: signed, error: signErr } = await supabaseAdmin.storage.from("private").createSignedUrl(
      settings.mp4_path,
      60 * 60
    )
    if (!signErr) signedMp4Url = signed?.signedUrl ?? null
  }

  // Program row (what attendees see) + signed assets
  const { data: pRow } = await supabaseAdmin
    .from("general_session_program")
    .select("*")
    .eq("id", 1)
    .maybeSingle<ProgramRow>()

  const programDb: ProgramRow =
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
      updated_at: new Date().toISOString(),
    } as any)

  let programSignedMp4Url: string | null = null
  if (programDb.program_mp4_path) {
    const { data: signed } = await supabaseAdmin.storage.from("private").createSignedUrl(
      programDb.program_mp4_path,
      60 * 60
    )
    programSignedMp4Url = signed?.signedUrl ?? null
  }

  let programSignedSlideUrl: string | null = null
  if (programDb.program_slide_path) {
    const { data: signed } = await supabaseAdmin.storage.from("private").createSignedUrl(
      programDb.program_slide_path,
      60 * 60
    )
    programSignedSlideUrl = signed?.signedUrl ?? null
  }

  // Signed URL for under-player panel
  let lowerPanelSignedUrl: string | null = null
  if (lowerPanel?.path) {
    const { data: lowerSigned } = await supabaseAdmin.storage.from("private").createSignedUrl(
      lowerPanel.path,
      60 * 60
    )
    lowerPanelSignedUrl = lowerSigned?.signedUrl || null
  }

  const materialsHeight = Math.max(240, Math.min(1400, Number(lowerPanel?.height_px ?? 520)))

  return (
    <main className="min-h-screen p-6" style={themeStyle}>
      <ActivityTracker roomKey={roomKey} />

      {/* ON AIR badge pinned to corner of screen */}
      <OnAirCorner roomKey={roomKey} initialState={control.state} />

      {/* Kick protection (host can remove a session_id) */}
      <GeneralSessionKickGuard roomKey={roomKey} />

      <div className="mx-auto w-full max-w-screen-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{settings.title || "General Session"}</h1>
            <p className="mt-1 text-sm text-white/60">Live stream + moderated Q&amp;A (single room).</p>
          </div>

          {isAdmin || isPresenter ? (
            <span className="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200">
              Host mode
            </span>
          ) : (
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
              Attendee mode
            </span>
          )}
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-12">
          {/* LEFT: PLAYER + FEATURED OVERLAY */}
          <section className="rounded-2xl border border-white/10 bg-white/5 p-4 lg:col-span-9">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Watch</h2>
            </div>

            <div className="relative mt-3">
              <StageViewSwitcher
                roomKey={roomKey}
                sourceType={settings.source_type}
                mp4Url={signedMp4Url}
                m3u8Url={settings.m3u8_url}
                rtmpUrl={settings.rtmp_url}
                posterUrl={settings.poster_url}
                mp4Path={settings.mp4_path}
                initialControl={control}
                initialProgram={{
                  program_kind: programDb.program_kind,
                  program_source_type: programDb.program_source_type,
                  program_mp4_url: programSignedMp4Url,
                  program_m3u8_url: programDb.program_m3u8_url,
                  program_rtmp_url: programDb.program_rtmp_url,
                  slide_url: programSignedSlideUrl,
                  lower_third: {
                    active: Boolean(programDb.lower_third_active),
                    name: programDb.lower_third_name,
                    title: programDb.lower_third_title,
                  },
                }}
              />

              {/* featured overlay (pinned question) */}
              <div className="pointer-events-none absolute inset-0">
                <FeaturedQuestionOverlay />
              </div>
            </div>
          </section>

          {/* RIGHT: Q&A */}
          <section className="rounded-2xl border border-white/10 bg-white/5 p-4 lg:col-span-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Q&amp;A</h2>
              {isAdmin || isPresenter ? (
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
                  Moderation enabled
                </span>
              ) : null}
            </div>

            <div className="mt-3">{isAdmin || isPresenter ? <GeneralSessionQAModeration /> : <GeneralSessionQA />}</div>
          </section>

          {/* BELOW: PDF/PNG Materials Panel */}
          <section className="rounded-2xl border border-white/10 bg-white/5 p-4 lg:col-span-12">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Materials</h2>
                <p className="mt-1 text-xs text-white/60">Optional PDF/PNG shown under the player (scrollable).</p>
              </div>
              {lowerPanel?.path ? (
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
                  {lowerPanel.kind === "pdf" ? "PDF" : "Image"}: {lowerPanel.name || "Untitled"}
                </span>
              ) : (
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
                  None uploaded
                </span>
              )}
            </div>

            <div className="mt-3 overflow-auto rounded-xl border border-white/10 bg-black/10" style={{ height: materialsHeight }}>
              {lowerPanelSignedUrl ? (
                lowerPanel?.kind === "image" ? (
                  <img src={lowerPanelSignedUrl} alt={lowerPanel.name || "Materials"} className="w-full h-auto" />
                ) : (
                  <iframe src={lowerPanelSignedUrl} className="h-full w-full" title={lowerPanel?.name || "Materials"} />
                )
              ) : (
                <div className="p-6 text-sm text-white/60">Upload a PDF or image in the admin control room.</div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"

export async function isAdminFromCookie() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return false

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role,is_active")
    .eq("id", user.id)
    .maybeSingle()

  return !!profile && profile.role === "admin" && profile.is_active !== false
}