"use client"

import React from "react"
import { createClient } from "@supabase/supabase-js"

type ControlRow = {
  id: boolean
  state: "holding" | "live" | "paused" | "ended"
  message: string | null
  updated_at: string | null
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function OnAirCorner(props: { roomKey?: string; initialState?: ControlRow["state"] }) {
  const roomKey = props.roomKey ?? "general"
  const [state, setState] = React.useState<ControlRow["state"]>(props.initialState ?? "holding")

  React.useEffect(() => {
    let mounted = true

    async function refresh() {
      try {
        const res = await fetch("/api/admin/general-session/control", { cache: "no-store" })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) return
        if (mounted && json?.control?.state) setState(json.control.state)
      } catch {
        // ignore
      }
    }

    refresh()

    const ch = supabase
      .channel(`gs-control-corner-${roomKey}`)
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

  if (state !== "live") return null

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50">
      <div className="inline-flex items-center gap-2 rounded-full border border-red-500/40 bg-red-600/90 px-3 py-1 text-xs font-bold tracking-wide text-white shadow">
        <span className="inline-block h-2 w-2 rounded-full bg-white" />
        ON AIR
      </div>
    </div>
  )
}
