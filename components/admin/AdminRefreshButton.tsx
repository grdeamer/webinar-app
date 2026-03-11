"use client"

import { useState } from "react"

type Props = {
  scopeType: "event" | "webinar"
  scopeId: string
  label?: string
  className?: string
}

export default function AdminRefreshButton({
  scopeType,
  scopeId,
  label = "Refresh attendee screens",
  className,
}: Props) {
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function sendRefresh() {
    setBusy(true)
    setMsg(null)
    try {
      const res = await fetch("/api/admin/refresh-signal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scopeType, scopeId }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || "Failed to send refresh")
      setMsg("Refresh signal sent")
    } catch (e: any) {
      setMsg(e?.message || "Failed to send refresh")
    } finally {
      setBusy(false)
      setTimeout(() => setMsg(null), 2200)
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={sendRefresh}
        disabled={busy || !scopeId}
        className={
          className ||
          "rounded-xl border border-cyan-400/20 bg-cyan-500/15 px-4 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-500/25 disabled:opacity-60"
        }
      >
        {busy ? "Sending…" : label}
      </button>
      {msg ? <div className="text-xs text-white/65">{msg}</div> : null}
    </div>
  )
}
