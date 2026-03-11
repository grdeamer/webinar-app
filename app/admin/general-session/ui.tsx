"use client"

import React from "react"
import MultiviewControl from "./MultiviewControl"
import ThemePanel from "./ThemePanel"
import LowerPanelUploader from "./LowerPanelUploader"
import { createClient } from "@supabase/supabase-js"
import AdminDateTimeField from "@/components/admin/AdminDateTimeField"

type PublishState = "draft" | "published" | "scheduled"

type SettingsRow = {
  id: number
  title: string | null
  source_type: "mp4" | "m3u8" | "rtmp"
  mp4_path: string | null
  m3u8_url: string | null
  rtmp_url: string | null
  poster_url: string | null
  client_logo_path?: string | null
  client_logo_position?: "left" | "center" | "right" | null
  is_published: boolean | null
  publish_state?: PublishState | null
  publish_at?: string | null
  presenter_key?: string | null
  updated_at: string | null
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function AdminGeneralSessionEditor({ initial }: { initial: SettingsRow }) {
  const [title, setTitle] = React.useState(initial.title ?? "General Session")
  const [sourceType, setSourceType] = React.useState<SettingsRow["source_type"]>(
    initial.source_type ?? "mp4"
  )
  const [m3u8Url, setM3u8Url] = React.useState(initial.m3u8_url ?? "")
  const [rtmpUrl, setRtmpUrl] = React.useState(initial.rtmp_url ?? "")
  const [posterUrl, setPosterUrl] = React.useState(initial.poster_url ?? "")

  const [clientLogoFile, setClientLogoFile] = React.useState<File | null>(null)
  const [clientLogoPath, setClientLogoPath] = React.useState<string>(
    initial.client_logo_path ?? ""
  )
  const [currentClientLogoPath, setCurrentClientLogoPath] = React.useState<string | null>(
    initial.client_logo_path ?? null
  )
  const [clientLogoPosition, setClientLogoPosition] = React.useState<
    "left" | "center" | "right"
  >(initial.client_logo_position ?? "left")

  const [published, setPublished] = React.useState(Boolean(initial.is_published))

  const [publishState, setPublishState] = React.useState<PublishState>(
    (initial.publish_state as PublishState) ?? (published ? "published" : "draft")
  )
  const [publishAtIso, setPublishAtIso] = React.useState<string | null>(
    initial.publish_at ?? null
  )
  const [presenterKey, setPresenterKey] = React.useState<string | null>(
    initial.presenter_key ?? null
  )

  const [mp4File, setMp4File] = React.useState<File | null>(null)
  const [currentMp4Path, setCurrentMp4Path] = React.useState<string | null>(
    initial.mp4_path ?? null
  )

  const [busy, setBusy] = React.useState(false)
  const [status, setStatus] = React.useState<string>("")

  const [gateState, setGateState] = React.useState<"holding" | "live" | "paused" | "ended">(
    "holding"
  )
  const [gateMessage, setGateMessage] = React.useState<string>("")
  const [viewers, setViewers] = React.useState<
    { session_id: string; user_id: string | null; user_email: string | null; last_seen_at: string }[]
  >([])

  const [programKind, setProgramKind] = React.useState<"video" | "slides">("video")
  const [lowerThirdName, setLowerThirdName] = React.useState<string>("")
  const [lowerThirdTitle, setLowerThirdTitle] = React.useState<string>("")
  const [lowerThirdActive, setLowerThirdActive] = React.useState<boolean>(false)

  const [slides, setSlides] = React.useState<
    { id: string; name: string; slide_path: string; created_at: string }[]
  >([])
  const [selectedSlidePath, setSelectedSlidePath] = React.useState<string>("")
  const [currentSlideId, setCurrentSlideId] = React.useState<string | null>(null)
  const [slideUploading, setSlideUploading] = React.useState(false)

  async function loadProgram() {
    try {
      const res = await fetch("/api/admin/general-session/program", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get" }),
      })
      const j = await res.json().catch(() => ({}))
      if (res.ok && j?.program) {
        const p = j.program
        setProgramKind(p?.program_kind || "video")
        setCurrentSlideId(p?.program_slide_id || null)
        if (p?.program_slide_path) setSelectedSlidePath(p.program_slide_path)
        setLowerThirdActive(Boolean(p?.lower_third_active))
        setLowerThirdName(p?.lower_third_name || "")
        setLowerThirdTitle(p?.lower_third_title || "")
      }
    } catch {
      // ignore
    }
  }

  async function pushSlide(action: "set" | "next" | "prev") {
    setBusy(true)
    setStatus(
      action === "set"
        ? "Pushing slide..."
        : action === "next"
          ? "Next slide..."
          : "Previous slide..."
    )
    try {
      const payload: any = { action }
      if (action === "set") {
        const slide = slides.find((s) => s.slide_path === selectedSlidePath)
        if (!slide) throw new Error("Select a slide first")
        payload.slide_id = slide.id
      }
      const res = await fetch("/api/admin/general-session/slides/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.error || "Failed")
      if (j?.slide?.id) setCurrentSlideId(j.slide.id)
      setProgramKind("slides")
      setStatus("Slide pushed to attendees ✅")
      await loadProgram()
    } catch (e: any) {
      setStatus(`❌ ${e?.message || "Failed"}`)
    } finally {
      setBusy(false)
    }
  }

  async function loadSlides() {
    try {
      const res = await fetch("/api/admin/general-session/slides", { cache: "no-store" })
      const j = await res.json().catch(() => ({}))
      if (res.ok) {
        const list = Array.isArray(j?.slides) ? j.slides : []
        setSlides(list)
        if (!selectedSlidePath && list[0]?.slide_path) {
          setSelectedSlidePath(list[0].slide_path)
        }
      }
    } catch {
      // ignore
    }
  }

  async function takeVideoToProgram() {
    setBusy(true)
    setStatus("Taking VIDEO to program...")
    try {
      const res = await fetch("/api/admin/general-session/program", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "take_video" }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.error || "Failed")
      setProgramKind("video")
      setStatus("Program is now VIDEO ✅")
    } catch (e: any) {
      setStatus(`❌ ${e?.message || "Failed"}`)
    } finally {
      setBusy(false)
    }
  }

  async function takeSlideToProgram() {
    if (!selectedSlidePath) {
      setStatus("Select a slide first")
      return
    }
    setBusy(true)
    setStatus("Taking SLIDES to program...")
    try {
      const res = await fetch("/api/admin/general-session/program", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "take_slide", slide_path: selectedSlidePath }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.error || "Failed")
      setProgramKind("slides")
      setStatus("Program is now SLIDES ✅")
    } catch (e: any) {
      setStatus(`❌ ${e?.message || "Failed"}`)
    } finally {
      setBusy(false)
    }
  }

  async function takeLowerThird() {
    if (!lowerThirdName.trim()) {
      setStatus("Lower-third name is required")
      return
    }
    setBusy(true)
    setStatus("Taking LOWER THIRD...")
    try {
      const res = await fetch("/api/admin/general-session/program", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "set_lower_third",
          name: lowerThirdName,
          title: lowerThirdTitle,
        }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.error || "Failed")
      setLowerThirdActive(true)
      setStatus("Lower third LIVE ✅")
    } catch (e: any) {
      setStatus(`❌ ${e?.message || "Failed"}`)
    } finally {
      setBusy(false)
    }
  }

  async function clearLowerThird() {
    setBusy(true)
    setStatus("Clearing lower third...")
    try {
      const res = await fetch("/api/admin/general-session/program", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clear_lower_third" }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.error || "Failed")
      setLowerThirdActive(false)
      setStatus("Lower third cleared ✅")
    } catch (e: any) {
      setStatus(`❌ ${e?.message || "Failed"}`)
    } finally {
      setBusy(false)
    }
  }

  async function loadControl() {
    const res = await fetch("/api/admin/general-session/control", { cache: "no-store" })
    const j = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(j?.error || "Failed to load control")
    setGateState(j?.control?.state || "holding")
    setGateMessage(j?.control?.message || "")
  }

  async function saveControl(nextState: "holding" | "live" | "paused" | "ended") {
    setBusy(true)
    setStatus("Updating control room...")
    try {
      const res = await fetch("/api/admin/general-session/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: nextState, message: gateMessage }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.error || "Failed to update control")
      setGateState(j?.control?.state || nextState)
      setGateMessage(j?.control?.message || gateMessage)
      setStatus("Control updated ✅")
    } catch (e: any) {
      setStatus(`❌ ${e?.message || "Unexpected error"}`)
    } finally {
      setBusy(false)
    }
  }

  async function refreshViewers() {
    try {
      const res = await fetch(`/api/admin/general-session/viewers?room_key=general`, {
        cache: "no-store",
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.error || "Failed to load viewers")
      setViewers(j?.viewers || [])
    } catch {
      // keep silent; viewers isn't critical
    }
  }

  async function kick(session_id: string) {
    if (!session_id) return
    setBusy(true)
    setStatus("Removing viewer...")
    try {
      const res = await fetch("/api/admin/general-session/kick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room_key: "general", session_id }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.error || "Kick failed")
      setStatus("Viewer removed ✅")
      refreshViewers()
    } catch (e: any) {
      setStatus(`❌ ${e?.message || "Unexpected error"}`)
    } finally {
      setBusy(false)
    }
  }

  React.useEffect(() => {
    loadControl().catch(() => {})
    refreshViewers()
    loadProgram()
    loadSlides()

    const id = setInterval(refreshViewers, 10_000)
    return () => clearInterval(id)
  }, [])

  const attendeeLink = "/general-session"
  const presenterLink = presenterKey
    ? `/general-session?presenter=1&key=${encodeURIComponent(presenterKey)}`
    : ""

  const statusPill = React.useMemo(() => {
    if (publishState === "scheduled") return { label: "SCHEDULED", tone: "amber" as const }
    if (published) return { label: "PUBLISHED", tone: "emerald" as const }
    return { label: "DRAFT", tone: "zinc" as const }
  }, [publishState, published])

  const canSave = React.useMemo(() => {
    if (sourceType === "m3u8") return Boolean(m3u8Url.trim())
    if (sourceType === "rtmp") return Boolean(rtmpUrl.trim())
    if (sourceType === "mp4") return Boolean(mp4File) || Boolean(currentMp4Path)
    return false
  }, [sourceType, m3u8Url, rtmpUrl, mp4File, currentMp4Path])

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setStatus("Copied ✅")
      setTimeout(() => setStatus(""), 900)
    } catch {
      setStatus("Copy failed (browser blocked) ❌")
    }
  }

  async function uploadMp4IfNeeded(): Promise<string | null> {
    if (sourceType !== "mp4") return null
    if (!mp4File) return currentMp4Path

    const nameOk = mp4File.name.toLowerCase().endsWith(".mp4")
    const typeOk = mp4File.type === "video/mp4" || mp4File.type === ""
    if (!nameOk && !typeOk) throw new Error("Please select a valid .mp4 file.")

    const signRes = await fetch("/api/admin/general-session/mp4/sign-upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileName: mp4File.name, fileSize: mp4File.size }),
    })
    const signJson = await signRes.json()
    if (!signRes.ok) throw new Error(signJson?.error || "Failed to sign upload")

    const { path, token } = signJson as { path: string; token: string }
    if (!path || !token) throw new Error("Upload signer returned invalid data")

    const { error: upErr } = await supabase.storage
      .from("private")
      .uploadToSignedUrl(path, token, mp4File, {
        contentType: "video/mp4",
        upsert: true,
      })

    if (upErr) throw new Error(upErr.message)

    setCurrentMp4Path(path)
    setMp4File(null)
    return path
  }

  async function uploadClientLogoIfNeeded(): Promise<string | null> {
    if (!clientLogoFile) return clientLogoPath.trim() || currentClientLogoPath || null

    const ext = clientLogoFile.name.split(".").pop()?.toLowerCase() || ""
    const allowed = ["png", "jpg", "jpeg", "webp", "svg"]
    if (!allowed.includes(ext)) {
      throw new Error("Logo must be PNG, JPG, JPEG, WEBP, or SVG.")
    }

    const signRes = await fetch("/api/admin/general-session/client-logo/sign-upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: clientLogoFile.name,
        fileSize: clientLogoFile.size,
      }),
    })

    const signJson = await signRes.json().catch(() => ({}))
    if (!signRes.ok) throw new Error(signJson?.error || "Failed to sign logo upload")

    const { path, token } = signJson as { path: string; token: string }
    if (!path || !token) throw new Error("Logo upload signer returned invalid data")

    const contentType =
      clientLogoFile.type ||
      (ext === "svg"
        ? "image/svg+xml"
        : ext === "png"
          ? "image/png"
          : ext === "webp"
            ? "image/webp"
            : "image/jpeg")

    const { error: upErr } = await supabase.storage
      .from("private")
      .uploadToSignedUrl(path, token, clientLogoFile, {
        contentType,
        upsert: true,
      })

    if (upErr) throw new Error(upErr.message)

    setCurrentClientLogoPath(path)
    setClientLogoPath(path)
    setClientLogoFile(null)
    return path
  }

  async function ensurePresenterKey() {
    if (presenterKey) return presenterKey
    setBusy(true)
    setStatus("Generating presenter link...")
    try {
      const res = await fetch("/api/admin/general-session/presenter-key", { method: "POST" })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || "Failed to generate presenter key")
      setPresenterKey(json.presenter_key)
      setStatus("Presenter link ready ✅")
      return json.presenter_key as string
    } finally {
      setBusy(false)
    }
  }

  async function save(override?: Partial<{ is_published: boolean; publish_state: PublishState }>) {
    setBusy(true)
    setStatus("Saving...")

    try {
      let mp4_path: string | null = currentMp4Path ?? null
      if (sourceType === "mp4") mp4_path = await uploadMp4IfNeeded()

      const uploadedLogoPath = await uploadClientLogoIfNeeded()

      const nextPublished = override?.is_published ?? published
      const nextState = override?.publish_state ?? publishState

      let publish_at: string | null = null
      if (nextState === "scheduled") {
        if (!publishAtIso) throw new Error("Pick a schedule time first.")
        publish_at = publishAtIso
      }

      const payload = {
        title: title.trim() || "General Session",
        poster_url: posterUrl.trim() || null,
        client_logo_path: uploadedLogoPath,
        client_logo_position: clientLogoPosition,

        source_type: sourceType,
        mp4_path: sourceType === "mp4" ? mp4_path : null,
        m3u8_url: sourceType === "m3u8" ? m3u8Url.trim() : null,
        rtmp_url: sourceType === "rtmp" ? rtmpUrl.trim() : null,

        is_published: nextPublished,
        publish_state: nextState,
        publish_at,
        presenter_key: presenterKey,
      }

      const res = await fetch("/api/admin/general-session/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || "Save failed")

      const saved = json.settings as SettingsRow

      setTitle(saved.title ?? "General Session")
      setPosterUrl(saved.poster_url ?? "")
      setClientLogoPath(saved.client_logo_path ?? "")
      setCurrentClientLogoPath(saved.client_logo_path ?? null)
      setClientLogoPosition(saved.client_logo_position ?? "left")

      setSourceType(saved.source_type)
      setM3u8Url(saved.m3u8_url ?? "")
      setRtmpUrl(saved.rtmp_url ?? "")
      setCurrentMp4Path(saved.mp4_path ?? null)

      setPublished(Boolean(saved.is_published))
      setPublishState(
        (saved.publish_state as PublishState) ?? (saved.is_published ? "published" : "draft")
      )
      setPublishAtIso(saved.publish_at ?? null)
      setPresenterKey(saved.presenter_key ?? null)

      setStatus("Saved ✅")
    } catch (e: any) {
      setStatus(`❌ ${e?.message || "Unexpected error"}`)
    } finally {
      setBusy(false)
    }
  }

  const logoPreviewAlign =
    clientLogoPosition === "center"
      ? "justify-center"
      : clientLogoPosition === "right"
        ? "justify-end"
        : "justify-start"

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span
                className={[
                  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold",
                  statusPill.tone === "emerald"
                    ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-200"
                    : statusPill.tone === "amber"
                      ? "border-amber-400/25 bg-amber-500/10 text-amber-200"
                      : "border-white/10 bg-white/5 text-white/70",
                ].join(" ")}
              >
                {statusPill.label}
              </span>

              <div className="truncate text-sm text-white/70">
                {title || "General Session"}
              </div>
            </div>

            <div className="mt-1 text-xs text-white/50">
              Attendee link: <span className="font-mono">{attendeeLink}</span>
              {presenterKey ? (
                <>
                  {" "}
                  • Presenter: <span className="font-mono">{presenterLink}</span>
                </>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href="/general-session"
              target="_blank"
              rel="noreferrer"
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
            >
              Preview ↗
            </a>

            <button
              onClick={() => copy(attendeeLink)}
              disabled={busy}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10 disabled:opacity-60"
            >
              Copy attendee link
            </button>

            <button
              onClick={async () => {
                const key = await ensurePresenterKey()
                await copy(`/general-session?presenter=1&key=${encodeURIComponent(key)}`)
              }}
              disabled={busy}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10 disabled:opacity-60"
            >
              Copy presenter link
            </button>

            {published ? (
              <button
                onClick={() => save({ is_published: false, publish_state: "draft" })}
                disabled={busy}
                className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60"
              >
                Unpublish
              </button>
            ) : (
              <button
                onClick={() => save({ is_published: true, publish_state: "published" })}
                disabled={busy || !canSave}
                className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60"
                title={!canSave ? "Set a valid source first (MP4 or M3U8/RTMP URL)" : ""}
              >
                Publish
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-[220px_1fr_auto]">
          <div className="grid gap-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-white/40">
              Publish mode
            </label>
            <select
              value={publishState}
              onChange={(e) => setPublishState(e.target.value as PublishState)}
              disabled={busy}
              className="rounded-xl border border-white/15 bg-slate-950 px-3 py-2 text-sm"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="scheduled">Scheduled</option>
            </select>
          </div>

          <div className="grid gap-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-white/40">
              Schedule time
            </label>
            <AdminDateTimeField
              label="Publish at"
              value={publishAtIso}
              onChange={setPublishAtIso}
              disabled={busy || publishState !== "scheduled"}
              helperText="When scheduled, attendees can’t view until it publishes. (We’ll add an auto-publisher next.)"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={() => save()}
              disabled={!canSave || busy}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 disabled:opacity-60"
            >
              Save settings
            </button>
          </div>
        </div>

        {status ? <div className="mt-3 text-sm text-white/70">{status}</div> : null}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="grid gap-2">
          <label className="text-sm text-white/70">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded-xl border border-white/15 bg-slate-950 px-3 py-2"
            disabled={busy}
          />
        </div>

        <div className="mt-6 grid gap-2">
          <label className="text-sm text-white/70">Source Type</label>

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={sourceType === "mp4"}
                onChange={() => setSourceType("mp4")}
                disabled={busy}
              />
              <span>MP4 Upload</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={sourceType === "m3u8"}
                onChange={() => setSourceType("m3u8")}
                disabled={busy}
              />
              <span>HLS Playback (.m3u8)</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={sourceType === "rtmp"}
                onChange={() => setSourceType("rtmp")}
                disabled={busy}
              />
              <span>RTMP Ingest (store URL)</span>
            </label>
          </div>
        </div>

        <div className="mt-6 grid gap-2">
          <label className="text-sm text-white/70">Poster Image URL (optional)</label>
          <input
            value={posterUrl}
            onChange={(e) => setPosterUrl(e.target.value)}
            placeholder="https://…"
            className="rounded-xl border border-white/15 bg-slate-950 px-3 py-2"
            disabled={busy}
          />
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950 p-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Client Branding</h3>
              <p className="mt-1 text-xs text-white/60">
                Logo shown in the white band above the General Session player.
              </p>
            </div>

            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
              Header logo
            </span>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="grid gap-3">
              <div className="grid gap-2">
                <label className="text-sm text-white/70">Upload Logo</label>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={(e) => setClientLogoFile(e.target.files?.[0] ?? null)}
                  className="rounded-xl border border-white/15 bg-slate-950 px-3 py-2"
                  disabled={busy}
                />
                <p className="text-xs text-white/50">
                  PNG, JPG, WEBP, or SVG. Best results: transparent PNG or SVG.
                </p>
              </div>

              <div className="grid gap-2">
                <label className="text-sm text-white/70">Current Logo Path</label>
                <input
                  value={clientLogoPath}
                  onChange={(e) => setClientLogoPath(e.target.value)}
                  placeholder="Supabase storage path or image URL"
                  className="rounded-xl border border-white/15 bg-slate-950 px-3 py-2"
                  disabled={busy}
                />
              </div>

              <div className="grid gap-2">
                <label className="text-sm text-white/70">Logo Position</label>
                <select
                  value={clientLogoPosition}
                  onChange={(e) =>
                    setClientLogoPosition(e.target.value as "left" | "center" | "right")
                  }
                  className="rounded-xl border border-white/15 bg-slate-950 px-3 py-2"
                  disabled={busy}
                >
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>
              </div>
            </div>

            <div className="grid gap-2">
              <label className="text-sm text-white/70">Header Preview</label>
              <div className="rounded-2xl border border-black/10 bg-white p-4">
                <div className={`flex min-h-[72px] items-center ${logoPreviewAlign}`}>
                  {clientLogoPath ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={clientLogoPath}
                      alt="Client logo preview"
                      className="max-h-14 max-w-full object-contain"
                    />
                  ) : (
                    <div className="text-xs text-slate-500">No logo selected yet</div>
                  )}
                </div>
              </div>
              <p className="text-xs text-white/50">
                This preview shows approximate placement in the attendee header band.
              </p>
            </div>
          </div>
        </div>

        {sourceType === "mp4" && (
          <div className="mt-6 grid gap-2">
            <label className="text-sm text-white/70">Upload MP4</label>

            <input
              type="file"
              accept="video/mp4"
              onChange={(e) => setMp4File(e.target.files?.[0] ?? null)}
              className="rounded-xl border border-white/15 bg-slate-950 px-3 py-2"
              disabled={busy}
            />

            <p className="break-all text-xs text-white/50">
              Current file:{" "}
              {currentMp4Path ? (
                <>
                  ✅ <span className="font-mono">{currentMp4Path}</span>
                </>
              ) : (
                "— none —"
              )}
            </p>
          </div>
        )}

        {sourceType === "m3u8" && (
          <div className="mt-6 grid gap-2">
            <label className="text-sm text-white/70">HLS Playback URL (.m3u8)</label>

            <input
              value={m3u8Url}
              onChange={(e) => setM3u8Url(e.target.value)}
              placeholder="https://your-stream/index.m3u8"
              className="rounded-xl border border-white/15 bg-slate-950 px-3 py-2"
              disabled={busy}
            />

            <p className="text-xs text-white/50">
              RTMP is ingest-only. Use the playback URL from your streaming provider.
            </p>
          </div>
        )}

        {sourceType === "rtmp" && (
          <div className="mt-6 grid gap-2">
            <label className="text-sm text-white/70">RTMP URL (ingest)</label>

            <input
              value={rtmpUrl}
              onChange={(e) => setRtmpUrl(e.target.value)}
              placeholder="rtmp://..."
              className="rounded-xl border border-white/15 bg-slate-950 px-3 py-2"
              disabled={busy}
            />

            <p className="text-xs text-white/50">
              Browsers don&apos;t play RTMP directly. Store it here for your encoder/pipeline.
            </p>
          </div>
        )}

        <div id="control-room" className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold">Broadcast Control Room</h3>
              <p className="mt-1 text-sm text-white/60">
                Gate the player (Starting soon / Live / Paused / Ended) and manage viewers.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => saveControl("holding")}
                disabled={busy}
                className="rounded-xl border border-white/15 px-3 py-2 text-sm hover:bg-white/10 disabled:opacity-60"
              >
                Starting soon
              </button>
              <button
                onClick={() => saveControl("live")}
                disabled={busy}
                className="rounded-xl bg-emerald-500/90 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
              >
                Go Live
              </button>
              <button
                onClick={() => saveControl("paused")}
                disabled={busy}
                className="rounded-xl border border-white/15 px-3 py-2 text-sm hover:bg-white/10 disabled:opacity-60"
              >
                Pause
              </button>
              <button
                onClick={() => saveControl("ended")}
                disabled={busy}
                className="rounded-xl border border-white/15 px-3 py-2 text-sm hover:bg-white/10 disabled:opacity-60"
              >
                End
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/80">On-screen message (optional)</label>
              <textarea
                value={gateMessage}
                onChange={(e) => setGateMessage(e.target.value)}
                placeholder="e.g., We’ll begin at 2:00pm ET"
                className="min-h-[96px] w-full rounded-xl border border-white/15 bg-slate-950 px-3 py-2 text-sm"
                disabled={busy}
              />
              <div className="text-xs text-white/50">
                Current state: <span className="text-white/80">{gateState}</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-white/80">Live viewers (last 45s)</label>
                <button
                  onClick={refreshViewers}
                  disabled={busy}
                  className="rounded-xl border border-white/15 px-3 py-2 text-xs hover:bg-white/10 disabled:opacity-60"
                >
                  Refresh
                </button>
              </div>

              <div className="max-h-[180px] overflow-auto rounded-xl border border-white/10 bg-slate-950">
                {viewers.length === 0 ? (
                  <div className="p-3 text-sm text-white/60">No active viewers yet.</div>
                ) : (
                  <ul className="divide-y divide-white/10">
                    {viewers.map((v) => (
                      <li key={v.session_id} className="flex items-center justify-between gap-3 p-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm text-white/80">
                            {v.user_email || v.session_id}
                          </div>
                          <div className="text-xs text-white/50">
                            last seen {new Date(v.last_seen_at).toLocaleTimeString()}
                          </div>
                        </div>
                        <button
                          onClick={() => kick(v.session_id)}
                          disabled={busy}
                          className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs text-red-200 hover:bg-red-500/15 disabled:opacity-60"
                        >
                          Kick
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <p className="text-xs text-white/50">
                Kick removes by session id (browser). They will see a “Removed from session” screen.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-slate-950 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold">Program Output</h4>
                  <p className="mt-1 text-xs text-white/60">What attendees see right now.</p>
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
                  {programKind === "video" ? "VIDEO" : "SLIDES"}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={takeVideoToProgram}
                  disabled={busy}
                  className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60"
                >
                  Take VIDEO
                </button>
                <button
                  onClick={takeSlideToProgram}
                  disabled={busy}
                  className="rounded-xl border border-white/15 px-3 py-2 text-sm hover:bg-white/10 disabled:opacity-60"
                >
                  Take SLIDES
                </button>
                <button
                  onClick={loadProgram}
                  disabled={busy}
                  className="rounded-xl border border-white/15 px-3 py-2 text-sm hover:bg-white/10 disabled:opacity-60"
                >
                  Refresh
                </button>
              </div>

              <p className="mt-3 text-xs text-white/50">
                VIDEO uses whatever you configured above (MP4 / HLS / RTMP). SLIDES uses the selected slide file.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold">Slides Library</h4>
                  <p className="mt-1 text-xs text-white/60">Upload PDFs or images, then Take to Program.</p>
                </div>
                <button
                  onClick={loadSlides}
                  disabled={busy}
                  className="rounded-xl border border-white/15 px-3 py-2 text-xs hover:bg-white/10 disabled:opacity-60"
                >
                  Refresh
                </button>
              </div>

              <div className="mt-3 flex items-center gap-3">
                <input
                  type="file"
                  accept="application/pdf,image/png,image/jpeg,image/webp"
                  disabled={busy || slideUploading}
                  onChange={async (e) => {
                    const f = e.target.files?.[0]
                    if (!f) return
                    setSlideUploading(true)
                    setStatus("Uploading slide...")
                    try {
                      const fd = new FormData()
                      fd.append("file", f)
                      const res = await fetch("/api/admin/general-session/slides/upload", {
                        method: "POST",
                        body: fd,
                      })
                      const j = await res.json().catch(() => ({}))
                      if (!res.ok) throw new Error(j?.error || "Upload failed")
                      await loadSlides()
                      if (j?.slide?.slide_path) setSelectedSlidePath(j.slide.slide_path)
                      setStatus("Slide uploaded ✅")
                    } catch (err: any) {
                      setStatus(`❌ ${err?.message || "Upload failed"}`)
                    } finally {
                      setSlideUploading(false)
                      if (e.target) e.target.value = ""
                    }
                  }}
                  className="block w-full text-sm"
                />
              </div>

              <div className="mt-3">
                <select
                  value={selectedSlidePath}
                  onChange={(e) => setSelectedSlidePath(e.target.value)}
                  disabled={busy}
                  className="w-full rounded-xl border border-white/15 bg-slate-950 px-3 py-2 text-sm"
                >
                  {slides.length === 0 ? (
                    <option value="">No slides uploaded</option>
                  ) : (
                    slides.map((s) => (
                      <option key={s.id} value={s.slide_path}>
                        {s.name}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => pushSlide("prev")}
                  disabled={busy || slides.length === 0}
                  className="rounded-xl border border-white/15 px-3 py-2 text-sm hover:bg-white/10 disabled:opacity-60"
                >
                  ◀ Prev
                </button>
                <button
                  onClick={() => pushSlide("set")}
                  disabled={busy || !selectedSlidePath}
                  className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60"
                >
                  Push Selected
                </button>
                <button
                  onClick={() => pushSlide("next")}
                  disabled={busy || slides.length === 0}
                  className="rounded-xl border border-white/15 px-3 py-2 text-sm hover:bg-white/10 disabled:opacity-60"
                >
                  Next ▶
                </button>
              </div>

              <div className="mt-2 text-xs text-white/50">
                {currentSlideId
                  ? "Current slide is live on attendees."
                  : "No slide has been pushed yet."}
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold">Lower Third</h4>
                <p className="mt-1 text-xs text-white/60">Overlay name/title when Live. Admin-only.</p>
              </div>
              {lowerThirdActive ? (
                <span className="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200">
                  LIVE
                </span>
              ) : (
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
                  OFF
                </span>
              )}
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <input
                value={lowerThirdName}
                onChange={(e) => setLowerThirdName(e.target.value)}
                placeholder="Name"
                disabled={busy}
                className="rounded-xl border border-white/15 bg-slate-950 px-3 py-2 text-sm"
              />
              <input
                value={lowerThirdTitle}
                onChange={(e) => setLowerThirdTitle(e.target.value)}
                placeholder="Title (optional)"
                disabled={busy}
                className="rounded-xl border border-white/15 bg-slate-950 px-3 py-2 text-sm"
              />
              <div className="flex gap-2">
                <button
                  onClick={takeLowerThird}
                  disabled={busy}
                  className="w-full rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60"
                >
                  Take
                </button>
                <button
                  onClick={clearLowerThird}
                  disabled={busy}
                  className="w-full rounded-xl border border-white/15 px-3 py-2 text-sm hover:bg-white/10 disabled:opacity-60"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        </div>

        <ThemePanel />
        <LowerPanelUploader />
        <MultiviewControl />

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            onClick={() => save()}
            disabled={!canSave || busy}
            className="rounded-xl bg-white px-4 py-2 font-semibold text-slate-950 disabled:opacity-60"
          >
            {busy ? "Working..." : "Save"}
          </button>

          <a
            href="/general-session"
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border border-white/20 px-4 py-2 hover:bg-white/10"
          >
            Preview ↗
          </a>

          <span className="text-sm text-white/60">{status}</span>
        </div>
      </div>
    </div>
  )
}