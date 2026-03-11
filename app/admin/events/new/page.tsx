"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import AdminDateTimeField from "@/components/admin/AdminDateTimeField"

function slugify(v: string) {
  return v
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
}

export default function NewEventPage() {
  const r = useRouter()
  const [title, setTitle] = useState("")
  const [slug, setSlug] = useState("")
  const [startAt, setStartAt] = useState<string | null>(null)
  const [endAt, setEndAt] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [scaffold, setScaffold] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  async function create() {
    setErr(null)
    const s = (slug || slugify(title)).trim()
    if (!title.trim()) return setErr("Title is required")
    if (!s) return setErr("Slug is required")

    setBusy(true)
    try {
      const res = await fetch("/api/admin/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), slug: s, start_at: startAt, end_at: endAt }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to create")
      if (scaffold) {
        await fetch(`/api/admin/events/${json.id}/scaffold`, { method: "POST" })
      }
      r.push(`/admin/events/${json.id}`)
    } catch (e: any) {
      setErr(e.message || "Failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">New Event</h1>
        <Link href="/admin/events" className="text-sm text-white/70 hover:text-white">← Back</Link>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-6">
        <div>
          <div className="text-sm text-white/70">Title</div>
          <input
            className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value)
              if (!slug) setSlug(slugify(e.target.value))
            }}
            placeholder="Spring Summit 2026"
          />
        </div>

        <div>
          <div className="text-sm text-white/70">Slug</div>
          <input
            className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="spring-summit-2026"
          />
          <div className="mt-1 text-xs text-white/40">Event URL will be /events/{slug || "your-slug"}/lobby</div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <AdminDateTimeField
            label="Event start"
            value={startAt}
            onChange={setStartAt}
            disabled={busy}
            helperText="Styled date and time controls for the event homepage, countdown, and agenda defaults."
          />
          <AdminDateTimeField
            label="Event end"
            value={endAt}
            onChange={setEndAt}
            disabled={busy}
            helperText="Optional, but recommended for homepage summaries and attendee-facing schedule context."
          />
        </div>

        {err ? <div className="text-sm text-red-400">{err}</div> : null}

        <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/75">
          <input type="checkbox" checked={scaffold} onChange={(e) => setScaffold(e.target.checked)} className="h-4 w-4 rounded border-white/20 bg-transparent" />
          Auto-create starter portal content (agenda, breakouts, sponsors, library)
        </label>

        <button
          disabled={busy}
          onClick={create}
          className="rounded-xl bg-emerald-600 px-4 py-2 font-semibold hover:bg-emerald-500 disabled:opacity-60"
        >
          Create Event
        </button>
      </div>
    </div>
  )
}
