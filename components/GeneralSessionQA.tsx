"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { createClient } from "@supabase/supabase-js"

type QAItem = {
  id: string
  name: string | null
  question: string
  status: "approved" | "answered"
  created_at: string
  answered_at: string | null
}

function supabaseBrowser() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export default function GeneralSessionQA() {
  const [name, setName] = useState("")
  const [question, setQuestion] = useState("")
  const [items, setItems] = useState<QAItem[]>([])
  const [msg, setMsg] = useState("")
  const [loading, setLoading] = useState(false)
  const [locked, setLocked] = useState(false)
  const [rtWarn, setRtWarn] = useState("")

  const supabase = useMemo(() => supabaseBrowser(), [])
  const clearMsgTimer = useRef<number | null>(null)

  const load = useCallback(async () => {
    const [lr, sr] = await Promise.all([
      fetch("/api/qa/list", { cache: "no-store" }),
      fetch("/api/qa/settings", { cache: "no-store" }),
    ])

    const lj = await lr.json().catch(() => ({}))
    const sj = await sr.json().catch(() => ({}))

    setItems(lj.items || [])
    setLocked(!!sj?.settings?.is_locked)
  }, [])

  useEffect(() => {
    load()

    const ch1 = supabase
      .channel("qa-general-messages")
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
      .channel("qa-general-settings")
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
      supabase.removeChannel(ch1)
      supabase.removeChannel(ch2)
      if (clearMsgTimer.current) window.clearTimeout(clearMsgTimer.current)
    }
  }, [load, supabase])

  async function submit() {
    const q = question.trim()
    if (q.length < 3) {
      setMsg("Please type a question (at least 3 characters).")
      return
    }
    if (q.length > 800) {
      setMsg("Question is too long (max 800 characters).")
      return
    }

    setMsg("")
    setLoading(true)

    try {
      const r = await fetch("/api/qa/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, question: q }),
      })
      const j = await r.json().catch(() => ({}))

      if (!r.ok) {
        setMsg(j?.error || "Could not submit.")
        return
      }

      setQuestion("")
      setMsg("Submitted! Waiting for moderator approval.")
      load()

      if (clearMsgTimer.current) window.clearTimeout(clearMsgTimer.current)
      clearMsgTimer.current = window.setTimeout(() => setMsg(""), 6000)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Q&amp;A</h2>
        <div className="flex items-center gap-2">
          {locked ? (
            <span className="rounded-full border border-yellow-400/25 bg-yellow-500/10 px-3 py-1 text-xs text-yellow-200">
              Locked
            </span>
          ) : (
            <span className="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200">
              Open
            </span>
          )}
          <button
            onClick={load}
            className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
          >
            Refresh
          </button>
        </div>
      </div>

      {rtWarn ? (
        <div className="mt-2 text-xs text-yellow-200/80">
          {rtWarn}
        </div>
      ) : null}

      <div className="mt-3 grid gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name (optional)"
          className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2"
          disabled={locked}
        />
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Type your question…"
          className="min-h-[90px] w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2"
          disabled={locked}
        />
        <button
          disabled={loading || locked}
          onClick={submit}
          className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black disabled:opacity-60"
        >
          {locked ? "Q&A Locked" : loading ? "Submitting…" : "Submit Question"}
        </button>
        {msg ? <p className="text-sm text-white/70">{msg}</p> : null}
      </div>

      <div className="mt-4 grid gap-2">
        {items.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-white/60">
            No approved questions yet.
          </div>
        ) : (
          items.map((it) => (
            <div key={it.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
              <div className="text-sm text-white/70">
                {it.name || "Anonymous"}
                {it.status === "answered" ? (
                  <span className="ml-2 rounded bg-white/10 px-2 py-0.5 text-xs">Answered</span>
                ) : null}
              </div>
              <div className="mt-1 text-sm">{it.question}</div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}