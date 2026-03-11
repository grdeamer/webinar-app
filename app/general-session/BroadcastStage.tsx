"use client"

import React from "react"
import { createClient } from "@supabase/supabase-js"
import GeneralSessionPlayer from "./player"

type ControlRow = {
  id: number
  state: "holding" | "live" | "paused" | "ended"
  message: string | null
  updated_at: string | null
}

type Props = {
  roomKey?: string
  sourceType: "mp4" | "m3u8" | "rtmp"
  mp4Url: string | null
  m3u8Url: string | null
  rtmpUrl: string | null
  posterUrl: string | null
  mp4Path?: string | null
  initialControl: ControlRow
  initialProgram?: {
    program_kind: "video" | "slides"
    program_source_type: "mp4" | "m3u8" | "rtmp" | null
    program_mp4_url: string | null
    program_m3u8_url: string | null
    program_rtmp_url: string | null
    slide_url: string | null
    lower_third: { active: boolean; name: string | null; title: string | null } | null
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function BroadcastStage({
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
  const [control, setControl] = React.useState<ControlRow>(initialControl)
  const [program, setProgram] = React.useState(
    initialProgram || {
      program_kind: "video" as const,
      program_source_type: null as any,
      program_mp4_url: null as string | null,
      program_m3u8_url: null as string | null,
      program_rtmp_url: null as string | null,
      slide_url: null as string | null,
      lower_third: null as any,
    }
  )

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

    // initial refresh (in case server-render stale)
    refresh()

    const ch = supabase
      .channel(`gs-control-${roomKey}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "general_session_control" },
        () => refresh()
      )
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
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "general_session_program" },
        () => refresh()
      )
      .subscribe()

    return () => {
      mounted = false
      supabase.removeChannel(ch)
    }
  }, [roomKey])

  return (
    <GeneralSessionPlayer
      sourceType={program.program_kind === "video" ? (program.program_source_type || sourceType) : sourceType}
      mp4Url={program.program_kind === "video" ? (program.program_mp4_url || mp4Url) : mp4Url}
      m3u8Url={program.program_kind === "video" ? (program.program_m3u8_url || m3u8Url) : m3u8Url}
      rtmpUrl={program.program_kind === "video" ? (program.program_rtmp_url || rtmpUrl) : rtmpUrl}
      posterUrl={posterUrl}
      mp4Path={mp4Path}
      programKind={program.program_kind}
      slideUrl={program.slide_url}
      lowerThird={program.lower_third}
      gateState={control?.state || "holding"}
      gateMessage={control?.message || null}
    />
  )
}
