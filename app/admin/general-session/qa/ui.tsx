"use client"

import * as React from "react"
import { createClient } from "@supabase/supabase-js"

type Session = {
  id: string
  slug: string
  enabled: boolean
  allow_anonymous: boolean
}

type Question = {
  id: string
  question: string
  asked_by: string | null
  status: "pending" | "approved" | "hidden" | string
  pinned: boolean
  created_at: string
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function AdminGeneralSessionQA() {
  const slug = "general-session"

  const [session, setSession] = React.useState<Session | null>(null)
  const [questions, setQuestions] = React.useState<Question[]>([])
  const [loading, setLoading] = React.useState(false)
  const [msg, setMsg] = React.useState<string | null>(null)
  const [err, setErr] = React.useState<string | null>(null)

  async function load() {
    setErr(null)
    const res = await fetch(`/api/admin/general-session/qa/list?slug=${encodeURIComponent(slug)}`, {
      cache: "no-store",
    })
    const json = await res.json()
    if (!res.ok) {
      setErr(json?.error || "Failed to load")
      return
    }
    setSession(json.session)
    setQuestions(json.questions || [])
    return json as { session: Session; questions: Question[] }
  }

  React.useEffect(() => {
    let cancelled = false
    let unsubQuestions: (() => void) | null = null
    let unsubSession: (() => void) | null = null

    ;(async () => {
      const fresh = await load()
      const sid = fresh?.session?.id
      if (!sid) return

      const qChan = supabase
        .channel(`admin_qa_questions:${sid}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "qa_questions", filter: `session_id=eq.${sid}` },
          () => {
            if (!cancelled) load()
          }
        )
        .subscribe()

      unsubQuestions = () => {
        supabase.removeChannel(qChan)
      }

      const sChan = supabase
        .channel(`admin_qa_sessions:${slug}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "qa_sessions", filter: `slug=eq.${slug}` },
          () => {
            if (!cancelled) load()
          }
        )
        .subscribe()

      unsubSession = () => {
        supabase.removeChannel(sChan)
      }
    })()

    return () => {
      cancelled = true
      try {
        unsubQuestions?.()
      } catch {}
      try {
        unsubSession?.()
      } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])


  async function toggleEnabled(enabled: boolean) {
    setLoading(true)
    setMsg(null)
    setErr(null)
    try {
      const res = await fetch("/api/admin/general-session/qa/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, enabled }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || "Failed")
      setMsg(enabled ? "Q&A opened." : "Q&A closed.")
      load()
    } catch (e: any) {
      setErr(e?.message || "Failed")
    } finally {
      setLoading(false)
    }
  }

  async function toggleAnonymous(allow_anonymous: boolean) {
    setLoading(true)
    setMsg(null)
    setErr(null)
    try {
      const res = await fetch("/api/admin/general-session/qa/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, allow_anonymous }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || "Failed")
      setMsg(allow_anonymous ? "Anonymous questions allowed." : "Anonymous questions disabled.")
      load()
    } catch (e: any) {
      setErr(e?.message || "Failed")
    } finally {
      setLoading(false)
    }
  }

  async function moderate(id: string, patch: { status?: string; pinned?: boolean }) {
    setLoading(true)
    setMsg(null)
    setErr(null)
    try {
      const res = await fetch("/api/admin/general-session/qa/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...patch }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || "Failed")
      setMsg("Saved.")
      load()
    } catch (e: any) {
      setErr(e?.message || "Failed")
    } finally {
      setLoading(false)
    }
  }

  const pending = questions.filter((q) => q.status === "pending")
  const approved = questions.filter((q) => q.status === "approved")
  const hidden = questions.filter((q) => q.status === "hidden")

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm text-white/60">Session</div>
            <div className="text-lg font-semibold">{session?.slug ?? slug}</div>
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={loading}
              onClick={() => toggleEnabled(!(session?.enabled ?? true))}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 disabled:opacity-40"
            >
              {session?.enabled ? "Close Q&A" : "Open Q&A"}
            </button>

            <button
              disabled={loading}
              onClick={() => toggleAnonymous(!(session?.allow_anonymous ?? false))}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 disabled:opacity-40"
              title="If on, viewers can submit without being logged in."
            >
              {session?.allow_anonymous ? "Disable Anonymous" : "Allow Anonymous"}
            </button>

            <button
              disabled={loading}
              onClick={load}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 disabled:opacity-40"
            >
              Refresh
            </button>
          </div>
        </div>

        {msg ? <div className="mt-3 text-sm text-green-300">{msg}</div> : null}
        {err ? <div className="mt-3 text-sm text-red-300">{err}</div> : null}
      </div>

      <Section
        title={`Pending (${pending.length})`}
        items={pending}
        onApprove={(id) => moderate(id, { status: "approved" })}
        onHide={(id) => moderate(id, { status: "hidden" })}
        onPin={(id) => moderate(id, { pinned: true })}
        onUnpin={(id) => moderate(id, { pinned: false })}
        loading={loading}
      />

      <Section
        title={`Approved (${approved.length})`}
        items={approved}
        onApprove={(id) => moderate(id, { status: "approved" })}
        onHide={(id) => moderate(id, { status: "hidden" })}
        onPin={(id) => moderate(id, { pinned: true })}
        onUnpin={(id) => moderate(id, { pinned: false })}
        loading={loading}
      />

      <Section
        title={`Hidden (${hidden.length})`}
        items={hidden}
        onApprove={(id) => moderate(id, { status: "approved" })}
        onHide={(id) => moderate(id, { status: "hidden" })}
        onPin={(id) => moderate(id, { pinned: true })}
        onUnpin={(id) => moderate(id, { pinned: false })}
        loading={loading}
      />
    </div>
  )
}

function Section({
  title,
  items,
  loading,
  onApprove,
  onHide,
  onPin,
  onUnpin,
}: {
  title: string
  items: Question[]
  loading: boolean
  onApprove: (id: string) => void
  onHide: (id: string) => void
  onPin: (id: string) => void
  onUnpin: (id: string) => void
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="text-lg font-semibold">{title}</div>

      {items.length === 0 ? (
        <div className="mt-3 text-sm text-white/60">Nothing here.</div>
      ) : (
        <div className="mt-4 space-y-3">
          {items.map((q) => (
            <div key={q.id} className="rounded-2xl border border-white/10 bg-black/30 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm text-white/60">
                    {q.asked_by ? q.asked_by : "—"} • {new Date(q.created_at).toLocaleString()}
                    {q.pinned ? " • PINNED" : ""}
                    {q.status ? ` • ${q.status.toUpperCase()}` : ""}
                  </div>
                  <div className="mt-2 text-sm leading-relaxed">{q.question}</div>
                </div>

                <div className="flex shrink-0 flex-col gap-2">
                  <button
                    disabled={loading}
                    onClick={() => onApprove(q.id)}
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs hover:bg-white/10 disabled:opacity-40"
                  >
                    Approve
                  </button>
                  <button
                    disabled={loading}
                    onClick={() => onHide(q.id)}
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs hover:bg-white/10 disabled:opacity-40"
                  >
                    Hide
                  </button>
                  {q.pinned ? (
                    <button
                      disabled={loading}
                      onClick={() => onUnpin(q.id)}
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs hover:bg-white/10 disabled:opacity-40"
                    >
                      Unpin
                    </button>
                  ) : (
                    <button
                      disabled={loading}
                      onClick={() => onPin(q.id)}
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs hover:bg-white/10 disabled:opacity-40"
                    >
                      Pin
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
