"use client"

import { useState } from "react"

export default function AdminEventScaffoldButton({ eventId }: { eventId: string }) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function run() {
    setBusy(true)
    setMessage(null)
    setError(null)
    try {
      const res = await fetch(`/api/admin/events/${eventId}/scaffold`, { method: "POST" })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || "Failed to scaffold")
      const summary = json?.summary || {}
      setMessage(
        `Scaffolded agenda ${summary.agendaCreated || 0}, breakouts ${summary.breakoutsCreated || 0}, sponsors ${summary.sponsorsCreated || 0}, library ${summary.libraryCreated || 0}.`
      )
    } catch (err: any) {
      setError(err?.message || "Failed to scaffold")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
      <div>
        <div className="text-sm font-semibold text-white">Portal scaffold</div>
        <div className="mt-1 text-xs leading-5 text-white/50">
          Auto-create starter agenda items, breakout tiles, sponsors, and on-demand library cards for this event when those sections are empty.
        </div>
      </div>
      <button
        type="button"
        onClick={run}
        disabled={busy}
        className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400 disabled:opacity-60"
      >
        {busy ? "Scaffolding..." : "Create starter portal content"}
      </button>
      {message ? <div className="text-xs text-emerald-300">{message}</div> : null}
      {error ? <div className="text-xs text-red-300">{error}</div> : null}
    </div>
  )
}
