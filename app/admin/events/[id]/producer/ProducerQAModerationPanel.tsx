"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Check,
  Eye,
  EyeOff,
  Lock,
  MessageSquareText,
  Radio,
  RotateCcw,
  Sparkles,
  Unlock,
  X,
} from "lucide-react"

type QAStatus = "pending" | "approved" | "rejected" | "answered"

type QAItem = {
  id: string
  name: string | null
  question: string
  status: QAStatus
  is_featured: boolean
  upvotes: number
  created_at: string
  origin_region: string | null
  origin_country: string | null
  origin_city: string | null
}

type QAAction =
  | "approve"
  | "reject"
  | "pending"
  | "answered"
  | "feature"
  | "unfeature"
  | "put_on_screen"
  | "hide_from_screen"
  | "lock"
  | "unlock"

const FILTERS: Array<{ id: "pending" | "approved" | "all"; label: string }> = [
  { id: "pending", label: "Incoming" },
  { id: "approved", label: "Approved" },
  { id: "all", label: "All" },
]

function locationLabel(item: QAItem) {
  return item.origin_city || item.origin_region || item.origin_country || "Audience"
}

export default function ProducerQAModerationPanel({
  eventId,
  sessionId,
  onPreviewQuestion,
  onHideQuestion,
}: {
  eventId: string
  sessionId: string
  onPreviewQuestion?: (question: string, region: string) => void
  onHideQuestion?: () => void
}) {
  const [items, setItems] = useState<QAItem[]>([])
  const [filter, setFilter] = useState<"pending" | "approved" | "all">("pending")
  const [locked, setLocked] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true)
    try {
      const response = await fetch(
        `/api/admin/events/${eventId}/qa?session_id=${encodeURIComponent(sessionId)}`,
        { cache: "no-store" }
      )
      const data = (await response.json().catch((): null => null)) as
        | { items?: QAItem[]; settings?: { is_locked?: boolean }; error?: string }
        | null
      if (!response.ok) throw new Error(data?.error || "Unable to load Q&A")
      setItems(Array.isArray(data?.items) ? data.items : [])
      setLocked(Boolean(data?.settings?.is_locked))
      setError(null)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load Q&A")
    } finally {
      if (!quiet) setLoading(false)
    }
  }, [eventId, sessionId])

  useEffect(() => {
    void load()
    const intervalId = window.setInterval((): void => {
      void load(true)
    }, 3000)
    return () => window.clearInterval(intervalId)
  }, [load])

  const visibleItems = useMemo(() => {
    if (filter === "all") return items
    return items.filter((item) => item.status === filter)
  }, [filter, items])

  const pendingCount = items.filter((item) => item.status === "pending").length
  const featured = items.find((item) => item.is_featured) ?? null

  async function act(action: QAAction, item?: QAItem) {
    const busyKey = `${action}:${item?.id || "room"}`
    setBusy(busyKey)
    setError(null)
    try {
      const response = await fetch(`/api/admin/events/${eventId}/qa`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, session_id: sessionId, id: item?.id }),
      })
      const data = (await response.json().catch((): null => null)) as { error?: string } | null
      if (!response.ok) throw new Error(data?.error || "Q&A action failed")

      if (action === "put_on_screen" && item) {
        onPreviewQuestion?.(item.question, locationLabel(item))
      }
      if (action === "hide_from_screen") onHideQuestion?.()
      await load(true)
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Q&A action failed")
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-3">
      <section className="rounded-[10px] border border-white/[0.08] bg-[#080e18] p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.13em] text-sky-100/58">
              <MessageSquareText size={13} /> Moderation desk
            </div>
            <div className="mt-1.5 text-[17px] font-semibold tracking-[-0.025em] text-white/94">
              {pendingCount} waiting
            </div>
          </div>
          <button
            type="button"
            onClick={() => void act(locked ? "unlock" : "lock")}
            disabled={busy !== null}
            className={`flex h-8 items-center gap-1.5 rounded-[7px] border px-2.5 text-[9px] font-semibold transition ${
              locked
                ? "border-amber-300/22 bg-amber-300/[0.08] text-amber-100/78"
                : "border-emerald-300/18 bg-emerald-300/[0.06] text-emerald-100/70"
            }`}
          >
            {locked ? <Lock size={11} /> : <Unlock size={11} />}
            {locked ? "Closed" : "Open"}
          </button>
        </div>

        {featured ? (
          <div className="mt-3 border-t border-white/[0.07] pt-3">
            <div className="text-[8px] font-semibold uppercase tracking-[0.12em] text-white/34">
              Featured next
            </div>
            <p className="mt-1.5 line-clamp-2 text-[11px] leading-relaxed text-white/72">
              {featured.question}
            </p>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => void act("put_on_screen", featured)}
                disabled={busy !== null}
                className="flex h-8 items-center justify-center gap-1.5 rounded-[7px] border border-sky-300/30 bg-sky-400/[0.11] text-[9px] font-semibold text-sky-50/90 transition hover:bg-sky-400/[0.17]"
              >
                <Radio size={11} /> Put on screen
              </button>
              <button
                type="button"
                onClick={() => void act("hide_from_screen")}
                disabled={busy !== null}
                className="flex h-8 items-center justify-center gap-1.5 rounded-[7px] border border-white/[0.08] bg-white/[0.025] text-[9px] font-semibold text-white/55 transition hover:bg-white/[0.05]"
              >
                <EyeOff size={11} /> Hide
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <nav className="grid grid-cols-3 gap-1 rounded-[9px] border border-white/[0.06] bg-black/20 p-1">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setFilter(item.id)}
            className={`h-8 rounded-[6px] text-[9px] font-semibold transition ${
              filter === item.id
                ? "bg-white/[0.10] text-white/88"
                : "text-white/38 hover:bg-white/[0.04] hover:text-white/60"
            }`}
          >
            {item.label}{item.id === "pending" && pendingCount ? ` ${pendingCount}` : ""}
          </button>
        ))}
      </nav>

      {error ? (
        <div className="rounded-[8px] border border-red-300/16 bg-red-400/[0.06] px-3 py-2 text-[9px] leading-relaxed text-red-100/72">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="py-8 text-center text-[10px] text-white/34">Loading questions…</div>
      ) : visibleItems.length === 0 ? (
        <div className="rounded-[10px] border border-dashed border-white/[0.09] px-3 py-8 text-center text-[10px] leading-relaxed text-white/32">
          No questions in this view.
        </div>
      ) : (
        <div className="space-y-2">
          {visibleItems.map((item) => (
            <article
              key={item.id}
              className={`rounded-[10px] border bg-[#080e18] p-3 ${
                item.is_featured ? "border-sky-300/30" : "border-white/[0.07]"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="truncate text-[9px] font-semibold text-white/50">
                  {item.name?.trim() || "Anonymous"} · {locationLabel(item)}
                </div>
                <div className="shrink-0 text-[8px] font-semibold uppercase tracking-[0.09em] text-white/28">
                  {item.upvotes ? `${item.upvotes} votes` : item.status}
                </div>
              </div>
              <p className="mt-2 text-[11px] leading-[1.45] text-white/84">{item.question}</p>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {item.status === "pending" ? (
                  <>
                    <ActionButton icon={<Check size={10} />} label="Approve" onClick={() => void act("approve", item)} disabled={busy !== null} tone="green" />
                    <ActionButton icon={<X size={10} />} label="Reject" onClick={() => void act("reject", item)} disabled={busy !== null} tone="red" />
                  </>
                ) : null}
                {item.status === "approved" || item.status === "answered" ? (
                  <>
                    <ActionButton
                      icon={<Sparkles size={10} />}
                      label={item.is_featured ? "Unfeature" : "Feature next"}
                      onClick={() => void act(item.is_featured ? "unfeature" : "feature", item)}
                      disabled={busy !== null}
                      tone="blue"
                    />
                    <ActionButton icon={<Eye size={10} />} label="On screen" onClick={() => void act("put_on_screen", item)} disabled={busy !== null} tone="blue" />
                  </>
                ) : null}
                {item.status === "approved" ? (
                  <ActionButton icon={<Check size={10} />} label="Answered" onClick={() => void act("answered", item)} disabled={busy !== null} />
                ) : null}
                {item.status === "rejected" || item.status === "answered" ? (
                  <ActionButton icon={<RotateCcw size={10} />} label="Return" onClick={() => void act("pending", item)} disabled={busy !== null} />
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

function ActionButton({
  icon,
  label,
  onClick,
  disabled,
  tone = "neutral",
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  disabled: boolean
  tone?: "neutral" | "green" | "red" | "blue"
}) {
  const tones = {
    neutral: "border-white/[0.08] bg-white/[0.025] text-white/55 hover:bg-white/[0.055]",
    green: "border-emerald-300/18 bg-emerald-300/[0.07] text-emerald-100/72 hover:bg-emerald-300/[0.12]",
    red: "border-red-300/16 bg-red-400/[0.05] text-red-100/64 hover:bg-red-400/[0.09]",
    blue: "border-sky-300/20 bg-sky-400/[0.07] text-sky-100/72 hover:bg-sky-400/[0.12]",
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex h-7 items-center gap-1.5 rounded-[6px] border px-2 text-[8px] font-semibold transition disabled:cursor-wait disabled:opacity-40 ${tones[tone]}`}
    >
      {icon} {label}
    </button>
  )
}
