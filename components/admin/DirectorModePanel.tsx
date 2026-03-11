"use client"

import { useMemo, useState } from "react"

type BreakoutOption = {
  id: string
  title: string
}

type LiveState = {
  event_id: string
  mode: "lobby" | "general" | "breakout" | "networking" | "ondemand"
  breakout_id: string | null
  force_redirect: boolean
  updated_at: string | null
}

export default function DirectorModePanel({
  eventId,
  eventSlug,
  initialState,
  breakouts,
}: {
  eventId: string
  eventSlug: string
  initialState: LiveState
  breakouts: BreakoutOption[]
}) {
  const [mode, setMode] = useState<LiveState["mode"]>(initialState.mode)
  const [breakoutId, setBreakoutId] = useState<string>(initialState.breakout_id || breakouts[0]?.id || "")
  const [forceRedirect, setForceRedirect] = useState<boolean>(!!initialState.force_redirect)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string>("")

  const destinationLabel = useMemo(() => {
    if (mode === "lobby") return `/events/${eventSlug}/lobby`
    if (mode === "general") return `/events/${eventSlug}`
    if (mode === "networking") return `/events/${eventSlug}/networking`
    if (mode === "ondemand") return `/events/${eventSlug}/on-demand`
    if (mode === "breakout") {
      const selected = breakouts.find((b) => b.id === breakoutId)
      return selected ? `/events/${eventSlug}/breakouts (live: ${selected.title})` : `/events/${eventSlug}/breakouts`
    }
    return "/"
  }, [mode, breakoutId, breakouts, eventSlug])

  async function save(nextMode: LiveState["mode"], nextBreakoutId?: string) {
    setSaving(true)
    setMessage("")

    try {
      const res = await fetch(`/api/admin/events/${eventId}/live-state`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: nextMode,
          breakout_id: nextMode === "breakout" ? (nextBreakoutId || breakoutId || null) : null,
          force_redirect: forceRedirect,
        }),
      })

      const json = await res.json().catch((): null => null)

      if (!res.ok) {
        setMessage(json?.error || "Unable to update live state.")
        return
      }

      setMode(nextMode)
      if (nextMode === "breakout" && nextBreakoutId) setBreakoutId(nextBreakoutId)
      setMessage("Director Mode updated.")
    } catch {
      setMessage("Unable to update live state.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-white/45">Director Mode</div>
          <h2 className="mt-2 text-2xl font-semibold">Live attendee routing</h2>
          <p className="mt-2 max-w-2xl text-sm text-white/60">
            Choose where attendees should go right now. Turn on force redirect to move everyone immediately.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm">
          <div>
            Current mode: <span className="font-semibold text-emerald-200">{mode}</span>
          </div>
          <div className="mt-1 break-all text-white/60">
            Destination: <span className="text-white">{destinationLabel}</span>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <button
              onClick={() => save("lobby")}
              disabled={saving}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-left hover:bg-white/10 disabled:opacity-50"
            >
              <div className="font-semibold">Lobby</div>
              <div className="mt-1 text-sm text-white/55">Send everyone to event lobby.</div>
            </button>

            <button
              onClick={() => save("general")}
              disabled={saving}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-left hover:bg-white/10 disabled:opacity-50"
            >
              <div className="font-semibold">General Session</div>
              <div className="mt-1 text-sm text-white/55">Push attendees to the main event page.</div>
            </button>

            <button
              onClick={() => save("networking")}
              disabled={saving}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-left hover:bg-white/10 disabled:opacity-50"
            >
              <div className="font-semibold">Networking</div>
              <div className="mt-1 text-sm text-white/55">Move attendees to networking.</div>
            </button>

            <button
              onClick={() => save("ondemand")}
              disabled={saving}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-left hover:bg-white/10 disabled:opacity-50"
            >
              <div className="font-semibold">On-Demand</div>
              <div className="mt-1 text-sm text-white/55">Route attendees to replays.</div>
            </button>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="font-semibold">Breakout routing</div>
            <div className="mt-1 text-sm text-white/55">
              Choose a breakout room, then send all attendees there.
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <select
                value={breakoutId}
                onChange={(e) => setBreakoutId(e.target.value)}
                className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm"
              >
                {breakouts.length === 0 ? (
                  <option value="">No breakouts found</option>
                ) : (
                  breakouts.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title}
                    </option>
                  ))
                )}
              </select>

              <button
                onClick={() => save("breakout", breakoutId)}
                disabled={saving || !breakoutId}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold hover:bg-blue-500 disabled:opacity-50"
              >
                Send to breakout
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={forceRedirect}
                onChange={(e) => setForceRedirect(e.target.checked)}
                className="mt-1"
              />
              <div>
                <div className="font-semibold">Force Redirect</div>
                <div className="mt-1 text-sm text-white/55">
                  When enabled, attendees are moved immediately instead of only seeing the updated live destination.
                </div>
              </div>
            </label>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="font-semibold">Operator notes</div>
            <ul className="mt-3 space-y-2 text-sm text-white/60">
              <li>Use Lobby between sessions.</li>
              <li>Use General Session for keynote or main feed.</li>
              <li>Use Breakout when smaller rooms go live.</li>
              <li>Use Networking for intermission.</li>
              <li>Use On-Demand for replay mode.</li>
            </ul>
          </div>

          {message ? (
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
              {message}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}