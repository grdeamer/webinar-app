import type { CSSProperties } from "react"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

import ActivityTracker from "@/components/ActivityTracker"
import FeaturedQuestionOverlay from "@/components/FeaturedQuestionOverlay"
import GeneralSessionKickGuard from "@/components/GeneralSessionKickGuard"
import GeneralSessionQA from "@/components/GeneralSessionQA"
import GeneralSessionQAModeration from "@/components/GeneralSessionQAModeration"
import PresenterQAPanel from "@/components/PresenterQAPanel"
import SpeakerConfidenceMonitor from "@/components/SpeakerConfidenceMonitor"
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
  client_logo_path: string | null
  client_logo_position: "left" | "center" | "right" | null
  updated_at: string | null
}

type ThemeRow = {
  id: number
  bg_color: string | null
  text_color: string | null
  font_family: string | null
  font_weight: string | null
  font_style: string | null
  panel_bg_color: string | null
  panel_text_color: string | null
  panel_font_family: string | null
  header_bg_color: string | null
  header_text_color: string | null
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
  const key =
    typeof sp.key === "string"
      ? sp.key
      : Array.isArray(sp.key)
        ? sp.key[0]
        : ""

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let isAdmin = false
  if (user?.id) {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role,is_active")
      .eq("id", user.id)
      .maybeSingle()

    isAdmin = !!profile && profile.role === "admin" && profile.is_active !== false
  }

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
  panel_bg_color: null,
  panel_text_color: null,
  panel_font_family: null,
  header_bg_color: null,
  header_text_color: null,
}

  const themeStyle: CSSProperties = {
    backgroundColor: theme.bg_color || "#020617",
    color: theme.text_color || "#ffffff",
    fontFamily: theme.font_family || undefined,
    fontWeight: (theme.font_weight || "normal") as any,
    fontStyle: (theme.font_style || "normal") as any,
  }

const panelStyle: CSSProperties = {
  backgroundColor: theme.panel_bg_color || "rgba(255,255,255,0.06)",
  color: theme.panel_text_color || theme.text_color || "#ffffff",
  fontFamily: theme.panel_font_family || theme.font_family || undefined,
}

const headerBandStyle: CSSProperties = {
  backgroundColor: theme.header_bg_color || "#ffffff",
  color: theme.header_text_color || "#111111",
}

  const { data, error } = await supabaseAdmin
    .from("general_session_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle<SettingsRow>()

  if (error) {
    return (
      <main className="min-h-screen p-4 md:p-6" style={themeStyle}>
        <ActivityTracker roomKey={roomKey} />
        <div className="mx-auto w-full max-w-screen-2xl">
          <h1 className="text-2xl font-bold">General Session</h1>
          <p className="mt-2 text-sm text-white/60">
            Could not load General Session settings.
          </p>
          <pre className="mt-4 overflow-auto rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-white/70">
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

  const isPresenter =
    presenter &&
    Boolean(key) &&
    Boolean(settings.presenter_key) &&
    key === settings.presenter_key

  if (!settings.is_published && !isAdmin && !isPresenter) {
    return (
      <main className="min-h-screen p-4 md:p-6" style={themeStyle}>
        <ActivityTracker roomKey={roomKey} />
        <div className="mx-auto w-full max-w-screen-2xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold">
                {settings.title || "General Session"}
              </h1>
              <p className="mt-1 text-sm text-white/60">
                This session is not published yet.
              </p>
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
    } as ControlRow)

  const { data: lowerDb } = await supabaseAdmin
    .from("general_session_lower_panel")
    .select("*")
    .eq("id", 1)
    .maybeSingle<LowerPanelRow>()

  const lowerPanel: LowerPanelRow | null = lowerDb || null

  let signedMp4Url: string | null = null
  if (settings.source_type === "mp4" && settings.mp4_path) {
    const { data: signed, error: signErr } = await supabaseAdmin.storage
      .from("private")
      .createSignedUrl(settings.mp4_path, 60 * 60)
    if (!signErr) signedMp4Url = signed?.signedUrl ?? null
  }

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
      client_logo_path: null,
      client_logo_position: "left",
      updated_at: new Date().toISOString(),
    } as ProgramRow)

  let programSignedMp4Url: string | null = null
  if (programDb.program_mp4_path) {
    const { data: signed } = await supabaseAdmin.storage
      .from("private")
      .createSignedUrl(programDb.program_mp4_path, 60 * 60)
    programSignedMp4Url = signed?.signedUrl ?? null
  }

  let programSignedSlideUrl: string | null = null
  if (programDb.program_slide_path) {
    const { data: signed } = await supabaseAdmin.storage
      .from("private")
      .createSignedUrl(programDb.program_slide_path, 60 * 60)
    programSignedSlideUrl = signed?.signedUrl ?? null
  }

  let clientLogoSignedUrl: string | null = null
  if (programDb.client_logo_path) {
    const { data: signed } = await supabaseAdmin.storage
      .from("private")
      .createSignedUrl(programDb.client_logo_path, 60 * 60)
    clientLogoSignedUrl = signed?.signedUrl ?? null
  }

  let lowerPanelSignedUrl: string | null = null
  if (lowerPanel?.path) {
    const { data: lowerSigned } = await supabaseAdmin.storage
      .from("private")
      .createSignedUrl(lowerPanel.path, 60 * 60)
    lowerPanelSignedUrl = lowerSigned?.signedUrl || null
  }

  const materialsHeight = Math.max(
    240,
    Math.min(1400, Number(lowerPanel?.height_px ?? 520))
  )

  const logoJustify =
    programDb.client_logo_position === "center"
      ? "justify-center"
      : programDb.client_logo_position === "right"
        ? "justify-end"
        : "justify-start"

  return (
    <main className="min-h-screen p-4 md:p-6" style={themeStyle}>
      <ActivityTracker roomKey={roomKey} />

      <OnAirCorner roomKey={roomKey} initialState={control.state} />
      <GeneralSessionKickGuard roomKey={roomKey} />

      <div className="mx-auto w-full max-w-screen-2xl">
        <div
          className="overflow-hidden rounded-3xl border border-white/10 shadow-[0_24px_70px_rgba(0,0,0,0.30)] ring-1 ring-white/5 backdrop-blur-[2px]"
          style={panelStyle}
        >
          <div
            className="border-b border-black/10 px-5 py-4 md:px-8 md:py-5"
            style={headerBandStyle}
          >
            <div className={`flex min-h-[64px] w-full items-center ${logoJustify}`}>
              {clientLogoSignedUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={clientLogoSignedUrl}
                  alt="Client logo"
                  className="max-h-16 w-auto max-w-full object-contain"
                />
              ) : (
                <div className="text-sm text-slate-400">
                  {isAdmin || isPresenter ? "No client logo selected" : ""}
                </div>
              )}
            </div>
          </div>

          <div className="border-b border-white/10 bg-black/10 px-5 py-4 md:px-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  {settings.title || "General Session"}
                </h1>
                <p className="mt-1 text-sm text-white/60">
                  Live stream + moderated Q&amp;A (single room).
                </p>
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
          </div>

          <div className="p-5 md:p-8">
            <div className="grid gap-4 xl:grid-cols-12">
              <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] xl:col-span-9">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Watch</h2>
                </div>

                <div className="relative mt-3 overflow-hidden rounded-2xl border border-white/10 bg-black/20 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
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

                  <div className="pointer-events-none absolute inset-0">
                    <FeaturedQuestionOverlay roomKey={roomKey} />
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] xl:col-span-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Q&amp;A</h2>
                  {isAdmin || isPresenter ? (
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
                      Moderation enabled
                    </span>
                  ) : null}
                </div>

                <div className="mt-3">
                  {isAdmin || isPresenter ? (
                    <GeneralSessionQAModeration />
                  ) : (
                    <GeneralSessionQA />
                  )}
                </div>
              </section>

              {isPresenter && (
                <section className="rounded-2xl border border-yellow-400/30 bg-yellow-400/10 p-4 xl:col-span-12">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold">Presenter Monitor</h2>
                      <p className="mt-1 text-sm text-white/70">
                        Private Q&amp;A confidence monitor for the presenter.
                      </p>
                    </div>
                    <span className="rounded-full border border-yellow-300/30 bg-black/20 px-3 py-1 text-xs text-yellow-100">
                      Presenter only
                    </span>
                  </div>

                  <div className="mt-4">
                    <SpeakerConfidenceMonitor
                      roomKey={roomKey}
                      sessionTitle={settings.title || "General Session"}
                      controlState={control.state}
                      lowerThirdActive={Boolean(programDb.lower_third_active)}
                      lowerThirdName={programDb.lower_third_name}
                      lowerThirdTitle={programDb.lower_third_title}
                    />
                  </div>

                  <div className="mt-4">
                    <PresenterQAPanel roomKey={roomKey} />
                  </div>
                </section>
              )}

              <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] xl:col-span-12">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">Materials</h2>
                    <p className="mt-1 text-xs text-white/60">
                      Optional PDF/PNG shown under the player.
                    </p>
                  </div>

                  {lowerPanel?.path ? (
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
                      {lowerPanel.kind === "pdf" ? "PDF" : "Image"}:{" "}
                      {lowerPanel.name || "Untitled"}
                    </span>
                  ) : (
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
                      None uploaded
                    </span>
                  )}
                </div>

                <div
                  className="mt-3 overflow-auto rounded-2xl border border-white/10 bg-black/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
                  style={{ height: materialsHeight }}
                >
                  {lowerPanelSignedUrl ? (
                    lowerPanel?.kind === "image" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={lowerPanelSignedUrl}
                        alt={lowerPanel.name || "Materials"}
                        className="h-auto w-full"
                      />
                    ) : (
                      <iframe
                        src={lowerPanelSignedUrl}
                        className="h-full w-full bg-white"
                        title={lowerPanel?.name || "Materials"}
                      />
                    )
                  ) : (
                    <div className="p-6 text-sm text-white/60">
                      Upload a PDF or image in the admin control room.
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}