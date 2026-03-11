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

export default function GeneralSessionKickGuard({ roomKey = "general" }: { roomKey?: string }) {
  const [kicked, setKicked] = React.useState(false)
  const [reason, setReason] = React.useState<string>("")

  React.useEffect(() => {
    let mounted = true
    const sessionId = getSessionId()

    async function check() {
      try {
        const res = await fetch(
          `/api/general-session/kick-status?room_key=${encodeURIComponent(roomKey)}&session_id=${encodeURIComponent(
            sessionId
          )}`,
          { cache: "no-store" }
        )
        const json = await res.json().catch(() => ({}))
        if (!res.ok) return
        if (json?.kicked) {
          if (mounted) {
            setKicked(true)
            setReason(json?.info?.reason || "You were removed by the host.")
          }
        }
      } catch {
        // ignore
      }
    }

    // initial + poll
    check()
    const poll = setInterval(check, 5_000)

    // realtime: kicks
    const ch = supabase
      .channel(`gs-kicks-${roomKey}-${sessionId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "general_session_kicks", filter: `room_key=eq.${roomKey}` },
        (payload: any) => {
          const row = payload?.new
          if (row?.session_id === sessionId) {
            setKicked(true)
            setReason(row?.reason || "You were removed by the host.")
          }
        }
      )
      .subscribe()

    return () => {
      mounted = false
      clearInterval(poll)
      supabase.removeChannel(ch)
    }
  }, [roomKey])

  if (!kicked) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-6">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
        <div className="text-2xl font-bold">Removed from session</div>
        <p className="mt-3 text-white/70">{reason}</p>
        <p className="mt-3 text-sm text-white/50">If you believe this was a mistake, contact the event organizer.</p>
        <button
          className="mt-5 rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
          onClick={() => (window.location.href = "/")}
        >
          Return home
        </button>
      </div>
    </div>
  )
}
