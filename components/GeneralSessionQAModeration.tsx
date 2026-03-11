"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { createClient } from "@supabase/supabase-js"

type QAItem = {
  id: string
  name: string | null
  question: string
  status: string
  created_at: string
  answered_at: string | null
  is_featured?: boolean
  featured_at?: string | null
}

const STATUSES = ["pending", "approved", "answered", "rejected", "all"] as const

function supabaseBrowser() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export default function GeneralSessionQAModeration() {
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("pending")
  const [items, setItems] = useState<QAItem[]>([])
  const [err, setErr] = useState("")
  const [locked, setLocked] = useState(false)
  const [busy, setBusy] = useState(false)
  const [rtWarn, setRtWarn] = useState("")

  const supabase = useMemo(() => supabaseBrowser(), [])
  const mounted = useRef(true)

  const load = useCallback(async () => {
    setErr("")
    const [lr, sr] = await Promise.all([
      fetch(`/api/admin/qa/list?status=${status}`, { cache: "no-store" }),
      fetch(`/api/qa/settings`, { cache: "no-store" }),
    ])

    const lj = await lr.json().catch(() => ({}))
    if (!lr.ok) {
      if (mounted.current) setErr(lj?.error || "Failed to load")
      return
    }

    const sj = await sr.json().catch(() => ({}))

    if (mounted.current) {
      setItems(lj.items || [])
      setLocked(!!sj?.settings?.is_locked)
    }
  }, [status])

  async function act(action: string, id?: string) {
    setErr("")

    // Confirm destructive actions
    if (action === "delete") {
      if (!confirm("Delete this question?")) return
    }
    if (action === "clear_answered") {
      if (!confirm("Delete ALL answered questions?")) return
    }
    if (action === "clear_featured") {
      if (!confirm("Clear the featured question?")) return
    }
    if (action === "lock") {
      if (!confirm("Lock Q&A? (Attendees will not be able to submit)")) return
    }

    setBusy(true)
    try {
      const r = await fetch("/api/admin/qa/update", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, id }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) {
        setErr(j?.error || "Action failed")
        return
      }
      load()
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    mounted.current = true
    load()

    const ch1 = supabase
      .channel("qa-general-admin-messages")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "qa_messages", filter: "room_key=eq.general" },
        () => load()
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          setRtWarn("Realtime not connected (Refresh still works).")
        }
      })

    const ch2 = supabase
      .channel("qa-general-admin-settings")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "qa_room_settings", filter: "room_key=eq.general" },
        () => load()
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          setRtWarn("Realtime not connected (Refresh still works).")
        }
      })

    return () => {
      mounted.current = false
      supabase.removeChannel(ch1)
      supabase.removeChannel(ch2)
    }
  }, [load, supabase])

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Q&amp;A Moderation</h2>
        <button
          onClick={load}
          disabled={busy}
          className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm hover:bg-white/10 disabled:opacity-60"
        >
          Refresh
        </button>
      </div>

      {rtWarn ? <div className="mt-2 text-xs text-yellow-200/80">{rtWarn}</div> : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as any)}
          className="rounded-xl border border-white/10 bg-black/30 px-3 py-2"
          disabled={busy}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <button
          onClick={() => act(locked ? "unlock" : "lock")}
          disabled={busy}
          className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm hover:bg-white/10 disabled:opacity-60"
        >
          {locked ? "Unlock Q&A" : "Lock Q&A"}
        </button>

        <button
          onClick={() => act("clear_answered")}
          disabled={busy}
          className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm hover:bg-white/10 disabled:opacity-60"
        >
          Clear Answered
        </button>

        <button
          onClick={() => act("clear_featured")}
          disabled={busy}
          className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm hover:bg-white/10 disabled:opacity-60"
        >
          Clear Featured
        </button>

        <a
          href="/api/admin/qa/export"
          className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-black"
        >
          Export CSV
        </a>

        {busy ? <span className="text-xs text-white/60">Working…</span> : null}
        {err ? <span className="text-sm text-red-300">{err}</span> : null}
      </div>

      <div className="mt-4 grid gap-3">
        {items.map((it) => (
          <div key={it.id} className="rounded-2xl border border-white/10 bg-black/20 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm text-white/70">
                <span className="font-semibold text-white">{it.name || "Anonymous"}</span>
                <span className="ml-2 rounded bg-white/10 px-2 py-0.5 text-xs">{it.status}</span>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => act("feature", it.id)}
                  disabled={busy}
                  className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm hover:bg-white/10 disabled:opacity-60"
                >
                  Feature
                </button>
                <button
                  onClick={() => act("approve", it.id)}
                  disabled={busy}
                  className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm hover:bg-white/10 disabled:opacity-60"
                >
                  Approve
                </button>
                <button
                  onClick={() => act("answer", it.id)}
                  disabled={busy}
                  className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm hover:bg-white/10 disabled:opacity-60"
                >
                  Answered
                </button>
                <button
                  onClick={() => act("reject", it.id)}
                  disabled={busy}
                  className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm hover:bg-white/10 disabled:opacity-60"
                >
                  Reject
                </button>
                <button
                  onClick={() => act("delete", it.id)}
                  disabled={busy}
                  className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm hover:bg-red-500/20 disabled:opacity-60"
                >
                  Delete
                </button>
              </div>
            </div>

            <div className="mt-2 text-sm">{it.question}</div>
          </div>
        ))}

        {items.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-white/60">
            No items.
          </div>
        ) : null}
      </div>
    </div>
  )
}