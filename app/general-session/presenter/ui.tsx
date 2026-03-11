"use client"

import React from "react"

type GateState = "holding" | "live" | "paused" | "ended"

type ControlRow = {
  id: number
  state: GateState
  message: string | null
  updated_at: string | null
}

export default function PresenterControlRoom(props: {
  title: string
  presenterKey: string
  canBypassPublish: boolean
}) {
  const roomKey = "general"
  const [control, setControl] = React.useState<ControlRow>({
    id: 1,
    state: "holding",
    message: null,
    updated_at: null,
  })

  const attendeeUrl = "/general-session"
  const previewUrl = `/general-session?presenter=1&key=${encodeURIComponent(props.presenterKey || "")}`

  async function refresh() {
    try {
      const res = await fetch("/api/admin/general-session/control", { cache: "no-store" })
      const json = await res.json().catch(() => ({}))
      if (res.ok && json?.control) setControl(json.control)
    } catch {
      // ignore
    }
  }

  React.useEffect(() => {
    refresh()
    const t = setInterval(refresh, 5000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const isLive = control.state === "live"

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6">
      <div className="mx-auto w-full max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Presenter View</h1>
            <p className="mt-1 text-sm text-white/60">
              Read-only presenter monitor. Broadcast switching, slides, and lower-thirds are admin-only.
            </p>
          </div>

          <span className={
            isLive
              ? "rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-200"
              : "rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60"
          }>
            {isLive ? "ON AIR" : control.state === "holding" ? "Starting soon" : control.state}
          </span>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <h2 className="text-lg font-semibold">Links</h2>
            <div className="mt-3 space-y-2 text-sm">
              <div>
                <span className="text-white/60">Attendee:</span>{" "}
                <a className="underline" href={attendeeUrl} target="_blank" rel="noreferrer">
                  {attendeeUrl}
                </a>
              </div>
              <div>
                <span className="text-white/60">Presenter preview:</span>{" "}
                <a className="underline" href={previewUrl} target="_blank" rel="noreferrer">
                  {previewUrl}
                </a>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <h2 className="text-lg font-semibold">Broadcast status</h2>
            <div className="mt-3 rounded-xl border border-white/10 bg-black/30 p-4">
              <div className="text-sm">
                <span className="text-white/60">State:</span>{" "}
                <span className="font-semibold">{control.state}</span>
              </div>
              {control.message ? (
                <div className="mt-2 text-sm text-white/70">
                  <span className="text-white/60">Message:</span> {control.message}
                </div>
              ) : null}
            </div>
          </section>
        </div>

        <div className="mt-6 rounded-2xl border border-amber-400/25 bg-amber-500/10 p-4 text-sm text-amber-100">
          Admin-only features live in <span className="font-semibold">/admin/general-session</span>.
        </div>
      </div>
    </main>
  )
}
