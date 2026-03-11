"use client"

import { useState } from "react"
import Link from "next/link"

import AdminEventSponsorManager from "@/components/admin/AdminEventSponsorManager"
import AdminEventScaffoldButton from "@/components/admin/AdminEventScaffoldButton"
import AdminDateTimeField from "@/components/admin/AdminDateTimeField"
import AdminRefreshButton from "@/components/admin/AdminRefreshButton"
import AdminEventLiveStatePanel from "@/components/admin/AdminEventLiveStatePanel"
import type { EventBreakout, EventLiveStateRecord, EventSponsorRecord } from "@/lib/types"

type EventRow = {
  id: string
  slug: string
  title: string
  description: string | null
  start_at: string | null
  end_at: string | null
  event_sponsors?: EventSponsorRecord[] | null
}

export default function AdminEventEditor({
  initial,
  initialBreakouts,
  initialLiveState,
  importRegistrantsHref,
}: {
  initial: EventRow
  initialBreakouts: EventBreakout[]
  initialLiveState: EventLiveStateRecord | null
  importRegistrantsHref?: string
}) {
  const [row, setRow] = useState<EventRow>(initial)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  async function save() {
    setBusy(true)
    setMsg(null)
    setErr(null)

    try {
      const res = await fetch("/api/admin/events", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(row),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed")

      setMsg("Saved")
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed")
    } finally {
      setBusy(false)
      setTimeout(() => setMsg(null), 1500)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{row.title}</h1>
          <div className="mt-1 text-sm text-white/60">/{row.slug}</div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/events"
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 hover:bg-white/10"
          >
            Back
          </Link>

          {importRegistrantsHref ? (
            <Link
              href={importRegistrantsHref}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 hover:bg-white/10"
            >
              Import Registrants
            </Link>
          ) : null}

          <a
            href={`/events/${row.slug}/lobby`}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl bg-indigo-600 px-4 py-2 font-semibold hover:bg-indigo-500"
          >
            Open Lobby →
          </a>

          <AdminRefreshButton scopeType="event" scopeId={row.id} />
        </div>
      </div>

      <AdminEventLiveStatePanel
        eventId={row.id}
        eventSlug={row.slug}
        breakouts={initialBreakouts}
        initialLiveState={initialLiveState}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="space-y-6 rounded-2xl border border-white/10 bg-white/5 p-6 lg:col-span-2">
          <div>
            <div className="text-sm text-white/70">Title</div>
            <input
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
              value={row.title}
              onChange={(e) =>
                setRow((prev) => ({ ...prev, title: e.target.value }))
              }
            />
          </div>

          <div>
            <div className="text-sm text-white/70">Description</div>
            <textarea
              className="mt-1 min-h-[140px] w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
              value={row.description || ""}
              onChange={(e) =>
                setRow((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder="Welcome text for your lobby…"
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <AdminDateTimeField
              label="Event start"
              value={row.start_at}
              onChange={(next) =>
                setRow((prev) => ({ ...prev, start_at: next }))
              }
              disabled={busy}
              helperText="This new project-wide control replaces raw ISO typing with a cleaner date, time, and timezone picker."
            />

            <AdminDateTimeField
              label="Event end"
              value={row.end_at}
              onChange={(next) =>
                setRow((prev) => ({ ...prev, end_at: next }))
              }
              disabled={busy}
              helperText="Use this for countdown windows, event summaries, and attendee-facing timing."
            />
          </div>

          {err ? <div className="text-sm text-red-400">{err}</div> : null}
          {msg ? <div className="text-sm text-emerald-400">{msg}</div> : null}

          <button
            disabled={busy}
            onClick={save}
            className="rounded-xl bg-emerald-600 px-4 py-2 font-semibold hover:bg-emerald-500 disabled:opacity-60"
          >
            Save
          </button>
        </section>

        <aside className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-6">
          <AdminEventScaffoldButton eventId={row.id} />
          <AdminRefreshButton scopeType="event" scopeId={row.id} />

          <div className="text-sm text-white/60">Build your event</div>

          <div className="pt-2 text-xs font-semibold uppercase tracking-wider text-white/40">
            Admin tools
          </div>

          {importRegistrantsHref ? (
            <Link
              className="block rounded-xl border border-white/10 bg-white/5 px-4 py-2 hover:bg-white/10"
              href={importRegistrantsHref}
            >
              Import Registrants CSV
            </Link>
          ) : null}

          <Link
            className="block rounded-xl border border-white/10 bg-white/5 px-4 py-2 hover:bg-white/10"
            href={`/admin/events/${row.id}/agenda`}
          >
            Manage Agenda
          </Link>

          <Link
            className="block rounded-xl border border-white/10 bg-white/5 px-4 py-2 hover:bg-white/10"
            href={`/admin/events/${row.id}/sessions`}
          >
            Manage Sessions
          </Link>

          <Link
            className="block rounded-xl border border-white/10 bg-white/5 px-4 py-2 opacity-70 hover:bg-white/10"
            href={`/admin/events/${row.id}/breakouts`}
          >
            Legacy Breakouts
          </Link>

          <div className="pt-4 text-xs font-semibold uppercase tracking-wider text-white/40">
            Event Pages
          </div>

          <a
            className="block rounded-xl border border-white/10 bg-white/5 px-4 py-2 hover:bg-white/10"
            href={`/events/${row.slug}/agenda`}
            target="_blank"
            rel="noreferrer"
          >
            Agenda
          </a>

          <a
            className="block rounded-xl border border-white/10 bg-white/5 px-4 py-2 hover:bg-white/10"
            href={`/events/${row.slug}/breakouts`}
            target="_blank"
            rel="noreferrer"
          >
            Sessions
          </a>

          <a
            className="block rounded-xl border border-white/10 bg-white/5 px-4 py-2 hover:bg-white/10"
            href={`/events/${row.slug}/sponsors`}
            target="_blank"
            rel="noreferrer"
          >
            Sponsors
          </a>

          <a
            className="block rounded-xl border border-white/10 bg-white/5 px-4 py-2 hover:bg-white/10"
            href={`/events/${row.slug}/chat`}
            target="_blank"
            rel="noreferrer"
          >
            Chat
          </a>

          <a
            className="block rounded-xl border border-white/10 bg-white/5 px-4 py-2 hover:bg-white/10"
            href={`/events/${row.slug}/networking`}
            target="_blank"
            rel="noreferrer"
          >
            Networking
          </a>

          <a
            className="block rounded-xl border border-white/10 bg-white/5 px-4 py-2 hover:bg-white/10"
            href={`/events/${row.slug}/on-demand`}
            target="_blank"
            rel="noreferrer"
          >
            On-Demand
          </a>

          <Link
            className="block rounded-xl border border-white/10 bg-white/5 px-4 py-2 hover:bg-white/10"
            href="/admin/sponsors"
          >
            Sponsor Overview
          </Link>

          <Link
            className="block rounded-xl border border-white/10 bg-white/5 px-4 py-2 hover:bg-white/10"
            href="/admin/speakers"
          >
            Speaker Overview
          </Link>

          <div className="pt-2 text-xs text-white/40">
            Sessions are the new system. Breakouts remain available for legacy events.
          </div>
        </aside>
      </div>

      <AdminEventSponsorManager
        eventId={row.id}
        initialSponsors={(row.event_sponsors || []).map((s) => ({
          ...s,
          event_id: s.event_id ?? row.id,
          sort_index: s.sort_index ?? 0,
        }))}
      />
    </div>
  )
}