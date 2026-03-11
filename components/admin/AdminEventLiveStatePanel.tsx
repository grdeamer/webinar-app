"use client"

import { useMemo, useState } from "react"
import type { EventBreakout, EventLiveMode, EventLiveStateRecord } from "@/lib/types"

type Props = {
  eventId: string
  eventSlug: string
  breakouts: EventBreakout[]
  initialLiveState: EventLiveStateRecord | null
}

type SaveState = "idle" | "saving" | "saved" | "error"

const MODES: Array<{ value: EventLiveMode; label: string; helper: string }> = [
  { value: "lobby", label: "Lobby", helper: "Keep attendees in the lobby." },
  { value: "general_session", label: "General Session", helper: "Point everyone to the main stage player." },
  { value: "breakout", label: "Breakout", helper: "Send attendees to a specific breakout room." },
  { value: "replay", label: "Replay", helper: "Route attendees into the on-demand library." },
  { value: "off_air", label: "Off Air", helper: "Keep the event on hold or between segments." },
]

function destinationPreview(mode: EventLiveMode, slug: string, breakoutId: string, breakouts: EventBreakout[]) {
  if (mode === "general_session") return "/general-session"
  if (mode === "replay") return `/events/${slug}/library`
  if (mode === "breakout") {
    const breakout = breakouts.find((item) => item.id === breakoutId)
    return breakout?.join_link || `/events/${slug}/breakouts`
  }
  if (mode === "off_air") return `/events/${slug}`
  return `/events/${slug}/lobby`
}

export default function AdminEventLiveStatePanel({
  eventId,
  eventSlug,
  breakouts,
  initialLiveState,
}: Props) {
  const [mode, setMode] = useState<EventLiveMode>(initialLiveState?.mode || "lobby")
  const [activeBreakoutId, setActiveBreakoutId] = useState(initialLiveState?.active_breakout_id || "")
  const [headline, setHeadline] = useState(initialLiveState?.headline || "")
  const [message, setMessage] = useState(initialLiveState?.message || "")
  const [forceRedirect, setForceRedirect] = useState(!!initialLiveState?.force_redirect)
  const [status, setStatus] = useState<SaveState>("idle")
  const [error, setError] = useState<string | null>(null)
  const [updatedAt, setUpdatedAt] = useState(initialLiveState?.updated_at || null)

  const previewHref = useMemo(
    () => destinationPreview(mode, eventSlug, activeBreakoutId, breakouts),
    [mode, eventSlug, activeBreakoutId, breakouts]
  )

  async function save() {
    setStatus("saving")
    setError(null)

    try {
      const res = await fetch(`/api/admin/events/${eventId}/live-state`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          active_breakout_id: mode === "breakout" ? activeBreakoutId || null : null,
          headline,
          message,
          force_redirect: forceRedirect,
        }),
      })

      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || "Failed to save live state")

      setUpdatedAt(json?.liveState?.updated_at || new Date().toISOString())
      setStatus("saved")
      window.dispatchEvent(new CustomEvent("admin-live-state-updated"))
      window.setTimeout(() => setStatus("idle"), 1600)
    } catch (err) {
      setStatus("error")
      setError(err instanceof Error ? err.message : "Failed to save live state")
    }
  }

  return (
    <section className="rounded-2xl border border-emerald-400/20 bg-emerald-500/5 p-6 shadow-xl shadow-black/20">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-200/80">
            Event live control
          </div>
          <h2 className="mt-2 text-2xl font-semibold text-white">Live State Controller</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/65">
            Choose the primary attendee destination for this event. This becomes the single source of truth for where people should go right now.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white/65">
          <div className="font-medium text-white">Preview destination</div>
          <div className="mt-1 break-all text-emerald-200">{previewHref}</div>
          {updatedAt ? <div className="mt-2 text-xs text-white/45">Last saved {new Date(updatedAt).toLocaleString()}</div> : null}
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-5">
        {MODES.map((item) => {
          const active = mode === item.value
          return (
            <button
              key={item.value}
              type="button"
              onClick={() => setMode(item.value)}
              className={`rounded-2xl border px-4 py-4 text-left transition ${
                active
                  ? "border-emerald-300/60 bg-emerald-400/20 text-white"
                  : "border-white/10 bg-white/5 text-white/75 hover:bg-white/10"
              }`}
            >
              <div className="font-semibold">{item.label}</div>
              <div className="mt-1 text-xs leading-5 text-inherit/80">{item.helper}</div>
            </button>
          )
        })}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          {mode === "breakout" ? (
            <div>
              <div className="text-sm text-white/70">Active breakout</div>
              <select
                value={activeBreakoutId}
                onChange={(e) => setActiveBreakoutId(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-white"
              >
                <option value="">Select a breakout…</option>
                {breakouts.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
              <div className="mt-2 text-xs text-white/45">
                If a breakout has a join link, attendees will be sent there. Otherwise they will land on the event breakouts page.
              </div>
            </div>
          ) : null}

          <div>
            <div className="text-sm text-white/70">Headline</div>
            <input
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-white"
              placeholder="General session is live"
            />
          </div>

          <div>
            <div className="text-sm text-white/70">Message</div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="mt-1 min-h-[120px] w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-white"
              placeholder="Optional attendee guidance shown across event pages."
            />
          </div>
        </div>

        <div className="space-y-4">
          <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/25 p-4">
            <input
              type="checkbox"
              checked={forceRedirect}
              onChange={(e) => setForceRedirect(e.target.checked)}
              className="mt-1"
            />
            <div>
              <div className="font-medium text-white">Force attendee redirect</div>
              <div className="mt-1 text-sm leading-6 text-white/60">
                When enabled, attendee event pages can automatically route people to the selected live destination.
              </div>
            </div>
          </label>

          <div className="rounded-2xl border border-white/10 bg-black/25 p-4 text-sm text-white/65">
            <div className="font-medium text-white">Operational note</div>
            <p className="mt-2 leading-6">
              Use Lobby before the event opens, General Session for the main stage, Breakout for side rooms, Replay for post-live viewing, and Off Air during transitions.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/25 p-4 text-sm text-white/65">
            <div className="font-medium text-white">Attendee path</div>
            <div className="mt-2">Current destination: <span className="text-emerald-200">{previewHref}</span></div>
            <div className="mt-2">Redirect mode: {forceRedirect ? "Automatic" : "Informational only"}</div>
          </div>
        </div>
      </div>

      {error ? <div className="mt-4 text-sm text-red-300">{error}</div> : null}
      {status === "saved" ? <div className="mt-4 text-sm text-emerald-200">Live state saved.</div> : null}

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={save}
          disabled={status === "saving" || (mode === "breakout" && !activeBreakoutId)}
          className="rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === "saving" ? "Saving…" : "Save live state"}
        </button>

        <a
          href={previewHref}
          target="_blank"
          rel="noreferrer"
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium hover:bg-white/10"
        >
          Open destination →
        </a>
      </div>
    </section>
  )
}
