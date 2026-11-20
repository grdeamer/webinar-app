"use client"

import { useEffect, useState, type FormEvent } from "react"

type AgendaItem = {
  id: string
  title: string
  description: string | null
  start_at: string | null
  end_at: string | null
}

export default function CanvasAgenda({
  eventId,
  editable,
  showTime,
  showDescriptions,
  displayMode,
}: {
  eventId: string
  editable: boolean
  showTime: boolean
  showDescriptions: boolean
  displayMode: string
}) {
  const [items, setItems] = useState<AgendaItem[] | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      try {
        const response = await fetch(`/api/admin/event-agenda?event_id=${encodeURIComponent(eventId)}`, {
          cache: "no-store",
          signal: controller.signal,
        })
        const result = await response.json()
        if (!response.ok) throw new Error(result.error || "Could not load the event agenda.")
        if (!controller.signal.aborted) setItems(result.items)
      } catch (error) {
        if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Could not load the event agenda.")
      }
    }
    void load()
    return () => controller.abort()
  }, [eventId])

  async function save(event: FormEvent<HTMLFormElement>, item: AgendaItem) {
    event.preventDefault()
    if (saving) return
    const data = new FormData(event.currentTarget)
    setSaving(true)
    setError("")
    try {
      const title = String(data.get("title") ?? "").trim()
      const description = String(data.get("description") ?? "")
      const startValue = String(data.get("start_at") ?? "")
      const initialStart = item.start_at ? new Date(item.start_at).toISOString().slice(0, 19) : ""
      const patch: Partial<AgendaItem> = {}
      if (!title) throw new Error("Enter an agenda item title.")
      if (title !== item.title) patch.title = title
      if (description !== (item.description ?? "")) patch.description = description || null
      if (startValue !== initialStart) {
        patch.start_at = startValue ? new Date(`${startValue}Z`).toISOString() : null
        if (patch.start_at && item.end_at && Date.parse(patch.start_at) > Date.parse(item.end_at)) {
          throw new Error("Start time must be before the existing end time.")
        }
      }
      if (!Object.keys(patch).length) {
        setEditingId(null)
        return
      }
      const response = await fetch("/api/admin/event-agenda", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, ...patch }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Could not save the agenda item.")
      setItems((current) => current?.map((row) => row.id === item.id ? result.item : row)
        .sort((first, second) => (first.start_at ?? "").localeCompare(second.start_at ?? "")) ?? null)
      setEditingId(null)
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not save the agenda item.")
    } finally {
      setSaving(false)
    }
  }

  const fieldClass = "block w-full rounded border border-white/20 bg-slate-950 px-2 py-1 text-white"

  return (
    <div className={displayMode === "cards" ? "grid gap-3 md:grid-cols-3" : "space-y-3"}>
      {error ? <p role="alert" className="text-sm text-rose-300">{error}</p> : null}
      {items === null && !error ? <p className="text-sm text-white/60">Loading agenda…</p> : null}
      {items?.length === 0 ? <p className="text-sm text-white/60">No agenda items yet.</p> : null}
      {items?.map((item) => (
        <div key={item.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm">
          {editable && editingId === item.id ? (
            <form className="space-y-2" onSubmit={(event) => void save(event, item)}
              onPointerDown={(event) => event.stopPropagation()}
              onDoubleClick={(event) => event.stopPropagation()}>
              <label className="block">Title<input autoFocus name="title" required maxLength={200} defaultValue={item.title} className={fieldClass} /></label>
              <label className="block">Start time (UTC)
                <input name="start_at" type="datetime-local" step="1"
                  defaultValue={item.start_at ? new Date(item.start_at).toISOString().slice(0, 19) : ""} className={fieldClass} />
              </label>
              <label className="block">Description<textarea name="description" maxLength={10000} defaultValue={item.description ?? ""} className={fieldClass} /></label>
              <p className="text-xs text-white/65">Saving updates the event schedule immediately.</p>
              <div className="flex gap-3">
                <button type="submit" disabled={saving} className="rounded bg-sky-300 px-2 py-1 text-slate-950">
                  {saving ? "Saving…" : "Save agenda item"}
                </button>
                <button type="button" disabled={saving} onClick={() => setEditingId(null)}>Cancel</button>
              </div>
            </form>
          ) : (
            <>
              <div>
                {showTime && item.start_at ? `${new Date(item.start_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} — ` : ""}
                {item.title}
              </div>
              {showDescriptions && item.description ? <p className="mt-2 text-white/60">{item.description}</p> : null}
              {editable ? (
                <button type="button" className="mt-2 text-sky-200 underline"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={() => { setError(""); setEditingId(item.id) }}>
                  Edit agenda item
                </button>
              ) : null}
            </>
          )}
        </div>
      ))}
    </div>
  )
}
