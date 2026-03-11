"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import AdminHeader from "@/components/admin/AdminHeader"

type EventRow = {
  id: string
  slug: string
  title: string
}

type SessionRow = {
  id: string
  event_id: string
  code: string
  title: string
  description: string | null
  starts_at: string | null
  ends_at: string | null
  presenter: string | null
  join_link: string | null
  room_key: string | null
  manual_live: boolean | null
  playback_type: string | null
  playback_mp4_url: string | null
  playback_m3u8_url: string | null
  sort_order: number | null
  created_at: string | null
  updated_at: string | null
}

type DraftSession = {
  id?: string
  event_id: string
  code: string
  title: string
  description: string
  starts_at: string
  ends_at: string
  presenter: string
  join_link: string
  room_key: string
  manual_live: boolean
  playback_type: string
  playback_mp4_url: string
  playback_m3u8_url: string
  sort_order: number
}

function emptyDraft(eventId: string, sortOrder: number): DraftSession {
  return {
    event_id: eventId,
    code: "",
    title: "",
    description: "",
    starts_at: "",
    ends_at: "",
    presenter: "",
    join_link: "",
    room_key: "",
    manual_live: false,
    playback_type: "",
    playback_mp4_url: "",
    playback_m3u8_url: "",
    sort_order: sortOrder,
  }
}

function toInputDateTime(v: string | null | undefined) {
  if (!v) return ""
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  const year = d.getFullYear()
  const month = pad(d.getMonth() + 1)
  const day = pad(d.getDate())
  const hour = pad(d.getHours())
  const min = pad(d.getMinutes())
  return `${year}-${month}-${day}T${hour}:${min}`
}

function fromInputDateTime(v: string) {
  return v ? new Date(v).toISOString() : null
}

export default function SessionsEditor({
  event,
  initialSessions,
}: {
  event: EventRow
  initialSessions: SessionRow[]
}) {
  const [sessions, setSessions] = useState<SessionRow[]>(initialSessions)
  const [draft, setDraft] = useState<DraftSession>(
    emptyDraft(event.id, initialSessions.length + 1)
  )
  const [saving, setSaving] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [busyCreate, setBusyCreate] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const nextSortOrder = useMemo(() => {
    if (!sessions.length) return 1
    return Math.max(...sessions.map((s) => s.sort_order || 0)) + 1
  }, [sessions])

  function patchSession(id: string, patch: Partial<SessionRow>) {
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...patch } : s))
    )
  }

  async function createSession() {
    setBusyCreate(true)
    setErr(null)
    setMsg(null)

    try {
      const payload = {
        event_id: event.id,
        code: draft.code.trim().toUpperCase(),
        title: draft.title.trim(),
        description: draft.description.trim() || null,
        starts_at: fromInputDateTime(draft.starts_at),
        ends_at: fromInputDateTime(draft.ends_at),
        presenter: draft.presenter.trim() || null,
        join_link: draft.join_link.trim() || null,
        room_key: draft.room_key.trim() || null,
        manual_live: !!draft.manual_live,
        playback_type: draft.playback_type.trim() || null,
        playback_mp4_url: draft.playback_mp4_url.trim() || null,
        playback_m3u8_url: draft.playback_m3u8_url.trim() || null,
        sort_order: Number.isFinite(draft.sort_order) ? draft.sort_order : nextSortOrder,
      }

      if (!payload.code) throw new Error("Session code is required")
      if (!payload.title) throw new Error("Session title is required")

      const res = await fetch("/api/admin/event-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || "Failed to create session")

      setSessions((prev) => [...prev, json.session].sort(sortSessions))
      setDraft(emptyDraft(event.id, nextSortOrder + 1))
      setMsg("Session created")
      setTimeout(() => setMsg(null), 1500)
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to create session")
    } finally {
      setBusyCreate(false)
    }
  }

  async function saveSession(row: SessionRow) {
    setSaving(row.id)
    setErr(null)
    setMsg(null)

    try {
      const payload = {
        id: row.id,
        event_id: row.event_id,
        code: (row.code || "").trim().toUpperCase(),
        title: (row.title || "").trim(),
        description: row.description?.trim() || null,
        starts_at: row.starts_at || null,
        ends_at: row.ends_at || null,
        presenter: row.presenter?.trim() || null,
        join_link: row.join_link?.trim() || null,
        room_key: row.room_key?.trim() || null,
        manual_live: !!row.manual_live,
        playback_type: row.playback_type?.trim() || null,
        playback_mp4_url: row.playback_mp4_url?.trim() || null,
        playback_m3u8_url: row.playback_m3u8_url?.trim() || null,
        sort_order: row.sort_order ?? 0,
      }

      if (!payload.code) throw new Error("Session code is required")
      if (!payload.title) throw new Error("Session title is required")

      const res = await fetch("/api/admin/event-sessions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || "Failed to save session")

      setSessions((prev) =>
        prev.map((s) => (s.id === row.id ? json.session : s)).sort(sortSessions)
      )
      setMsg(`Saved ${payload.code}`)
      setTimeout(() => setMsg(null), 1500)
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to save session")
    } finally {
      setSaving(null)
    }
  }

  async function deleteSession(id: string) {
    const ok = window.confirm("Delete this session?")
    if (!ok) return

    setDeleting(id)
    setErr(null)
    setMsg(null)

    try {
      const res = await fetch("/api/admin/event-sessions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || "Failed to delete session")

      setSessions((prev) => prev.filter((s) => s.id !== id))
      setMsg("Session deleted")
      setTimeout(() => setMsg(null), 1500)
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to delete session")
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Manage Sessions"
        subtitle={`Event: ${event.title}`}
        actions={
          <>
            <Link
              href={`/admin/events/${event.id}`}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 transition"
            >
              Back to Event
            </Link>
            <Link
              href={`/admin/import?eventId=${event.id}`}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 transition"
            >
              Import Registrants
            </Link>
          </>
        }
      />

      {(err || msg) && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          {err ? <div className="text-sm text-red-400">{err}</div> : null}
          {msg ? <div className="text-sm text-emerald-400">{msg}</div> : null}
        </div>
      )}

      <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-xl font-semibold">Add Session</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Field label="Session Code">
            <input
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
              value={draft.code}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))
              }
              placeholder="OPENING"
            />
          </Field>

          <Field label="Title">
            <input
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
              value={draft.title}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, title: e.target.value }))
              }
              placeholder="Opening Session"
            />
          </Field>

          <Field label="Presenter">
            <input
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
              value={draft.presenter}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, presenter: e.target.value }))
              }
              placeholder="Jane Smith"
            />
          </Field>

          <Field label="Start">
            <input
              type="datetime-local"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
              value={draft.starts_at}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, starts_at: e.target.value }))
              }
            />
          </Field>

          <Field label="End">
            <input
              type="datetime-local"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
              value={draft.ends_at}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, ends_at: e.target.value }))
              }
            />
          </Field>

          <Field label="Sort Order">
            <input
              type="number"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
              value={draft.sort_order}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  sort_order: Number(e.target.value || 0),
                }))
              }
            />
          </Field>

          <Field label="Join Link">
            <input
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
              value={draft.join_link}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, join_link: e.target.value }))
              }
              placeholder="https://..."
            />
          </Field>

          <Field label="Room Key">
            <input
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
              value={draft.room_key}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, room_key: e.target.value }))
              }
              placeholder="opening-room"
            />
          </Field>

          <Field label="Playback Type">
            <input
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
              value={draft.playback_type}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, playback_type: e.target.value }))
              }
              placeholder="mp4 / hls / live"
            />
          </Field>

          <Field label="Playback MP4 URL">
            <input
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
              value={draft.playback_mp4_url}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, playback_mp4_url: e.target.value }))
              }
              placeholder="https://..."
            />
          </Field>

          <Field label="Playback M3U8 URL">
            <input
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
              value={draft.playback_m3u8_url}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, playback_m3u8_url: e.target.value }))
              }
              placeholder="https://..."
            />
          </Field>

          <Field label="Manual Live">
            <label className="flex h-[42px] items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
              <input
                type="checkbox"
                checked={draft.manual_live}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, manual_live: e.target.checked }))
                }
              />
              <span className="text-sm text-white/80">Mark as live manually</span>
            </label>
          </Field>
        </div>

        <div className="mt-4">
          <Field label="Description">
            <textarea
              className="min-h-[110px] w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
              value={draft.description}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder="Session description..."
            />
          </Field>
        </div>

        <div className="mt-4">
          <button
            type="button"
            onClick={createSession}
            disabled={busyCreate}
            className="rounded-xl bg-emerald-600 px-4 py-2 font-semibold hover:bg-emerald-500 disabled:opacity-60"
          >
            {busyCreate ? "Creating..." : "Create Session"}
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-xl font-semibold">Existing Sessions</h2>

        {!sessions.length ? (
          <div className="mt-4 text-sm text-white/60">No sessions yet.</div>
        ) : (
          <div className="mt-4 space-y-6">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="rounded-2xl border border-white/10 bg-black/20 p-5"
              >
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <Field label="Session Code">
                    <input
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                      value={session.code || ""}
                      onChange={(e) =>
                        patchSession(session.id, { code: e.target.value.toUpperCase() })
                      }
                    />
                  </Field>

                  <Field label="Title">
                    <input
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                      value={session.title || ""}
                      onChange={(e) =>
                        patchSession(session.id, { title: e.target.value })
                      }
                    />
                  </Field>

                  <Field label="Presenter">
                    <input
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                      value={session.presenter || ""}
                      onChange={(e) =>
                        patchSession(session.id, { presenter: e.target.value })
                      }
                    />
                  </Field>

                  <Field label="Start">
                    <input
                      type="datetime-local"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                      value={toInputDateTime(session.starts_at)}
                      onChange={(e) =>
                        patchSession(session.id, { starts_at: fromInputDateTime(e.target.value) })
                      }
                    />
                  </Field>

                  <Field label="End">
                    <input
                      type="datetime-local"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                      value={toInputDateTime(session.ends_at)}
                      onChange={(e) =>
                        patchSession(session.id, { ends_at: fromInputDateTime(e.target.value) })
                      }
                    />
                  </Field>

                  <Field label="Sort Order">
                    <input
                      type="number"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                      value={session.sort_order ?? 0}
                      onChange={(e) =>
                        patchSession(session.id, { sort_order: Number(e.target.value || 0) })
                      }
                    />
                  </Field>

                  <Field label="Join Link">
                    <input
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                      value={session.join_link || ""}
                      onChange={(e) =>
                        patchSession(session.id, { join_link: e.target.value })
                      }
                    />
                  </Field>

                  <Field label="Room Key">
                    <input
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                      value={session.room_key || ""}
                      onChange={(e) =>
                        patchSession(session.id, { room_key: e.target.value })
                      }
                    />
                  </Field>

                  <Field label="Playback Type">
                    <input
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                      value={session.playback_type || ""}
                      onChange={(e) =>
                        patchSession(session.id, { playback_type: e.target.value })
                      }
                    />
                  </Field>

                  <Field label="Playback MP4 URL">
                    <input
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                      value={session.playback_mp4_url || ""}
                      onChange={(e) =>
                        patchSession(session.id, { playback_mp4_url: e.target.value })
                      }
                    />
                  </Field>

                  <Field label="Playback M3U8 URL">
                    <input
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                      value={session.playback_m3u8_url || ""}
                      onChange={(e) =>
                        patchSession(session.id, { playback_m3u8_url: e.target.value })
                      }
                    />
                  </Field>

                  <Field label="Manual Live">
                    <label className="flex h-[42px] items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                      <input
                        type="checkbox"
                        checked={!!session.manual_live}
                        onChange={(e) =>
                          patchSession(session.id, { manual_live: e.target.checked })
                        }
                      />
                      <span className="text-sm text-white/80">Mark as live manually</span>
                    </label>
                  </Field>
                </div>

                <div className="mt-4">
                  <Field label="Description">
                    <textarea
                      className="min-h-[100px] w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                      value={session.description || ""}
                      onChange={(e) =>
                        patchSession(session.id, { description: e.target.value })
                      }
                    />
                  </Field>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => saveSession(session)}
                    disabled={saving === session.id}
                    className="rounded-xl bg-emerald-600 px-4 py-2 font-semibold hover:bg-emerald-500 disabled:opacity-60"
                  >
                    {saving === session.id ? "Saving..." : "Save Session"}
                  </button>

                  <button
                    type="button"
                    onClick={() => deleteSession(session.id)}
                    disabled={deleting === session.id}
                    className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 font-semibold text-red-200 hover:bg-red-500/20 disabled:opacity-60"
                  >
                    {deleting === session.id ? "Deleting..." : "Delete Session"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="mb-1 text-sm text-white/70">{label}</div>
      {children}
    </div>
  )
}

function sortSessions(a: SessionRow, b: SessionRow) {
  const bySort = (a.sort_order ?? 0) - (b.sort_order ?? 0)
  if (bySort !== 0) return bySort

  const aStart = a.starts_at ? new Date(a.starts_at).getTime() : Number.MAX_SAFE_INTEGER
  const bStart = b.starts_at ? new Date(b.starts_at).getTime() : Number.MAX_SAFE_INTEGER
  return aStart - bStart
}