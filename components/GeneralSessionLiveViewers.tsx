"use client"

import React from "react"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function getSessionId() {
  const key = "gs_session_id"
  let v = typeof window !== "undefined" ? localStorage.getItem(key) : null
  if (!v) {
    v = crypto.randomUUID()
    localStorage.setItem(key, v)
  }
  return v
}

export default function GeneralSessionLiveViewers({ roomKey = "general" }: { roomKey?: string }) {
  const [live, setLive] = React.useState<number>(0)
  const [status, setStatus] = React.useState<string>("")

  React.useEffect(() => {
    let mounted = true
    const sessionId = getSessionId()

    async function heartbeat() {
      try {
        await fetch("/api/general-session/presence/heartbeat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            room_key: roomKey,
            session_id: sessionId,
          }),
        })
      } catch {
        // ignore
      }
    }

    async function refresh() {
      try {
        const res = await fetch(`/api/general-session/presence/live?room_key=${encodeURIComponent(roomKey)}`)
        const json = await res.json()
        if (!res.ok) throw new Error(json?.error || "Failed to load live count")
        if (mounted) setLive(json.live ?? 0)
      } catch (e: any) {
        if (mounted) setStatus(e?.message || "Live count error")
      }
    }

    // initial
    refresh()
    heartbeat()

    // heartbeat every 15s, refresh every 10s (cheap + reliable)
    const hb = setInterval(heartbeat, 15_000)
    const poll = setInterval(refresh, 10_000)

    // realtime subscription: any change triggers refresh
    const channel = supabase
      .channel(`gs-presence-${roomKey}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "general_session_presence", filter: `room_key=eq.${roomKey}` },
        () => {
          refresh()
        }
      )
      .subscribe()

    return () => {
      mounted = false
      clearInterval(hb)
      clearInterval(poll)
      supabase.removeChannel(channel)
    }
  }, [roomKey])

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
      <div className="text-xs text-white/50">Live viewers</div>
      <div className="mt-1 flex items-baseline gap-2">
        <div className="text-2xl font-bold">{live}</div>
        <div className="text-xs text-white/50">watching now</div>
      </div>
      {status ? <div className="mt-1 text-xs text-rose-200">{status}</div> : null}
    </div>
  )
}