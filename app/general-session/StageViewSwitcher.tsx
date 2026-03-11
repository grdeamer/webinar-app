"use client"

import React from "react"
import { createClient } from "@supabase/supabase-js"
import GeneralSessionPlayer from "./player"

type Mode = "video" | "slides" | "side"

type ControlRow = {
  id: number
  state: "holding" | "live" | "paused" | "ended"
  message: string | null
  updated_at: string | null
}

type Program = {
  program_kind: "video" | "slides"
  program_source_type: "mp4" | "m3u8" | "rtmp" | null
  program_mp4_url: string | null
  program_m3u8_url: string | null
  program_rtmp_url: string | null
  slide_url: string | null
  lower_third: { active: boolean; name: string | null; title: string | null } | null
}

type Props = {
  roomKey?: string
  // fallback settings source
  sourceType: "mp4" | "m3u8" | "rtmp"
  mp4Url: string | null
  m3u8Url: string | null
  rtmpUrl: string | null
  posterUrl: string | null
  mp4Path?: string | null
  initialControl: ControlRow
  initialProgram: Program
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function StageViewSwitcher({
  roomKey = "general",
  sourceType,
  mp4Url,
  m3u8Url,
  rtmpUrl,
  posterUrl,
  mp4Path,
  initialControl,
  initialProgram,
}: Props) {
  const [mode, setMode] = React.useState<Mode>("video")
  const [control, setControl] = React.useState<ControlRow>(initialControl)
  const [program, setProgram] = React.useState<Program>(initialProgram)

  React.useEffect(() => {
    let mounted = true
    async function refresh() {
      try {
        const res = await fetch("/api/admin/general-session/control", { cache: "no-store" })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) return
        if (mounted && json?.control) setControl(json.control)
      } catch {
        // ignore
      }
    }
    refresh()
    const ch = supabase
      .channel(`gs-control-${roomKey}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "general_session_control" }, () => refresh())
      .subscribe()
    return () => {
      mounted = false
      supabase.removeChannel(ch)
    }
  }, [roomKey])

  React.useEffect(() => {
    let mounted = true
    async function refresh() {
      try {
        const res = await fetch("/api/general-session/program", { cache: "no-store" })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) return
        if (mounted && json?.program) setProgram(json.program)
      } catch {
        // ignore
      }
    }
    refresh()
    const ch = supabase
      .channel(`gs-program-${roomKey}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "general_session_program" }, () => refresh())
      .subscribe()
    return () => {
      mounted = false
      supabase.removeChannel(ch)
    }
  }, [roomKey])

  // Derive current video inputs: if program is video use program values, else fall back to settings.
  const effectiveSourceType = program.program_source_type || sourceType
  const effectiveMp4Url = program.program_mp4_url || mp4Url
  const effectiveM3u8Url = program.program_m3u8_url || m3u8Url
  const effectiveRtmpUrl = program.program_rtmp_url || rtmpUrl

  const slideUrl = program.slide_url || null
  const hasSlides = Boolean(slideUrl)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs text-white/50">
          View:
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMode("video")}
            className={`rounded-xl border px-3 py-1.5 text-xs ${mode === "video" ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100" : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"}`}
          >
            Video dominant
          </button>
          <button
            onClick={() => setMode("slides")}
            disabled={!hasSlides}
            className={`rounded-xl border px-3 py-1.5 text-xs ${mode === "slides" ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100" : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"} ${!hasSlides ? "opacity-40 cursor-not-allowed" : ""}`}
          >
            Slides dominant
          </button>
          <button
            onClick={() => setMode("side")}
            disabled={!hasSlides}
            className={`rounded-xl border px-3 py-1.5 text-xs ${mode === "side" ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100" : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"} ${!hasSlides ? "opacity-40 cursor-not-allowed" : ""}`}
          >
            Side-by-side
          </button>
        </div>
      </div>

      {mode === "side" && hasSlides ? (
        <div className="grid gap-3 lg:grid-cols-2">
          <GeneralSessionPlayer
            sourceType={effectiveSourceType as any}
            mp4Url={effectiveMp4Url}
            m3u8Url={effectiveM3u8Url}
            rtmpUrl={effectiveRtmpUrl}
            posterUrl={posterUrl}
            mp4Path={mp4Path}
            programKind="video"
            slideUrl={null}
            lowerThird={program.lower_third}
            gateState={control?.state || "holding"}
            gateMessage={control?.message || null}
          />

          <div className="w-full overflow-hidden rounded-xl border border-white/10 bg-black">
            <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
              <iframe src={slideUrl!} className="absolute inset-0 h-full w-full" title="Slides" />
            </div>
          </div>
        </div>
      ) : mode === "slides" && hasSlides ? (
        <div className="w-full overflow-hidden rounded-xl border border-white/10 bg-black">
          <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
            <iframe src={slideUrl!} className="absolute inset-0 h-full w-full" title="Slides" />
          </div>
        </div>
      ) : (
        <GeneralSessionPlayer
          sourceType={effectiveSourceType as any}
          mp4Url={effectiveMp4Url}
          m3u8Url={effectiveM3u8Url}
          rtmpUrl={effectiveRtmpUrl}
          posterUrl={posterUrl}
          mp4Path={mp4Path}
          programKind={program.program_kind}
          slideUrl={slideUrl}
          lowerThird={program.lower_third}
          gateState={control?.state || "holding"}
          gateMessage={control?.message || null}
        />
      )}

      {!hasSlides ? (
        <div className="text-[11px] text-white/45">No slides are currently set. Upload slides in the admin control room to enable Slides/Split view.</div>
      ) : null}
    </div>
  )
}
