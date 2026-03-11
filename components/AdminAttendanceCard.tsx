"use client"

import * as React from "react"
import { createClient } from "@supabase/supabase-js"

type Summary = { preregistered: number; active: number }

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function AdminAttendanceCard() {
  const [data, setData] = React.useState<Summary | null>(null)
  const [err, setErr] = React.useState<string | null>(null)

  async function load() {
    try {
      setErr(null)
      const res = await fetch("/api/admin/attendance/summary", { cache: "no-store" })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || "Failed to load attendance")
      setData({ preregistered: json.preregistered || 0, active: json.active || 0 })
    } catch (e: any) {
      setErr(e?.message || "Failed to load attendance")
    }
  }

  React.useEffect(() => {
    let cancelled = false
    let unsub: (() => void) | null = null

    ;(async () => {
      await load()

      // Realtime subscribe to attendee_sessions changes; refresh on any change
      const chan = supabase
        .channel("admin_attendee_sessions")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "attendee_sessions" },
          () => {
            if (!cancelled) load()
          }
        )
        .subscribe()

      unsub = () => {
        supabase.removeChannel(chan)
      }
    })()

    return () => {
      cancelled = true
      try {
        unsub?.()
      } catch {}
    }
  }, [])

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
      <h2 className="text-xl font-semibold mb-2">Attendance</h2>
      <p className="text-white/70 mb-4">
        Realtime count of active attendees vs preregistered.
      </p>

      {err ? <div className="text-sm text-red-300 mb-3">{err}</div> : null}

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-white/10 bg-black/20 p-4">
          <div className="text-xs text-white/60">Active now</div>
          <div className="text-3xl font-bold mt-1">{data ? data.active : "—"}</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/20 p-4">
          <div className="text-xs text-white/60">Pre-registered</div>
          <div className="text-3xl font-bold mt-1">{data ? data.preregistered : "—"}</div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 transition px-4 py-2"
        >
          Preview attendee experience
        </a>
      </div>

      <div className="mt-3 text-xs text-white/50">
        Tip: enable Realtime for <span className="font-mono">attendee_sessions</span> in Supabase Publications.
      </div>
    </div>
  )
}
