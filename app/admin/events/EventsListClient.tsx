"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { Archive, ArchiveRestore, MoreHorizontal, Trash2, X } from "lucide-react"

type EventRow = {
  id: string
  slug: string
  title: string
  start_label: string
  lifecycle_stage: string
}

type PendingAction = { event: EventRow; action: "archive" | "restore" | "delete" }

export default function EventsListClient({ initialEvents, canManage = true }: { initialEvents: EventRow[]; canManage?: boolean }) {
  const [events, setEvents] = useState(initialEvents)
  const [showArchived, setShowArchived] = useState(false)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [pending, setPending] = useState<PendingAction | null>(null)
  const [confirmation, setConfirmation] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const archivedCount = events.filter((event) => event.lifecycle_stage === "archived").length
  const visibleEvents = useMemo(
    () => events.filter((event) => (event.lifecycle_stage === "archived") === showArchived),
    [events, showArchived]
  )

  function beginAction(event: EventRow, action: PendingAction["action"]) {
    setOpenMenuId(null)
    setConfirmation("")
    setError(null)
    setPending({ event, action })
  }

  async function applyAction() {
    if (!pending) return
    setBusy(true)
    setError(null)
    try {
      const response = await fetch(`/api/admin/events/${pending.event.id}/lifecycle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: pending.action, confirmation }),
      })
      const payload = await response.json().catch((): null => null)
      if (!response.ok) throw new Error(payload?.error || "Could not update event")

      if (pending.action === "delete") {
        setEvents((current) => current.filter((event) => event.id !== pending.event.id))
      } else {
        const stage = pending.action === "archive" ? "archived" : "build"
        setEvents((current) => current.map((event) => event.id === pending.event.id ? { ...event, lifecycle_stage: stage } : event))
      }
      setPending(null)
      setConfirmation("")
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Could not update event")
    } finally {
      setBusy(false)
    }
  }

  const actionLabel = pending?.action === "delete"
    ? "Delete permanently"
    : pending?.action === "archive"
      ? "Archive event"
      : "Restore event"

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-white/45">
          {showArchived ? `${archivedCount} archived ${archivedCount === 1 ? "event" : "events"}` : `${visibleEvents.length} active ${visibleEvents.length === 1 ? "event" : "events"}`}
        </p>
        {canManage ? <button type="button" onClick={() => { setShowArchived((current) => !current); setOpenMenuId(null) }} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.04] px-4 py-2 text-sm font-semibold text-white/75 hover:bg-white/[.08]">
          {showArchived ? <ArchiveRestore size={15} /> : <Archive size={15} />}
          {showArchived ? "Back to active events" : `Archived events (${archivedCount})`}
        </button> : null}
      </div>

      {error && !pending ? <div className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</div> : null}

      <div className="grid gap-4 md:grid-cols-2">
        {visibleEvents.map((event, index) => (
          <article key={event.id} className={`event-directory-card event-directory-card--${index % 4}`}>
            <Link href={`/admin/events/${event.id}`} className="block h-full px-6 py-6 pr-16">
              <div className="text-lg font-semibold">{event.title}</div>
              <div className="mt-1 text-sm text-white/60">/{event.slug}</div>
              <div className="mt-3 text-xs text-white/40">{event.start_label}</div>
            </Link>
            {canManage ? <button type="button" aria-label={`Actions for ${event.title}`} aria-expanded={openMenuId === event.id} onClick={() => setOpenMenuId((current) => current === event.id ? null : event.id)} className="absolute right-4 top-4 rounded-lg border border-white/10 bg-black/20 p-2 text-white/55 hover:bg-white/10 hover:text-white">
              <MoreHorizontal size={18} />
            </button> : null}
            {canManage && openMenuId === event.id ? <div className="absolute right-4 top-14 z-20 w-52 rounded-xl border border-white/10 bg-[#101522] p-1.5 shadow-2xl">
              {showArchived ? <button type="button" onClick={() => beginAction(event, "restore")} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-white/80 hover:bg-white/[.07]"><ArchiveRestore size={15} />Restore event</button> : <button type="button" onClick={() => beginAction(event, "archive")} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-white/80 hover:bg-white/[.07]"><Archive size={15} />Archive event</button>}
              <button type="button" onClick={() => beginAction(event, "delete")} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-red-300 hover:bg-red-500/10"><Trash2 size={15} />Delete permanently</button>
            </div> : null}
          </article>
        ))}
        {visibleEvents.length === 0 ? <div className="md:col-span-2 rounded-2xl border border-dashed border-white/10 bg-white/[.025] p-10 text-center text-sm text-white/45">{showArchived ? "No archived events." : "No active events yet."}</div> : null}
      </div>

      {pending ? <div role="dialog" aria-modal="true" aria-labelledby="event-action-title" className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-5 backdrop-blur-sm"><div className={`w-full max-w-lg rounded-3xl border bg-[#0b101c] p-6 shadow-2xl ${pending.action === "delete" ? "border-red-300/15" : "border-white/10"}`}><div className="flex items-start justify-between gap-4"><div><div className={`text-[10px] font-black uppercase tracking-[.2em] ${pending.action === "delete" ? "text-red-200/55" : "text-violet-200/55"}`}>Event action</div><h2 id="event-action-title" className="mt-3 text-2xl font-semibold">{actionLabel}?</h2></div><button type="button" aria-label="Close event action" onClick={() => { setPending(null); setConfirmation(""); setError(null) }} className="rounded-lg border border-white/10 p-2 text-white/55 hover:bg-white/[.06]"><X size={17} /></button></div>
        {pending.action === "archive" ? <p className="mt-4 text-sm leading-6 text-white/55"><span className="font-semibold text-white/80">{pending.event.title}</span> will move out of the active list. You can restore it at any time from Archived events.</p> : null}
        {pending.action === "restore" ? <p className="mt-4 text-sm leading-6 text-white/55"><span className="font-semibold text-white/80">{pending.event.title}</span> will return to the active event list.</p> : null}
        {pending.action === "delete" ? <><p className="mt-4 text-sm leading-6 text-white/55">This permanently deletes <span className="font-semibold text-white/80">{pending.event.title}</span> and its people, program, production, page, and publishing records. This cannot be undone.</p><label className="mt-5 block text-xs font-semibold text-white/60">Type <span className="text-white">{pending.event.title}</span> to confirm<input autoFocus value={confirmation} onChange={(inputEvent) => setConfirmation(inputEvent.target.value)} className="mt-2 w-full rounded-xl border border-red-300/15 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-red-300/40" /></label></> : null}
        {error ? <div className="mt-4 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</div> : null}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={() => { setPending(null); setConfirmation(""); setError(null) }} className="rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold hover:bg-white/[.05]">Cancel</button><button type="button" disabled={busy || (pending.action === "delete" && confirmation !== pending.event.title)} onClick={() => void applyAction()} className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold disabled:opacity-35 ${pending.action === "delete" ? "bg-red-600 hover:bg-red-500" : "bg-violet-600 hover:bg-violet-500"}`}>{pending.action === "delete" ? <Trash2 size={15} /> : pending.action === "archive" ? <Archive size={15} /> : <ArchiveRestore size={15} />}{busy ? "Working…" : actionLabel}</button></div>
      </div></div> : null}
    </>
  )
}
