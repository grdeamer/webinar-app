"use client"

import { useEffect, useState } from "react"
import AdminDateTimeField from "@/components/admin/AdminDateTimeField"

type AgendaItem = {
  id: string
  event_id: string
  start_at: string | null
  end_at: string | null
  title: string
  description: string | null
  location: string | null
  track: string | null
  speaker: string | null
  sort_index: number
  created_at: string
}

function fmt(v: string | null) {
  if (!v) return ""
  try { return new Date(v).toLocaleString() } catch { return v }
}

export default function AdminAgendaEditor({
  eventId,
  eventSlug,
  initialItems,
}: {
  eventId: string
  eventSlug: string
  initialItems: AgendaItem[]
}) {
  const [items, setItems] = useState<AgendaItem[]>(initialItems || [])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const [draft, setDraft] = useState<Partial<AgendaItem>>({
    title: "",
    start_at: "",
    end_at: "",
    location: "",
    track: "",
    speaker: "",
    description: "",
    sort_index: 0,
  })

  async function refresh() {
    const res = await fetch(`/api/admin/event-agenda?event_id=${encodeURIComponent(eventId)}`, { cache: "no-store" })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || "Failed")
    setItems(json.items || [])
  }

  async function createItem() {
    setBusy(true); setErr(null); setMsg(null)
    try {
      if (!draft.title || !String(draft.title).trim()) throw new Error("Title is required")
      const res = await fetch("/api/admin/event-agenda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...draft, event_id: eventId }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed")
      setDraft({ title: "", start_at: "", end_at: "", location: "", track: "", speaker: "", description: "", sort_index: 0 })
      await refresh()
      setMsg("Added")
    } catch (e: any) {
      setErr(e.message || "Failed")
    } finally {
      setBusy(false)
      setTimeout(() => setMsg(null), 1500)
    }
  }

  async function updateItem(id: string, patch: Partial<AgendaItem>) {
    setBusy(true); setErr(null); setMsg(null)
    try {
      const res = await fetch("/api/admin/event-agenda", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...patch }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed")
      await refresh()
      setMsg("Saved")
    } catch (e: any) {
      setErr(e.message || "Failed")
    } finally {
      setBusy(false)
      setTimeout(() => setMsg(null), 1500)
    }
  }

  async function deleteItem(id: string) {
    if (!confirm("Delete this agenda item?")) return
    setBusy(true); setErr(null); setMsg(null)
    try {
      const res = await fetch("/api/admin/event-agenda", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed")
      await refresh()
      setMsg("Deleted")
    } catch (e: any) {
      setErr(e.message || "Failed")
    } finally {
      setBusy(false)
      setTimeout(() => setMsg(null), 1500)
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-lg font-semibold">Add agenda item</div>
            <div className="text-sm text-white/60">These show on /events/{eventSlug}/agenda</div>
          </div>
          <button
            onClick={createItem}
            disabled={busy}
            className="rounded-xl bg-emerald-600 px-4 py-2 font-semibold hover:bg-emerald-500 disabled:opacity-60"
          >
            + Add
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <div className="text-xs text-white/60">Title *</div>
            <input className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
              value={draft.title as any}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder="Opening Keynote"
            />
          </div>
          <div>
            <div className="text-xs text-white/60">Speaker</div>
            <input className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
              value={draft.speaker as any}
              onChange={(e) => setDraft({ ...draft, speaker: e.target.value })}
              placeholder="Dr. Smith"
            />
          </div>

          <AdminDateTimeField
            label="Start"
            value={(draft.start_at as string) || null}
            onChange={(next) => setDraft({ ...draft, start_at: next || "" })}
            disabled={busy}
          />
          <AdminDateTimeField
            label="End"
            value={(draft.end_at as string) || null}
            onChange={(next) => setDraft({ ...draft, end_at: next || "" })}
            disabled={busy}
          />

          <div>
            <div className="text-xs text-white/60">Track</div>
            <input className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
              value={draft.track as any}
              onChange={(e) => setDraft({ ...draft, track: e.target.value })}
              placeholder="Main"
            />
          </div>
          <div>
            <div className="text-xs text-white/60">Location</div>
            <input className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
              value={draft.location as any}
              onChange={(e) => setDraft({ ...draft, location: e.target.value })}
              placeholder="Ballroom A / Zoom / Room 1"
            />
          </div>

          <div className="md:col-span-2">
            <div className="text-xs text-white/60">Description</div>
            <textarea className="mt-1 w-full min-h-[90px] rounded-xl border border-white/10 bg-white/5 px-3 py-2"
              value={draft.description as any}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              placeholder="Short session description…"
            />
          </div>

          <div>
            <div className="text-xs text-white/60">Sort index</div>
            <input className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
              value={String(draft.sort_index ?? 0)}
              onChange={(e) => setDraft({ ...draft, sort_index: Number(e.target.value || 0) })}
            />
          </div>
        </div>

        {err ? <div className="text-sm text-red-400">{err}</div> : null}
        {msg ? <div className="text-sm text-emerald-400">{msg}</div> : null}
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold">Agenda items</div>
          <button onClick={() => refresh()} className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs hover:bg-white/10">
            Refresh
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {items.map((it) => (
            <AgendaRow
              key={it.id}
              item={it}
              busy={busy}
              onSave={(patch) => updateItem(it.id, patch)}
              onDelete={() => deleteItem(it.id)}
            />
          ))}

          {items.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-white/60">No agenda items yet.</div>
          ) : null}
        </div>
      </section>
    </div>
  )
}

function AgendaRow({
  item,
  busy,
  onSave,
  onDelete,
}: {
  item: AgendaItem
  busy: boolean
  onSave: (patch: Partial<AgendaItem>) => void
  onDelete: () => void
}) {
  const [open, setOpen] = useState(false)
  const [row, setRow] = useState<AgendaItem>(item)

  // keep in sync if refresh replaces item
  useEffect(() => { setRow(item) }, [item.id, item.start_at, item.end_at, item.title, item.description, item.location, item.track, item.speaker, item.sort_index])

  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-semibold">{item.title}</div>
          <div className="mt-1 text-xs text-white/50">
            {fmt(item.start_at)} {item.end_at ? "– " + fmt(item.end_at) : ""}
          </div>
          <div className="mt-1 text-xs text-white/50 flex flex-wrap gap-2">
            {item.track ? <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5">{item.track}</span> : null}
            {item.location ? <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5">{item.location}</span> : null}
            {item.speaker ? <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5">{item.speaker}</span> : null}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setOpen((v) => !v)}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs hover:bg-white/10"
          >
            {open ? "Close" : "Edit"}
          </button>
          <button
            disabled={busy}
            onClick={onDelete}
            className="rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-1.5 text-xs text-red-200 hover:bg-red-500/20 disabled:opacity-60"
          >
            Delete
          </button>
        </div>
      </div>

      {open ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <div className="text-xs text-white/60">Title</div>
            <input className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
              value={row.title}
              onChange={(e) => setRow({ ...row, title: e.target.value })}
            />
          </div>

          <AdminDateTimeField
            label="Start"
            value={row.start_at}
            onChange={(next) => setRow({ ...row, start_at: next })}
            disabled={busy}
          />
          <AdminDateTimeField
            label="End"
            value={row.end_at}
            onChange={(next) => setRow({ ...row, end_at: next })}
            disabled={busy}
          />

          <div>
            <div className="text-xs text-white/60">Track</div>
            <input className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
              value={row.track || ""}
              onChange={(e) => setRow({ ...row, track: e.target.value || null })}
            />
          </div>
          <div>
            <div className="text-xs text-white/60">Location</div>
            <input className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
              value={row.location || ""}
              onChange={(e) => setRow({ ...row, location: e.target.value || null })}
            />
          </div>

          <div>
            <div className="text-xs text-white/60">Speaker</div>
            <input className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
              value={row.speaker || ""}
              onChange={(e) => setRow({ ...row, speaker: e.target.value || null })}
            />
          </div>

          <div>
            <div className="text-xs text-white/60">Sort index</div>
            <input className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
              value={String(row.sort_index ?? 0)}
              onChange={(e) => setRow({ ...row, sort_index: Number(e.target.value || 0) })}
            />
          </div>

          <div className="md:col-span-2">
            <div className="text-xs text-white/60">Description</div>
            <textarea className="mt-1 w-full min-h-[90px] rounded-xl border border-white/10 bg-white/5 px-3 py-2"
              value={row.description || ""}
              onChange={(e) => setRow({ ...row, description: e.target.value || null })}
            />
          </div>

          <div className="md:col-span-2 flex gap-2">
            <button
              disabled={busy}
              onClick={() => onSave(row)}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold hover:bg-emerald-500 disabled:opacity-60"
            >
              Save
            </button>
            <button
              onClick={() => setOpen(false)}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
