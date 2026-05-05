"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import AdminHeader from "@/components/admin/AdminHeader"
import { detectMeetingPlatform } from "@/lib/meetingPlatform"
import {
  Video,
  Radio,
  Monitor,
  Users,
} from "lucide-react"

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

  session_kind: string | null
  visibility_mode: string | null
  delivery_mode: string | null
  external_platform: string | null
  external_join_url: string | null
  live_provider: string | null
  live_room_name: string | null
  is_general_session: boolean | null
  runtime_status: string | null
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

  session_kind: string
  visibility_mode: string
  delivery_mode: string
  external_platform: string
  external_join_url: string
  live_provider: string
  live_room_name: string
  is_general_session: boolean
  runtime_status: string
}

type InlineNotice = {
  type: "success" | "error"
  text: string
} | null

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

    session_kind: "session",
    visibility_mode: "assigned",
    delivery_mode: "external",
    external_platform: "",
    external_join_url: "",
    live_provider: "livekit",
    live_room_name: "",
    is_general_session: false,
    runtime_status: "holding",
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

async function parseApiResponse(res: Response) {
  const text = await res.text()
  if (!text) return {}
  try {
    return JSON.parse(text)
  } catch {
    return { error: text }
  }
}

export default function SessionsEditor({
  event,
  eventSlug,
  initialSessions,
}: {
  event: EventRow
  eventSlug: string
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
  const [openSessionIds, setOpenSessionIds] = useState<Record<string, boolean>>({})
  const [sessionNotices, setSessionNotices] = useState<Record<string, InlineNotice>>({})

  const nextSortOrder = useMemo(() => {
    if (!sessions.length) return 1
    return Math.max(...sessions.map((s) => s.sort_order || 0)) + 1
  }, [sessions])

function patchSession(id: string, patch: Partial<SessionRow>) {
  setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  setOpenSessionIds({ [id]: true })
}

function toggleSessionOpen(id: string) {
  setOpenSessionIds((prev) => (prev[id] ? {} : { [id]: true }))
}

  function isSessionOpen(id: string) {
    return !!openSessionIds[id]
  }

  function setSessionNotice(id: string, notice: InlineNotice) {
    setSessionNotices((prev) => ({ ...prev, [id]: notice }))
  }

  function clearSessionNoticeLater(id: string, ms = 1600) {
    window.setTimeout(() => {
      setSessionNotices((prev) => ({ ...prev, [id]: null }))
    }, ms)
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

        session_kind: draft.session_kind || null,
        visibility_mode: draft.visibility_mode || null,
        delivery_mode: draft.delivery_mode || null,
        external_platform: draft.external_platform || null,
        external_join_url: draft.external_join_url.trim() || null,
        live_provider: draft.live_provider || null,
        live_room_name: draft.live_room_name.trim() || null,
        is_general_session: !!draft.is_general_session,
        runtime_status: draft.runtime_status || null,
      }

      if (!payload.code) throw new Error("Session code is required")
      if (!payload.title) throw new Error("Session title is required")

      const res = await fetch("/api/admin/event-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const json = await parseApiResponse(res)
      if (!res.ok) throw new Error(json?.error || `Failed to create session (${res.status})`)
      if (!json?.session) throw new Error("API did not return a session")

      const created = json.session as SessionRow

      setSessions((prev) => [...prev, created].sort(sortSessions))
      setOpenSessionIds((prev) => ({ ...prev, [created.id]: true }))
      setSessionNotice(created.id, { type: "success", text: "Session created" })
      clearSessionNoticeLater(created.id)

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
    setSessionNotice(row.id, null)

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

        session_kind: row.session_kind || null,
        visibility_mode: row.visibility_mode || null,
        delivery_mode: row.delivery_mode || null,
        external_platform: row.external_platform || null,
        external_join_url: row.external_join_url?.trim() || null,
        live_provider: row.live_provider || null,
        live_room_name: row.live_room_name?.trim() || null,
        is_general_session: !!row.is_general_session,
        runtime_status: row.runtime_status || null,
      }

      if (!payload.code) throw new Error("Session code is required")
      if (!payload.title) throw new Error("Session title is required")

      const res = await fetch("/api/admin/event-sessions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const json = await parseApiResponse(res)
      if (!res.ok) throw new Error(json?.error || `Failed to save session (${res.status})`)
      if (!json?.session) throw new Error("API did not return a session")

      setSessions((prev) =>
        prev.map((s) => (s.id === row.id ? json.session : s)).sort(sortSessions)
      )
      setSessionNotice(row.id, { type: "success", text: "Saved" })
      clearSessionNoticeLater(row.id)

      setMsg(`Saved ${payload.code}`)
      setTimeout(() => setMsg(null), 1500)
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to save session"
      setErr(message)
      setSessionNotice(row.id, { type: "error", text: message })
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
    setSessionNotice(id, null)

    try {
const res = await fetch(`/api/admin/sessions/${id}`, {
  method: "DELETE",
})

      const json = await parseApiResponse(res)
      if (!res.ok) throw new Error(json?.error || `Failed to delete session (${res.status})`)

      setSessions((prev) => prev.filter((s) => s.id !== id))
      setMsg("Session deleted")
      setTimeout(() => setMsg(null), 1500)
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to delete session"
      setErr(message)
      setSessionNotice(id, { type: "error", text: message })
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
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm transition hover:bg-white/10"
            >
              Back to Event
            </Link>
            <Link
              href={`/admin/import?eventId=${event.id}`}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm transition hover:bg-white/10"
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
              placeholder="A1"
            />
          </Field>

          <Field label="Title">
            <input
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
              value={draft.title}
              onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Main Stage"
            />
          </Field>

          <Field label="Presenter">
            <input
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
              value={draft.presenter}
              onChange={(e) => setDraft((prev) => ({ ...prev, presenter: e.target.value }))}
              placeholder="Jane Smith"
            />
          </Field>

          <Field label="Session Kind">
            <select
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
              value={draft.session_kind}
              onChange={(e) => setDraft((prev) => ({ ...prev, session_kind: e.target.value }))}
            >
              <option value="session">session</option>
              <option value="general">general</option>
              <option value="networking">networking</option>
              <option value="backstage">backstage</option>
            </select>
          </Field>

          <Field label="Visibility">
            <select
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
              value={draft.visibility_mode}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, visibility_mode: e.target.value }))
              }
            >
              <option value="assigned">assigned</option>
              <option value="all">all</option>
              <option value="open">open</option>
            </select>
          </Field>

          <Field label="Delivery Mode">
            <select
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
              value={draft.delivery_mode}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, delivery_mode: e.target.value }))
              }
            >
              <option value="external">external</option>
              <option value="video">video</option>
              <option value="livekit">livekit</option>
              <option value="rtmp">rtmp</option>
            </select>
          </Field>

          <Field label="Runtime Status">
            <select
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
              value={draft.runtime_status}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, runtime_status: e.target.value }))
              }
            >
              <option value="holding">holding</option>
              <option value="live">live</option>
              <option value="paused">paused</option>
              <option value="ended">ended</option>
            </select>
          </Field>

          <Field label="Start">
            <input
              type="datetime-local"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
              value={draft.starts_at}
              onChange={(e) => setDraft((prev) => ({ ...prev, starts_at: e.target.value }))}
            />
          </Field>

          <Field label="End">
            <input
              type="datetime-local"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
              value={draft.ends_at}
              onChange={(e) => setDraft((prev) => ({ ...prev, ends_at: e.target.value }))}
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

          <Field label="Main Stage">
            <label className="flex h-[42px] items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
              <input
                type="checkbox"
                checked={draft.is_general_session}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, is_general_session: e.target.checked }))
                }
              />
              <span className="text-sm text-white/80">Mark as main stage</span>
            </label>
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

        {draft.delivery_mode === "external" && (
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Field label="External Platform">
              <select
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                value={draft.external_platform}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, external_platform: e.target.value }))
                }
              >
                <option value="">select</option>
                <option value="zoom">zoom</option>
                <option value="teams">teams</option>
                <option value="webex">webex</option>
                <option value="meet">google meet</option>
                <option value="other">other</option>
              </select>
            </Field>

            <Field label="External Join URL">
              <input
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                value={draft.external_join_url}
                onChange={(e) => {
                  const url = e.target.value
                  setDraft((prev) => ({
                    ...prev,
                    external_join_url: url,
                    external_platform: detectMeetingPlatform(url),
                  }))
                }}
                placeholder="https://..."
              />

              {draft.external_platform ? (
                <div className="mt-1 text-xs text-white/50">
                  Detected: {draft.external_platform}
                </div>
              ) : null}
            </Field>
          </div>
        )}

        {draft.delivery_mode === "livekit" && (
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Field label="Live Provider">
              <select
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                value={draft.live_provider}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, live_provider: e.target.value }))
                }
              >
                <option value="livekit">livekit</option>
              </select>
            </Field>

            <Field label="LiveKit Room Name">
              <input
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                value={draft.live_room_name}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, live_room_name: e.target.value }))
                }
                placeholder="event-main-stage"
              />
            </Field>
          </div>
        )}

        {draft.delivery_mode === "video" && (
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Field label="Playback Type">
              <select
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                value={draft.playback_type}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, playback_type: e.target.value }))
                }
              >
                <option value="">select</option>
                <option value="mp4">mp4</option>
                <option value="hls">hls</option>
              </select>
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
          </div>
        )}

        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Field label="Legacy Join Link">
            <input
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
              value={draft.join_link}
              onChange={(e) => setDraft((prev) => ({ ...prev, join_link: e.target.value }))}
              placeholder="https://..."
            />
          </Field>

          <Field label="Legacy Room Key">
            <input
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
              value={draft.room_key}
              onChange={(e) => setDraft((prev) => ({ ...prev, room_key: e.target.value }))}
              placeholder="room-key"
            />
          </Field>
        </div>

        <div className="mt-4">
          <Field label="Description">
            <textarea
              className="min-h-[110px] w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
              value={draft.description}
              onChange={(e) => setDraft((prev) => ({ ...prev, description: e.target.value }))}
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
          <div className="mt-4 space-y-4">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="overflow-hidden rounded-2xl border border-white/10 bg-black/20"
              >
                <button
                  type="button"
                  onClick={() => toggleSessionOpen(session.id)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-white/5"
                >
                  <div className="min-w-0">
<div className="flex flex-wrap items-center gap-2">
  <HeaderBadge>{session.code || "—"}</HeaderBadge>
{session.runtime_status === "live" ? (
  <HeaderBadge tone="red" icon={<LiveDot />}>
    LIVE
  </HeaderBadge>
) : null}
  {session.is_general_session ? (
    <HeaderBadge tone="sky" icon={<Users size={12} />}>
      Main Stage
    </HeaderBadge>
  ) : null}

  {session.delivery_mode === "external" && session.external_platform === "zoom" ? (
    <HeaderBadge tone="blue" icon={<Video size={12} />}>
      Zoom
    </HeaderBadge>
  ) : null}

  {session.delivery_mode === "external" && session.external_platform === "teams" ? (
    <HeaderBadge tone="violet" icon={<Users size={12} />}>
      Teams
    </HeaderBadge>
  ) : null}

  {session.delivery_mode === "external" && session.external_platform === "webex" ? (
    <HeaderBadge tone="green" icon={<Monitor size={12} />}>
      Webex
    </HeaderBadge>
  ) : null}

  {session.delivery_mode === "external" &&
  session.external_platform &&
  !["zoom", "teams", "webex"].includes(session.external_platform) ? (
    <HeaderBadge icon={<Monitor size={12} />}>
      {session.external_platform}
    </HeaderBadge>
  ) : null}

  {session.delivery_mode === "livekit" ? (
    <HeaderBadge tone="sky" icon={<Radio size={12} />}>
      LiveKit
    </HeaderBadge>
  ) : null}

  {session.delivery_mode === "video" ? (
    <HeaderBadge icon={<Video size={12} />}>
      Video
    </HeaderBadge>
  ) : null}

  {session.delivery_mode === "rtmp" ? (
    <HeaderBadge icon={<Radio size={12} />}>
      RTMP
    </HeaderBadge>
  ) : null}
</div>

<div className="mt-2 truncate text-base font-semibold text-white">
  {session.title || "Untitled Session"}
</div>

<div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-white/40">
  <span>ID: {session.id}</span>

  <button
    type="button"
    onClick={(e) => {
      e.stopPropagation()
      void navigator.clipboard.writeText(session.id)
      setSessionNotice(session.id, { type: "success", text: "Session ID copied" })
      clearSessionNoticeLater(session.id)
    }}
    className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-white/60 transition hover:bg-white/10"
    title="Copy session ID"
  >
    Copy ID
  </button>
</div>

<div className="mt-1 text-sm text-white/50">
  {session.visibility_mode || "assigned"} {" • "} {session.runtime_status || "holding"}
</div>
                  </div>

<div className="flex shrink-0 items-center gap-3">
  <Link
    href={`/admin/events/${event.id}/sessions/${session.id}/producer`}
    target="_blank"
    rel="noreferrer"
    onClick={(e) => e.stopPropagation()}
    className="rounded-lg border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-sm font-medium text-cyan-200 transition hover:bg-cyan-400/20"
  >
    Produce
  </Link>

  <Link
    href={`/presenter/${eventSlug}/sessions/${session.id}`}
    target="_blank"
    rel="noreferrer"
    onClick={(e) => e.stopPropagation()}
    className="rounded-lg border border-violet-300/25 bg-violet-500/10 px-3 py-1.5 text-sm font-medium text-violet-200 transition hover:bg-violet-500/20"
  >
    Presenter
  </Link>

  <button
    type="button"
    onClick={(e) => {
      e.stopPropagation()
      void deleteSession(session.id)
    }}
    disabled={deleting === session.id}
    className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-sm font-medium text-red-200 transition hover:bg-red-500/20 disabled:opacity-60"
  >
    {deleting === session.id ? "Deleting..." : "Delete"}
  </button>

  <div className="text-sm text-white/60">
    {isSessionOpen(session.id) ? "Hide ▲" : "Edit ▼"}
  </div>
</div>
                </button>

<div
  className={`grid overflow-hidden transition-all duration-300 ease-out ${
    isSessionOpen(session.id)
      ? "grid-rows-[1fr] opacity-100"
      : "grid-rows-[0fr] opacity-0"
  }`}
>
  <div className="min-h-0">
    <div
      className={`border-t border-white/10 p-5 transition-all duration-300 ease-out ${
        isSessionOpen(session.id) ? "translate-y-0" : "-translate-y-1"
      }`}
    >
      {sessionNotices[session.id] ? (
        <div className="mb-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
          <div
            className={`text-sm ${
              sessionNotices[session.id]?.type === "success"
                ? "text-emerald-400"
                : "text-red-400"
            }`}
          >
            {sessionNotices[session.id]?.text}
          </div>
        </div>
      ) : null}

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
                          onChange={(e) => patchSession(session.id, { title: e.target.value })}
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

                      <Field label="Session Kind">
                        <select
                          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                          value={session.session_kind || "session"}
                          onChange={(e) =>
                            patchSession(session.id, { session_kind: e.target.value })
                          }
                        >
                          <option value="session">session</option>
                          <option value="general">general</option>
                          <option value="networking">networking</option>
                          <option value="backstage">backstage</option>
                        </select>
                      </Field>

                      <Field label="Visibility">
                        <select
                          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                          value={session.visibility_mode || "assigned"}
                          onChange={(e) =>
                            patchSession(session.id, { visibility_mode: e.target.value })
                          }
                        >
                          <option value="assigned">assigned</option>
                          <option value="all">all</option>
                          <option value="open">open</option>
                        </select>
                      </Field>

                      <Field label="Delivery Mode">
                        <select
                          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                          value={session.delivery_mode || "external"}
                          onChange={(e) =>
                            patchSession(session.id, { delivery_mode: e.target.value })
                          }
                        >
                          <option value="external">external</option>
                          <option value="video">video</option>
                          <option value="livekit">livekit</option>
                          <option value="rtmp">rtmp</option>
                        </select>
                      </Field>

                      <Field label="Runtime Status">
                        <select
                          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                          value={session.runtime_status || "holding"}
                          onChange={(e) =>
                            patchSession(session.id, { runtime_status: e.target.value })
                          }
                        >
                          <option value="holding">holding</option>
                          <option value="live">live</option>
                          <option value="paused">paused</option>
                          <option value="ended">ended</option>
                        </select>
                      </Field>

                      <Field label="Start">
                        <input
                          type="datetime-local"
                          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                          value={toInputDateTime(session.starts_at)}
                          onChange={(e) =>
                            patchSession(session.id, {
                              starts_at: fromInputDateTime(e.target.value),
                            })
                          }
                        />
                      </Field>

                      <Field label="End">
                        <input
                          type="datetime-local"
                          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                          value={toInputDateTime(session.ends_at)}
                          onChange={(e) =>
                            patchSession(session.id, {
                              ends_at: fromInputDateTime(e.target.value),
                            })
                          }
                        />
                      </Field>

                      <Field label="Sort Order">
                        <input
                          type="number"
                          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                          value={session.sort_order ?? 0}
                          onChange={(e) =>
                            patchSession(session.id, {
                              sort_order: Number(e.target.value || 0),
                            })
                          }
                        />
                      </Field>

                      <Field label="Main Stage">
                        <label className="flex h-[42px] items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                          <input
                            type="checkbox"
                            checked={!!session.is_general_session}
                            onChange={(e) =>
                              patchSession(session.id, { is_general_session: e.target.checked })
                            }
                          />
                          <span className="text-sm text-white/80">Main stage</span>
                        </label>
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

                    {session.delivery_mode === "external" && (
                      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        <Field label="External Platform">
                          <select
                            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                            value={session.external_platform || ""}
                            onChange={(e) =>
                              patchSession(session.id, { external_platform: e.target.value })
                            }
                          >
                            <option value="">select</option>
                            <option value="zoom">zoom</option>
                            <option value="teams">teams</option>
                            <option value="webex">webex</option>
                            <option value="meet">google meet</option>
                            <option value="other">other</option>
                          </select>
                        </Field>

                        <Field label="External Join URL">
                          <input
                            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                            value={session.external_join_url || ""}
                            onChange={(e) => {
                              const url = e.target.value
                              patchSession(session.id, {
                                external_join_url: url,
                                external_platform: detectMeetingPlatform(url),
                              })
                            }}
                            placeholder="https://..."
                          />

                          {session.external_platform ? (
                            <div className="mt-1 text-xs text-white/50">
                              Detected: {session.external_platform}
                            </div>
                          ) : null}
                        </Field>
                      </div>
                    )}

                    {session.delivery_mode === "livekit" && (
                      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        <Field label="Live Provider">
                          <select
                            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                            value={session.live_provider || "livekit"}
                            onChange={(e) =>
                              patchSession(session.id, { live_provider: e.target.value })
                            }
                          >
                            <option value="livekit">livekit</option>
                          </select>
                        </Field>

                        <Field label="LiveKit Room Name">
                          <input
                            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                            value={session.live_room_name || ""}
                            onChange={(e) =>
                              patchSession(session.id, { live_room_name: e.target.value })
                            }
                            placeholder="event-main-stage"
                          />
                        </Field>
                      </div>
                    )}

                    {session.delivery_mode === "video" && (
                      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        <Field label="Playback Type">
                          <select
                            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                            value={session.playback_type || ""}
                            onChange={(e) =>
                              patchSession(session.id, { playback_type: e.target.value })
                            }
                          >
                            <option value="">select</option>
                            <option value="mp4">mp4</option>
                            <option value="hls">hls</option>
                          </select>
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
                      </div>
                    )}

                    <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      <Field label="Legacy Join Link">
                        <input
                          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                          value={session.join_link || ""}
                          onChange={(e) =>
                            patchSession(session.id, { join_link: e.target.value })
                          }
                        />
                      </Field>

                      <Field label="Legacy Room Key">
                        <input
                          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                          value={session.room_key || ""}
                          onChange={(e) =>
                            patchSession(session.id, { room_key: e.target.value })
                          }
                        />
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
                </div>
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
function HeaderBadge({
  children,
  tone = "default",
  icon,
}: {
  children: React.ReactNode
  tone?: "default" | "sky" | "blue" | "violet" | "green" | "red"
  icon?: React.ReactNode
}) {
  const toneClass =
    tone === "sky"
      ? "border-sky-400/20 bg-sky-400/10 text-sky-200"
      : tone === "blue"
        ? "border-blue-400/20 bg-blue-400/10 text-blue-200"
        : tone === "violet"
          ? "border-violet-400/20 bg-violet-400/10 text-violet-200"
: tone === "green"
  ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
  : tone === "red"
    ? "border-red-400/30 bg-red-500/10 text-red-300"
    : "border-white/10 bg-white/10 text-white/80"

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${toneClass}`}
    >
      {icon ? <span className="opacity-80">{icon}</span> : null}
      {children}
    </span>
  )
}
function LiveDot() {
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
    </span>
  )
}
function sortSessions(a: SessionRow, b: SessionRow) {
  const bySort = (a.sort_order ?? 0) - (b.sort_order ?? 0)
  if (bySort !== 0) return bySort

  const aStart = a.starts_at ? new Date(a.starts_at).getTime() : Number.MAX_SAFE_INTEGER
  const bStart = b.starts_at ? new Date(b.starts_at).getTime() : Number.MAX_SAFE_INTEGER
  return aStart - bStart
}