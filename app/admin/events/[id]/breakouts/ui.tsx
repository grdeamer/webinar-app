"use client"

import { useEffect, useState } from "react"
import AdminDateTimeField from "@/components/admin/AdminDateTimeField"

type Breakout = {
  id: string
  event_id: string
  title: string
  description: string | null
  join_link: string | null
  start_at: string | null
  end_at: string | null
  speaker_name: string | null
  speaker_avatar_url: string | null
  manual_live: boolean | null
  auto_open: boolean | null
  created_at: string
}

function fmt(v: string | null) {
  if (!v) return ""
  try {
    return new Date(v).toLocaleString()
  } catch {
    return v
  }
}

export default function AdminBreakoutsEditor({
  eventId,
  eventSlug,
  initialItems,
}: {
  eventId: string
  eventSlug: string
  initialItems: Breakout[]
}) {
  const [items, setItems] = useState<Breakout[]>(initialItems || [])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const [draft, setDraft] = useState<Partial<Breakout>>({
    title: "",
    start_at: "",
    end_at: "",
    join_link: "",
    description: "",
    speaker_name: "",
    speaker_avatar_url: "",
    manual_live: false,
    auto_open: false,
  })

  async function refresh() {
    const res = await fetch(
      `/api/admin/event-breakouts?event_id=${encodeURIComponent(eventId)}`,
      { cache: "no-store" }
    )
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || "Failed")
    setItems(json.items || [])
  }

  async function createItem() {
    setBusy(true)
    setErr(null)
    setMsg(null)

    try {
      if (!draft.title || !String(draft.title).trim()) {
        throw new Error("Title is required")
      }

      const res = await fetch("/api/admin/event-breakouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...draft, event_id: eventId }),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed")

      setDraft({
        title: "",
        start_at: "",
        end_at: "",
        join_link: "",
        description: "",
        speaker_name: "",
        speaker_avatar_url: "",
        manual_live: false,
        auto_open: false,
      })

      await refresh()
      setMsg("Added")
    } catch (e: any) {
      setErr(e.message || "Failed")
    } finally {
      setBusy(false)
      setTimeout(() => setMsg(null), 1500)
    }
  }

  async function updateItem(id: string, patch: Partial<Breakout>) {
    setBusy(true)
    setErr(null)
    setMsg(null)

    try {
      const res = await fetch("/api/admin/event-breakouts", {
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
    if (!confirm("Delete this breakout?")) return

    setBusy(true)
    setErr(null)
    setMsg(null)

    try {
      const res = await fetch("/api/admin/event-breakouts", {
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
      <section className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-lg font-semibold">Add breakout</div>
            <div className="text-sm text-white/60">
              These show on /events/{eventSlug}/breakouts
            </div>
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
          <div className="md:col-span-2">
            <div className="text-xs text-white/60">Title *</div>
            <input
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
              value={draft.title as any}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, title: e.target.value }))
              }
              placeholder="Breakout Room A"
            />
          </div>

          <AdminDateTimeField
            label="Start"
            value={(draft.start_at as string) || null}
            onChange={(next) =>
              setDraft((prev) => ({ ...prev, start_at: next || "" }))
            }
            disabled={busy}
          />

          <AdminDateTimeField
            label="End"
            value={(draft.end_at as string) || null}
            onChange={(next) =>
              setDraft((prev) => ({ ...prev, end_at: next || "" }))
            }
            disabled={busy}
          />

          <div className="md:col-span-2">
            <div className="text-xs text-white/60">Join link</div>
            <input
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
              value={draft.join_link as any}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, join_link: e.target.value }))
              }
              placeholder="https://zoom.us/j/… or https://teams.microsoft.com/…"
            />
          </div>

          <div>
            <div className="text-xs text-white/60">Speaker name</div>
            <input
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
              value={draft.speaker_name as any}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, speaker_name: e.target.value }))
              }
              placeholder="Jane Doe"
            />
          </div>

          <div>
            <div className="text-xs text-white/60">Speaker avatar URL</div>
            <input
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
              value={draft.speaker_avatar_url as any}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  speaker_avatar_url: e.target.value,
                }))
              }
              placeholder="https://.../speaker.jpg"
            />
          </div>

          <div className="md:col-span-2 grid gap-3 md:grid-cols-2">
            <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-white/75">
              <input
                type="checkbox"
                checked={!!draft.manual_live}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    manual_live: e.target.checked,
                  }))
                }
              />
              Mark breakout as LIVE
            </label>

            <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-white/75">
              <input
                type="checkbox"
                checked={!!draft.auto_open}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    auto_open: e.target.checked,
                  }))
                }
              />
              Auto-open Zoom / Teams when live
            </label>
          </div>

          <div className="md:col-span-2">
            <div className="text-xs text-white/60">Description</div>
            <textarea
              className="mt-1 min-h-[90px] w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
              value={draft.description as any}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder="What happens in this breakout…"
            />
          </div>
        </div>

        {err ? <div className="text-sm text-red-400">{err}</div> : null}
        {msg ? <div className="text-sm text-emerald-400">{msg}</div> : null}
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold">Breakouts</div>
          <button
            onClick={() => refresh()}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs hover:bg-white/10"
          >
            Refresh
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {items.map((it) => (
            <BreakoutRow
              key={it.id}
              item={it}
              busy={busy}
              onSave={(patch) => updateItem(it.id, patch)}
              onDelete={() => deleteItem(it.id)}
            />
          ))}

          {items.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-white/60">
              No breakouts yet.
            </div>
          ) : null}
        </div>
      </section>
    </div>
  )
}

function BreakoutRow({
  item,
  busy,
  onSave,
  onDelete,
}: {
  item: Breakout
  busy: boolean
  onSave: (patch: Partial<Breakout>) => void
  onDelete: () => void
}) {
  const [open, setOpen] = useState(false)
  const [row, setRow] = useState<Breakout>(item)

  useEffect(() => {
    setRow(item)
  }, [
    item.id,
    item.title,
    item.description,
    item.join_link,
    item.start_at,
    item.end_at,
    item.speaker_name,
    item.speaker_avatar_url,
    item.manual_live,
    item.auto_open,
  ])

  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-semibold">{item.title}</div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-white/50">
            <span>
              {fmt(item.start_at)}
              {item.end_at ? " – " + fmt(item.end_at) : ""}
            </span>

            {item.manual_live ? (
              <span className="rounded-full border border-emerald-400/30 bg-emerald-400/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-200">
                LIVE
              </span>
            ) : null}

            {item.auto_open ? (
              <span className="rounded-full border border-sky-400/25 bg-sky-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-200">
                AUTO OPEN
              </span>
            ) : null}
          </div>

          {item.join_link ? (
            <div className="mt-2">
              <a
                className="break-all text-xs text-indigo-300 hover:underline"
                href={item.join_link}
                target="_blank"
                rel="noreferrer"
              >
                {item.join_link}
              </a>
            </div>
          ) : null}
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
            <input
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
              value={row.title}
              onChange={(e) =>
                setRow((prev) => ({ ...prev, title: e.target.value }))
              }
            />
          </div>

          <AdminDateTimeField
            label="Start"
            value={row.start_at}
            onChange={(next) =>
              setRow((prev) => ({ ...prev, start_at: next }))
            }
            disabled={busy}
          />

          <AdminDateTimeField
            label="End"
            value={row.end_at}
            onChange={(next) =>
              setRow((prev) => ({ ...prev, end_at: next }))
            }
            disabled={busy}
          />

          <div>
            <div className="text-xs text-white/60">Join link</div>
            <input
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
              value={row.join_link || ""}
              onChange={(e) =>
                setRow((prev) => ({
                  ...prev,
                  join_link: e.target.value || null,
                }))
              }
            />
          </div>

          <div>
            <div className="text-xs text-white/60">Speaker name</div>
            <input
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
              value={row.speaker_name || ""}
              onChange={(e) =>
                setRow((prev) => ({
                  ...prev,
                  speaker_name: e.target.value || null,
                }))
              }
            />
          </div>

          <div className="md:col-span-2">
            <div className="text-xs text-white/60">Speaker avatar URL</div>
            <input
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
              value={row.speaker_avatar_url || ""}
              onChange={(e) =>
                setRow((prev) => ({
                  ...prev,
                  speaker_avatar_url: e.target.value || null,
                }))
              }
            />
          </div>

          <div className="md:col-span-2 grid gap-3 md:grid-cols-2">
            <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-white/75">
              <input
                type="checkbox"
                checked={!!row.manual_live}
                onChange={(e) =>
                  setRow((prev) => ({
                    ...prev,
                    manual_live: e.target.checked,
                  }))
                }
              />
              Mark breakout as LIVE
            </label>

            <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-white/75">
              <input
                type="checkbox"
                checked={!!row.auto_open}
                onChange={(e) =>
                  setRow((prev) => ({
                    ...prev,
                    auto_open: e.target.checked,
                  }))
                }
              />
              Auto-open Zoom / Teams when live
            </label>
          </div>

          <div className="md:col-span-2">
            <div className="text-xs text-white/60">Description</div>
            <textarea
              className="mt-1 min-h-[90px] w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
              value={row.description || ""}
              onChange={(e) =>
                setRow((prev) => ({
                  ...prev,
                  description: e.target.value || null,
                }))
              }
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