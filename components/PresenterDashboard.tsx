"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@supabase/supabase-js"

type QAItem = {
  id: string
  name: string | null
  question: string
  status: "pending" | "approved" | "answered" | "rejected"
  created_at: string
  answered_at: string | null
  is_featured: boolean
  featured_at: string | null
}

type Settings = {
  room_key: string
  is_locked: boolean
  updated_at: string | null
}

function supabaseBrowser() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export default function PresenterDashboard() {
  const roomKey = "general"

  const supabase = useMemo(() => supabaseBrowser(), [])
  const [featured, setFeatured] = useState<QAItem | null>(null)
  const [nextUp, setNextUp] = useState<QAItem[]>([])
  const [settings, setSettings] = useState<Settings | null>(null)
  const [counts, setCounts] = useState({ pending: 0, approved: 0, answered: 0 })
  const [err, setErr] = useState("")
  const [autoRefresh, setAutoRefresh] = useState(true)

  async function loadAll() {
    setErr("")
    const [fr, lr, sr] = await Promise.all([
      fetch(`/api/qa/featured?room_key=${roomKey}`, { cache: "no-store" }),
      fetch(`/api/qa/list`, { cache: "no-store" }), // attendee list = approved/answered only (ok)
      fetch(`/api/qa/settings?room_key=${roomKey}`, { cache: "no-store" }),
    ])

    const fj = await fr.json().catch(() => ({}))
    const sj = await sr.json().catch(() => ({}))

    // Featured endpoint returns { featured }
    setFeatured(fj?.featured ?? null)
    setSettings(sj?.settings ?? null)

    // For “Next up” + counts, we should read directly from Supabase via realtime-capable client:
    // because /api/qa/list is limited to approved/answered only (by design).
    const { data, error } = await supabase
      .from("qa_messages")
      .select("id,name,question,status,created_at,answered_at,is_featured,featured_at")
      .eq("room_key", roomKey)
      .order("created_at", { ascending: true })
      .limit(2000)

    if (error) {
      setErr(error.message)
      return
    }

    const rows = (data ?? []) as QAItem[]
    const pending = rows.filter((r) => r.status === "pending").length
    const approved = rows.filter((r) => r.status === "approved").length
    const answered = rows.filter((r) => r.status === "answered").length
    setCounts({ pending, approved, answered })

    const queue = rows
      .filter(
        (r) =>
          r.status === "approved" &&
          !r.is_featured
      )
      .slice(-10) // last 10 approved items
      .reverse() // newest first for presenter
    setNextUp(queue)
  }

  useEffect(() => {
    loadAll()

    const ch1 = supabase
      .channel("presenter-general-messages")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "qa_messages", filter: `room_key=eq.${roomKey}` },
        () => {
          if (autoRefresh) loadAll()
        }
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          setErr("Realtime not connected. Presenter mode will still work with manual refresh.")
        }
      })

    const ch2 = supabase
      .channel("presenter-general-settings")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "qa_room_settings", filter: `room_key=eq.${roomKey}` },
        () => {
          if (autoRefresh) loadAll()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(ch1)
      supabase.removeChannel(ch2)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh])

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
            Room: {roomKey}
          </span>
          <span
            className={`rounded-full px-3 py-1 text-xs ${
              settings?.is_locked
                ? "border border-yellow-400/25 bg-yellow-500/10 text-yellow-200"
                : "border border-emerald-400/25 bg-emerald-500/10 text-emerald-200"
            }`}
          >
            {settings?.is_locked ? "Q&A Locked" : "Q&A Open"}
          </span>

          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
            Pending: {counts.pending}
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
            Approved: {counts.approved}
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
            Answered: {counts.answered}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-white/70">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto refresh
          </label>

          <button
            onClick={loadAll}
            className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
          >
            Refresh
          </button>
        </div>
      </div>

      {err ? (
        <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-200">
          {err}
        </div>
      ) : null}

      {/* FEATURED */}
      <section className="rounded-3xl border border-yellow-400/25 bg-yellow-500/10 p-5">
        <div className="text-xs uppercase tracking-wide text-yellow-200/80">
          Featured Question
        </div>

        {featured ? (
          <>
            <div className="mt-2 text-2xl font-semibold leading-snug">
              {featured.question}
            </div>
            <div className="mt-3 text-sm text-white/70">
              — {featured.name || "Anonymous"}
            </div>
          </>
        ) : (
          <div className="mt-2 text-lg text-white/70">
            No featured question yet.
          </div>
        )}
      </section>

      {/* NEXT UP */}
      <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs uppercase tracking-wide text-white/60">
            Next Up (Newest Approved)
          </div>
          <div className="text-xs text-white/50">Showing up to 10</div>
        </div>

        <div className="mt-3 grid gap-3">
          {nextUp.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-white/60">
              No approved questions waiting.
            </div>
          ) : (
            nextUp.map((q, idx) => (
              <div
                key={q.id}
                className="rounded-2xl border border-white/10 bg-black/20 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs text-white/50">#{idx + 1}</div>
                  <div className="text-xs text-white/50">{q.name || "Anonymous"}</div>
                </div>
                <div className="mt-2 text-lg leading-snug">{q.question}</div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  )
}