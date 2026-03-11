"use client"

import { useState } from "react"
import Link from "next/link"

import AdminEventSponsorManager from "@/components/admin/AdminEventSponsorManager"
import AdminEventScaffoldButton from "@/components/admin/AdminEventScaffoldButton"
import AdminDateTimeField from "@/components/admin/AdminDateTimeField"
import AdminRefreshButton from "@/components/admin/AdminRefreshButton"
import AdminEventLiveStatePanel from "@/components/admin/AdminEventLiveStatePanel"
import AdminLogoutButton from "@/components/admin/AdminLogoutButton"

import type {
  EventBreakout,
  EventLiveStateRecord,
  EventSponsorRecord,
} from "@/lib/types"

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
  directorHref,
}: {
  initial: EventRow
  initialBreakouts: EventBreakout[]
  initialLiveState: EventLiveStateRecord | null
  importRegistrantsHref?: string
  directorHref?: string
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

      {/* HEADER */}
      <div className="flex items-center justify-between gap-4">

        <div>
          <h1 className="text-3xl font-bold">{row.title}</h1>
          <div className="mt-1 text-sm text-white/60">/{row.slug}</div>
        </div>

        <div className="flex flex-wrap gap-2 items-center">

          <Link
            href="/admin/events"
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 hover:bg-white/10"
          >
            Back
          </Link>

          {directorHref && (
            <Link
              href={directorHref}
              className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-2 font-semibold text-cyan-100 hover:bg-cyan-500/20"
            >
              Director Mode
            </Link>
          )}

          {importRegistrantsHref && (
            <Link
              href={importRegistrantsHref}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 hover:bg-white/10"
            >
              Import Registrants
            </Link>
          )}

          <a
            href={`/events/${row.slug}/lobby`}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl bg-indigo-600 px-4 py-2 font-semibold hover:bg-indigo-500"
          >
            Open Lobby →
          </a>

          <AdminRefreshButton scopeType="event" scopeId={row.id} />

          {/* LOGOUT BUTTON */}
          <AdminLogoutButton />

        </div>
      </div>


      {/* LIVE STATE CONTROL PANEL */}
      <AdminEventLiveStatePanel
        eventId={row.id}
        eventSlug={row.slug}
        breakouts={initialBreakouts}
        initialLiveState={initialLiveState}
      />


      <div className="grid gap-6 lg:grid-cols-3">

        {/* MAIN EVENT SETTINGS */}
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
            />

            <AdminDateTimeField
              label="Event end"
              value={row.end_at}
              onChange={(next) =>
                setRow((prev) => ({ ...prev, end_at: next }))
              }
              disabled={busy}
            />

          </div>

          {err && <div className="text-sm text-red-400">{err}</div>}
          {msg && <div className="text-sm text-emerald-400">{msg}</div>}

          <button
            disabled={busy}
            onClick={save}
            className="rounded-xl bg-emerald-600 px-4 py-2 font-semibold hover:bg-emerald-500 disabled:opacity-60"
          >
            Save
          </button>

        </section>


        {/* SIDEBAR */}
        <aside className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-6">

          <AdminEventScaffoldButton eventId={row.id} />
          <AdminRefreshButton scopeType="event" scopeId={row.id} />

          <div className="text-sm text-white/60">Build your event</div>

          {directorHref && (
            <Link
              className="block rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-2 font-semibold text-cyan-100 hover:bg-cyan-500/20"
              href={directorHref}
            >
              Director Mode
            </Link>
          )}

          {importRegistrantsHref && (
            <Link
              className="block rounded-xl border border-white/10 bg-white/5 px-4 py-2 hover:bg-white/10"
              href={importRegistrantsHref}
            >
              Import Registrants CSV
            </Link>
          )}

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