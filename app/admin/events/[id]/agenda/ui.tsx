"use client"

import Image from "next/image"
import { useEffect, useMemo, useState } from "react"
import {
  ArrowDown,
  ArrowUp,
  Award,
  Briefcase,
  CalendarDays,
  Clock3,
  Coffee,
  GraduationCap,
  Handshake,
  LayoutGrid,
  MessageSquare,
  Mic2,
  PartyPopper,
  Presentation,
  Utensils,
  Users,
  Video,
  type LucideIcon,
} from "lucide-react"
import AdminDateTimeField from "@/components/admin/AdminDateTimeField"
import JupiterLogo from "@/components/brand/JupiterLogo"
import {
  AGENDA_ICON_OPTIONS,
  type AgendaIconKey,
} from "@/lib/agendaIcons"
import {
  createAgendaSampleCsv,
  parseAgendaCsv,
  type ParsedAgendaCsvRow,
} from "@/lib/imports/agendaCsv"

type AgendaStatus = "upcoming" | "live" | "complete" | "cancelled"

type AgendaResource = {
  id: string
  label: string
  url: string
  file_name: string
  mime_type: string | null
  size_bytes: number | null
}

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
  speaker_title: string | null
  speaker_bio: string | null
  speaker_photo_url: string | null
  show_session_details: boolean
  show_speaker_photo: boolean
  resources: AgendaResource[]
  show_resources: boolean
  icon_key: AgendaIconKey | null
  sort_index: number
  status: AgendaStatus
  button_text: string | null
  button_url: string | null
  is_visible: boolean
  created_at: string | null
  updated_at: string | null
}

const emptyDraft: Partial<AgendaItem> = {
  title: "",
  start_at: "",
  end_at: "",
  location: "",
  track: "",
  speaker: "",
  speaker_title: "",
  speaker_bio: "",
  speaker_photo_url: "",
  show_session_details: true,
  show_speaker_photo: true,
  resources: [],
  show_resources: true,
  icon_key: null,
  description: "",
  sort_index: 0,
  status: "upcoming",
  button_text: "",
  button_url: "",
  is_visible: true,
}

const statusStyles: Record<AgendaStatus, string> = {
  upcoming: "border-sky-400/20 bg-sky-400/10 text-sky-200",
  live: "border-red-400/30 bg-red-500/15 text-red-200",
  complete: "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
  cancelled: "border-white/10 bg-white/5 text-white/40",
}

const agendaIconComponents: Record<AgendaIconKey, LucideIcon> = {
  calendar: CalendarDays,
  presentation: Presentation,
  meeting: Users,
  keynote: Mic2,
  workshop: Briefcase,
  breakout: LayoutGrid,
  lunch: Utensils,
  break: Coffee,
  networking: Handshake,
  qa: MessageSquare,
  video: Video,
  training: GraduationCap,
  award: Award,
  celebration: PartyPopper,
}

function AgendaIcon({
  iconKey,
  className = "h-4 w-4",
}: {
  iconKey: AgendaIconKey | null | undefined
  className?: string
}) {
  if (!iconKey) return null
  const Icon = agendaIconComponents[iconKey]
  return Icon ? <Icon aria-hidden="true" className={className} /> : null
}

function formatTime(value: string | null) {
  if (!value) return "TBD"
  try {
    return new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
  } catch {
    return value
  }
}

function formatDateTime(value: string | null) {
  if (!value) return "Not set"
  try {
    return new Date(value).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })
  } catch {
    return value
  }
}

function formatDuration(startValue: string | null, endValue: string | null) {
  if (!startValue || !endValue) return "Duration TBD"
  const start = new Date(startValue).getTime()
  const end = new Date(endValue).getTime()
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
    return "Duration TBD"
  }

  const totalMinutes = Math.round((end - start) / 60000)
  if (totalMinutes < 1) return "Less than 1 min"
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) return `${minutes} min`
  if (minutes === 0) return `${hours} hr${hours === 1 ? "" : "s"}`
  return `${hours} hr${hours === 1 ? "" : "s"} ${minutes} min`
}

function formatFileSize(value: number | null) {
  if (!value || value < 1) return ""
  if (value < 1024 * 1024) return `${Math.ceil(value / 1024)} KB`
  return `${(value / (1024 * 1024)).toFixed(1)} MB`
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

function StatusBadge({ status }: { status: AgendaStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${statusStyles[status]}`}>
      {status === "live" ? <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.9)]" /> : null}
      {status}
    </span>
  )
}

export default function AdminAgendaEditor({
  eventId,
  eventSlug,
  initialAccessOpen,
  initialSurveyUrl,
  initialShowSurvey,
  initialItems,
}: {
  eventId: string
  eventSlug: string
  initialAccessOpen: boolean
  initialSurveyUrl: string
  initialShowSurvey: boolean
  initialItems: AgendaItem[]
}) {
  const [items, setItems] = useState<AgendaItem[]>(initialItems || [])
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    const preferred = initialItems.find((item) => item.status === "live") || initialItems.find((item) => item.status === "upcoming") || initialItems[0]
    return preferred?.id || null
  })
  const [row, setRow] = useState<AgendaItem | null>(() => {
    return initialItems.find((item) => item.id === selectedId) || null
  })
  const [draft, setDraft] = useState<Partial<AgendaItem>>(emptyDraft)
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [uploadingSpeakerPhoto, setUploadingSpeakerPhoto] = useState(false)
  const [uploadingResource, setUploadingResource] = useState(false)
  const [accessOpen, setAccessOpen] = useState(initialAccessOpen)
  const [updatingAccess, setUpdatingAccess] = useState(false)
  const [pendingAccessChange, setPendingAccessChange] = useState<boolean | null>(null)
  const [pendingRemoval, setPendingRemoval] = useState<AgendaItem | null>(null)
  const [accessSyncToken, setAccessSyncToken] = useState<string | null>(null)
  const [accessError, setAccessError] = useState<string | null>(null)
  const [surveyUrl, setSurveyUrl] = useState(initialSurveyUrl)
  const [showSurvey, setShowSurvey] = useState(initialShowSurvey)
  const [savingSurvey, setSavingSurvey] = useState(false)
  const [surveyError, setSurveyError] = useState<string | null>(null)
  const [surveySyncToken, setSurveySyncToken] = useState<string | null>(null)
  const [syncingDisplays, setSyncingDisplays] = useState(false)
  const [lastDisplaySync, setLastDisplaySync] = useState<string | null>(null)
  const [displaySyncError, setDisplaySyncError] = useState<string | null>(null)
  const [csvFileName, setCsvFileName] = useState<string | null>(null)
  const [csvRows, setCsvRows] = useState<ParsedAgendaCsvRow[]>([])
  const [csvParseError, setCsvParseError] = useState<string | null>(null)
  const [importingCsv, setImportingCsv] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedId) || null,
    [items, selectedId]
  )
  const nextItemId = useMemo(
    () => items.find((item) => item.status === "upcoming")?.id || null,
    [items]
  )
  const csvValidationErrors = useMemo(
    () =>
      csvRows.flatMap((csvRow) =>
        csvRow.errors.map((message) => `Row ${csvRow.rowNumber}: ${message}`)
      ),
    [csvRows]
  )

  useEffect(() => {
    if (selectedItem) setRow(selectedItem)
  }, [selectedItem])

  async function refresh(preferredId?: string | null) {
    const res = await fetch(`/api/admin/event-agenda?event_id=${encodeURIComponent(eventId)}`, { cache: "no-store" })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || "Failed")
    const nextItems: AgendaItem[] = json.items || []
    setItems(nextItems)
    const targetId = preferredId ?? selectedId
    if (targetId && nextItems.some((item) => item.id === targetId)) {
      setSelectedId(targetId)
    } else {
      const preferred = nextItems.find((item) => item.status === "live") || nextItems.find((item) => item.status === "upcoming") || nextItems[0]
      setSelectedId(preferred?.id || null)
    }
  }

  function flash(message: string) {
    setMsg(message)
    setTimeout(() => setMsg(null), 1800)
  }

  async function createItem(payload: Partial<AgendaItem> = draft, duplicate = false) {
    setBusy(true); setErr(null); setMsg(null)
    try {
      if (!payload.title || !String(payload.title).trim()) throw new Error("Title is required")
      const res = await fetch("/api/admin/event-agenda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          id: undefined,
          event_id: eventId,
          title: duplicate ? `${String(payload.title)} Copy` : payload.title,
          status: duplicate ? "upcoming" : payload.status,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed")
      setDraft(emptyDraft)
      setAdding(false)
      await refresh(json.item?.id || null)
      flash(duplicate ? "Session duplicated" : "Session added")
    } catch (error) {
      setErr(errorMessage(error, "Failed"))
    } finally {
      setBusy(false)
    }
  }

  async function updateItem(id: string, patch: Partial<AgendaItem>, message = "Changes saved") {
    setBusy(true); setErr(null); setMsg(null)
    try {
      const res = await fetch("/api/admin/event-agenda", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...patch }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed")
      await refresh(id)
      setEditing(false)
      flash(message)
    } catch (error) {
      setErr(errorMessage(error, "Failed"))
    } finally {
      setBusy(false)
    }
  }

  async function deleteItem(id: string) {
    setBusy(true); setErr(null); setMsg(null)
    try {
      const res = await fetch("/api/admin/event-agenda", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed")
      await refresh(null)
      setEditing(false)
      flash("Session removed")
    } catch (error) {
      setErr(errorMessage(error, "Failed"))
    } finally {
      setBusy(false)
    }
  }

  function downloadAgendaSample() {
    const blob = new Blob([createAgendaSampleCsv()], {
      type: "text/csv;charset=utf-8",
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "jupiter-agenda-sample.csv"
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  async function loadAgendaCsv(file: File) {
    setCsvFileName(file.name)
    setCsvRows([])
    setCsvParseError(null)
    setErr(null)

    try {
      if (file.size === 0 || file.size > 5 * 1024 * 1024) {
        throw new Error("Agenda CSV must be between 1 byte and 5 MB")
      }
      const parsed = parseAgendaCsv(await file.text())
      if (parsed.rows.length === 0) {
        throw new Error("CSV does not contain any session rows")
      }
      setCsvRows(parsed.rows)
    } catch (error) {
      setCsvParseError(errorMessage(error, "Unable to read CSV"))
    }
  }

  async function importAgendaCsv() {
    if (csvRows.length === 0 || csvValidationErrors.length > 0) return

    setImportingCsv(true)
    setBusy(true)
    setErr(null)
    setMsg(null)
    const failures: string[] = []
    const failedRows: ParsedAgendaCsvRow[] = []
    let importedCount = 0

    for (const csvRow of csvRows) {
      try {
        const response = await fetch("/api/admin/event-agenda", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ event_id: eventId, ...csvRow.payload }),
        })
        const result = await response.json()
        if (!response.ok) {
          throw new Error(result.error || "Import failed")
        }
        importedCount += 1
      } catch (error) {
        failedRows.push(csvRow)
        failures.push(
          `Row ${csvRow.rowNumber}: ${errorMessage(error, "Import failed")}`
        )
      }
    }

    try {
      await refresh()
    } catch (error) {
      failures.push(errorMessage(error, "Imported sessions but refresh failed"))
    }

    setImportingCsv(false)
    setBusy(false)

    if (failures.length > 0) {
      setCsvRows(failedRows)
      setErr(
        `${importedCount} session${importedCount === 1 ? "" : "s"} imported. ${failures.slice(0, 3).join(" ")}`
      )
      return
    }

    setCsvFileName(null)
    setCsvRows([])
    flash(`${importedCount} session${importedCount === 1 ? "" : "s"} imported`)
  }

  function selectItem(item: AgendaItem) {
    setSelectedId(item.id)
    setRow(item)
    setEditing(false)
    setErr(null)
  }

  async function syncDisplays() {
    setSyncingDisplays(true)
    setDisplaySyncError(null)

    try {
      const res = await fetch("/api/admin/event-display-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: eventId }),
      })
      const json = await res.json()

      if (!res.ok) throw new Error(json.error || "Failed to sync displays")

      setLastDisplaySync(json.sync_token)
      flash("Display sync requested")
    } catch (error) {
      setDisplaySyncError(errorMessage(error, "Failed to sync displays"))
    } finally {
      setSyncingDisplays(false)
    }
  }

  async function updateEventAccess(nextOpen: boolean) {
    const action = nextOpen ? "open" : "close"
    setUpdatingAccess(true)
    setAccessError(null)

    try {
      const res = await fetch("/api/admin/event-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: eventId,
          access: nextOpen ? "open" : "closed",
        }),
      })
      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || `Failed to ${action} event`)
      }

      setAccessOpen(json.access === "open")
      setAccessSyncToken(json.sync_token || null)
      flash(nextOpen ? "Event opened to attendees" : "Event closed to attendees")
    } catch (error) {
      setAccessError(errorMessage(error, `Failed to ${action} event`))
    } finally {
      setUpdatingAccess(false)
    }
  }

  async function saveSurvey(nextShow = showSurvey) {
    setSavingSurvey(true)
    setSurveyError(null)

    try {
      const res = await fetch("/api/admin/event-survey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: eventId,
          survey_url: surveyUrl,
          show_survey: nextShow,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to update survey")

      setSurveyUrl(json.survey_url || "")
      setShowSurvey(json.show_survey === true)
      setSurveySyncToken(json.sync_token || null)
      flash(json.show_survey ? "Closing survey pushed to attendees" : "Closing survey hidden")
    } catch (error) {
      setSurveyError(errorMessage(error, "Failed to update survey"))
    } finally {
      setSavingSurvey(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 backdrop-blur-xl">
        <div className="flex flex-wrap items-center gap-5 text-sm">
          <div><span className="text-white/40">Sessions</span> <span className="ml-1 font-semibold">{items.length}</span></div>
          <div><span className="text-white/40">Live</span> <span className="ml-1 font-semibold text-red-300">{items.filter((item) => item.status === "live").length}</span></div>
          <div><span className="text-white/40">Upcoming</span> <span className="ml-1 font-semibold text-sky-200">{items.filter((item) => item.status === "upcoming").length}</span></div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button type="button" onClick={downloadAgendaSample} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/70 hover:bg-white/10 hover:text-white">Download Sample CSV</button>
          <label className={`cursor-pointer rounded-xl border border-indigo-300/20 bg-indigo-500/10 px-3 py-2 text-xs font-semibold text-indigo-100 hover:bg-indigo-500/20 ${busy || importingCsv ? "pointer-events-none opacity-50" : ""}`}>
            Upload CSV
            <input
              type="file"
              accept=".csv,text/csv"
              disabled={busy || importingCsv}
              className="sr-only"
              onChange={async (event) => {
                const input = event.currentTarget
                const file = input.files?.[0]
                if (file) await loadAgendaCsv(file)
                input.value = ""
              }}
            />
          </label>
          <button onClick={() => refresh()} disabled={busy || importingCsv} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold hover:bg-white/10 disabled:opacity-50">Refresh</button>
          <button onClick={() => setAdding((value) => !value)} disabled={busy || importingCsv} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold hover:bg-indigo-500 disabled:opacity-50">+ Add Session</button>
        </div>
      </div>

      {csvFileName || csvParseError ? (
        <section className={`rounded-2xl border p-5 shadow-xl backdrop-blur-xl ${csvParseError || csvValidationErrors.length > 0 ? "border-red-400/20 bg-red-500/[0.055]" : "border-indigo-400/20 bg-indigo-500/[0.055]"}`}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-200/55">Agenda CSV Import</div>
              <div className="mt-1 text-base font-semibold text-white">{csvFileName || "Selected CSV"}</div>
              {csvParseError ? (
                <p className="mt-2 text-sm text-red-200">{csvParseError}</p>
              ) : csvValidationErrors.length > 0 ? (
                <div className="mt-2 space-y-1 text-sm text-red-200">
                  {csvValidationErrors.slice(0, 6).map((message, index) => (
                    <div key={`${index}-${message}`}>{message}</div>
                  ))}
                  {csvValidationErrors.length > 6 ? (
                    <div>And {csvValidationErrors.length - 6} more validation errors.</div>
                  ) : null}
                </div>
              ) : (
                <p className="mt-2 text-sm text-white/50">
                  {csvRows.length} valid session{csvRows.length === 1 ? "" : "s"} ready to append. Existing sessions will not be changed.
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setCsvFileName(null)
                  setCsvRows([])
                  setCsvParseError(null)
                }}
                disabled={importingCsv}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/65 hover:bg-white/10 hover:text-white disabled:opacity-50"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => void importAgendaCsv()}
                disabled={importingCsv || csvRows.length === 0 || csvValidationErrors.length > 0 || Boolean(csvParseError)}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {importingCsv ? "Importing…" : `Import ${csvRows.length || ""} Session${csvRows.length === 1 ? "" : "s"}`}
              </button>
            </div>
          </div>
        </section>
      ) : null}

      <section className={`flex flex-wrap items-center justify-between gap-4 rounded-2xl border px-5 py-4 shadow-xl backdrop-blur-xl ${accessOpen ? "border-emerald-400/20 bg-emerald-400/[0.055]" : "border-amber-400/20 bg-amber-400/[0.045]"}`}>
        <div>
          <div className={`text-xs font-bold uppercase tracking-[0.18em] ${accessOpen ? "text-emerald-200/60" : "text-amber-200/60"}`}>
            Attendee Access
          </div>
          <div className="mt-1 flex items-center gap-2">
            <div className="text-base font-semibold">Event Access</div>
            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${accessOpen ? "border-emerald-300/25 bg-emerald-400/10 text-emerald-200" : "border-amber-300/25 bg-amber-400/10 text-amber-100"}`}>
              {accessOpen ? "Open" : "Closed"}
            </span>
          </div>
          <p className="mt-1 text-sm text-white/45">
            {accessOpen
              ? "Attendees can see the live event experience."
              : "Attendees remain on the gated LETS experience until you open the event."}
          </p>
          {accessSyncToken ? (
            <div className="mt-2 text-xs text-white/35">
              Last access change: {formatDateTime(accessSyncToken)}
            </div>
          ) : null}
          {accessError ? <div className="mt-2 text-sm text-red-300">{accessError}</div> : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setPendingAccessChange(true)}
            disabled={updatingAccess || accessOpen}
            className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-[0_0_20px_rgba(5,150,105,0.16)] hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-35"
          >
            {updatingAccess && !accessOpen ? "Opening…" : "Open Event"}
          </button>
          <button
            type="button"
            onClick={() => setPendingAccessChange(false)}
            disabled={updatingAccess || !accessOpen}
            className="rounded-xl border border-red-300/20 bg-red-500/10 px-5 py-3 text-sm font-bold text-red-100 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-35"
          >
            {updatingAccess && accessOpen ? "Closing…" : "Close Event"}
          </button>
        </div>
      </section>

      <section className={`rounded-2xl border px-5 py-5 shadow-xl backdrop-blur-xl ${showSurvey ? "border-violet-300/25 bg-violet-500/[0.07]" : "border-white/10 bg-white/[0.035]"}`}>
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="min-w-[260px] flex-1">
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-violet-200/60">Closing Experience</div>
            <div className="mt-1 flex items-center gap-2">
              <div className="text-base font-semibold">Attendee Survey</div>
              <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${showSurvey ? "border-violet-300/30 bg-violet-400/15 text-violet-100" : "border-white/10 bg-white/5 text-white/40"}`}>
                {showSurvey ? "Visible" : "Hidden"}
              </span>
            </div>
            <p className="mt-1 text-sm text-white/45">Push a branded closing page with the third-party survey embedded inside it.</p>
            <label className="mt-4 block text-xs font-medium text-white/50">
              Survey URL
              <input
                type="url"
                value={surveyUrl}
                onChange={(event) => setSurveyUrl(event.target.value)}
                placeholder="https://survey-provider.com/..."
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm outline-none transition focus:border-violet-400/50 focus:bg-white/[0.07]"
              />
            </label>
            <p className="mt-2 text-xs text-white/30">Use an HTTPS link. Some survey providers require iframe embedding to be enabled in their own settings.</p>
            {surveySyncToken ? <div className="mt-2 text-xs text-emerald-300/70">Last synced: {formatDateTime(surveySyncToken)}</div> : null}
            {surveyError ? <div className="mt-2 text-sm text-red-300">{surveyError}</div> : null}
          </div>

          <div className="flex min-w-[190px] flex-col gap-2 sm:pt-6">
            <button
              type="button"
              onClick={() => void saveSurvey(showSurvey)}
              disabled={savingSurvey}
              className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white/75 hover:bg-white/10 disabled:opacity-50"
            >
              {savingSurvey ? "Saving…" : "Save Survey Link"}
            </button>
            <button
              type="button"
              onClick={() => void saveSurvey(!showSurvey)}
              disabled={savingSurvey || (!showSurvey && !surveyUrl.trim())}
              className={`rounded-xl px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40 ${showSurvey ? "border border-red-300/20 bg-red-500/10 text-red-100 hover:bg-red-500/20" : "bg-violet-600 shadow-[0_0_20px_rgba(124,58,237,0.16)] hover:bg-violet-500"}`}
            >
              {showSurvey ? "Hide Survey" : "Push Survey to Attendees"}
            </button>
          </div>
        </div>
      </section>

      {pendingAccessChange !== null ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#02030d]/80 px-4 backdrop-blur-md">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="event-access-dialog-title"
            className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-indigo-300/20 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.22),transparent_42%),linear-gradient(145deg,rgba(14,17,36,0.98),rgba(5,7,20,0.98))] p-7 shadow-[0_30px_100px_rgba(0,0,0,0.65),0_0_55px_rgba(79,70,229,0.12)]"
          >
            <div className="pointer-events-none absolute -right-12 -top-14 h-40 w-40 rounded-full border border-indigo-300/10" />
            <div className="pointer-events-none absolute -right-5 -top-7 h-24 w-24 rounded-full border border-indigo-300/15" />

            <div className="relative flex items-start gap-4">
              <div className="relative mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-indigo-300/20 bg-indigo-500/10 shadow-[0_0_24px_rgba(99,102,241,0.16)]">
                <JupiterLogo
                  showWordmark={false}
                  className="text-white"
                  markClassName="h-9 w-9"
                />
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.24em] text-indigo-200/55">
                  Jupiter Event Control
                </div>
                <h2 id="event-access-dialog-title" className="mt-2 text-2xl font-bold tracking-tight text-white">
                  {pendingAccessChange ? "Open Event?" : "Close Event?"}
                </h2>
                <p className="mt-3 text-sm leading-6 text-white/55">
                  {pendingAccessChange
                    ? "Attendees on the LETS page will immediately enter the live event experience."
                    : "Attendees on the LETS page will return to the gated event screen."}
                </p>
              </div>
            </div>

            <div className="relative mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setPendingAccessChange(null)}
                className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white/70 hover:bg-white/10 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const nextOpen = pendingAccessChange
                  setPendingAccessChange(null)
                  void updateEventAccess(nextOpen)
                }}
                className={`rounded-xl px-5 py-3 text-sm font-bold text-white shadow-lg ${pendingAccessChange ? "bg-emerald-600 shadow-emerald-950/40 hover:bg-emerald-500" : "bg-red-600 shadow-red-950/40 hover:bg-red-500"}`}
              >
                {pendingAccessChange ? "Confirm Open Event" : "Confirm Close Event"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {pendingRemoval ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#02030d]/80 px-4 backdrop-blur-md">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="remove-session-dialog-title"
            className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-red-300/20 bg-[radial-gradient(circle_at_top_right,rgba(239,68,68,0.18),transparent_42%),linear-gradient(145deg,rgba(14,17,36,0.98),rgba(5,7,20,0.98))] p-7 shadow-[0_30px_100px_rgba(0,0,0,0.65),0_0_55px_rgba(239,68,68,0.1)]"
          >
            <div className="pointer-events-none absolute -right-12 -top-14 h-40 w-40 rounded-full border border-red-300/10" />
            <div className="pointer-events-none absolute -right-5 -top-7 h-24 w-24 rounded-full border border-red-300/15" />

            <div className="relative flex items-start gap-4">
              <div className="relative mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-red-300/20 bg-red-500/10 shadow-[0_0_24px_rgba(239,68,68,0.14)]">
                <JupiterLogo
                  showWordmark={false}
                  className="text-white"
                  markClassName="h-9 w-9"
                />
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.24em] text-red-200/55">
                  Jupiter Run of Show
                </div>
                <h2 id="remove-session-dialog-title" className="mt-2 text-2xl font-bold tracking-tight text-white">
                  Remove Session?
                </h2>
                <p className="mt-3 text-sm leading-6 text-white/55">
                  <span className="font-semibold text-white/80">{pendingRemoval.title}</span> will be permanently removed from the run of show and the attendee agenda.
                </p>
              </div>
            </div>

            <div className="relative mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setPendingRemoval(null)}
                disabled={busy}
                className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white/70 hover:bg-white/10 hover:text-white disabled:opacity-50"
              >
                Keep Session
              </button>
              <button
                type="button"
                onClick={() => {
                  const itemId = pendingRemoval.id
                  setPendingRemoval(null)
                  void deleteItem(itemId)
                }}
                disabled={busy}
                className="rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-red-950/40 hover:bg-red-500 disabled:opacity-50"
              >
                Remove Session
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.04] px-5 py-4 shadow-xl backdrop-blur-xl">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-200/55">Operations</div>
          <div className="mt-1 text-base font-semibold">Sync Displays</div>
          <p className="mt-1 text-sm text-white/45">Ask connected attendee pages to quietly reload the latest event data.</p>
          {lastDisplaySync ? <div className="mt-2 text-xs text-emerald-300/70">Last successful sync: {formatDateTime(lastDisplaySync)}</div> : null}
          {displaySyncError ? <div className="mt-2 text-sm text-red-300">{displaySyncError}</div> : null}
        </div>
        <button
          onClick={syncDisplays}
          disabled={syncingDisplays}
          className="rounded-xl border border-cyan-300/20 bg-cyan-500/15 px-5 py-3 text-sm font-bold text-cyan-100 shadow-[0_0_20px_rgba(34,211,238,0.08)] hover:bg-cyan-500/25 disabled:cursor-wait disabled:opacity-50"
        >
          {syncingDisplays ? "Syncing…" : "Sync Displays"}
        </button>
      </section>

      {adding ? (
        <section className="rounded-2xl border border-indigo-400/20 bg-indigo-500/[0.06] p-5 shadow-2xl backdrop-blur-xl">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Add Session</h2>
              <p className="text-sm text-white/45">Add a new cue to the attendee agenda at /events/{eventSlug}/agenda.</p>
            </div>
            <button onClick={() => setAdding(false)} disabled={uploadingSpeakerPhoto} className="rounded-lg px-3 py-1.5 text-sm text-white/50 hover:bg-white/5 hover:text-white disabled:opacity-50">Close</button>
          </div>
          <SessionFields
            eventId={eventId}
            value={draft}
            onChange={setDraft}
            dateFieldsSideBySide
            onPhotoChange={(url) =>
              setDraft((current) => ({ ...current, speaker_photo_url: url }))
            }
            busy={busy}
            onUploadStateChange={setUploadingSpeakerPhoto}
            onResourceUploadStateChange={setUploadingResource}
          />
          <div className="mt-4 flex gap-2">
            <button onClick={() => createItem()} disabled={busy || uploadingSpeakerPhoto || uploadingResource} className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold hover:bg-emerald-500 disabled:opacity-50">Add Session</button>
            <button onClick={() => { setDraft(emptyDraft); setAdding(false) }} disabled={uploadingSpeakerPhoto || uploadingResource} className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm hover:bg-white/10 disabled:opacity-50">Cancel</button>
          </div>
        </section>
      ) : null}

      {err ? <div className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">{err}</div> : null}
      {msg ? <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{msg}</div> : null}

      <div className={`grid items-start gap-5 ${editing ? "lg:grid-cols-[minmax(280px,0.75fr)_minmax(520px,1.25fr)]" : "lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]"}`}>
        <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 shadow-2xl backdrop-blur-xl">
          <div className="mb-6">
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-white/35">Production Timeline</div>
            <h2 className="mt-1 text-xl font-semibold">Run of Show Timeline</h2>
          </div>

          <div className="space-y-0">
            {items.map((item, index) => {
              const active = selectedId === item.id
              const live = item.status === "live"
              const muted = item.status === "complete" || item.status === "cancelled"
              return (
                <div key={item.id} className="grid grid-cols-[68px_20px_minmax(0,1fr)] gap-2">
                  <div className={`pt-5 text-right text-sm font-semibold tabular-nums ${muted ? "text-white/25" : "text-white/65"}`}>
                    {formatTime(item.start_at)}
                  </div>
                  <div className="relative flex justify-center">
                    {index > 0 ? <div className="absolute bottom-1/2 top-0 w-px bg-white/10" /> : null}
                    {index < items.length - 1 ? <div className="absolute bottom-0 top-1/2 w-px bg-white/10" /> : null}
                    <div className={`relative z-10 mt-6 h-2.5 w-2.5 rounded-full border-2 ${live ? "animate-pulse border-red-300 bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.9)]" : muted ? "border-white/20 bg-zinc-700" : "border-sky-300 bg-sky-500"}`} />
                  </div>
                  <button
                    onClick={() => selectItem(item)}
                    className={`group relative mb-3 overflow-hidden rounded-2xl border p-4 text-left transition-all ${live ? "border-red-400/35 bg-red-500/[0.09] shadow-[0_0_34px_rgba(239,68,68,0.15)] hover:border-red-300/50" : active ? "border-indigo-400/40 bg-indigo-500/10 shadow-lg" : muted ? "border-white/[0.06] bg-black/20 opacity-60 hover:opacity-80" : "border-white/10 bg-white/[0.04] hover:border-white/20 hover:bg-white/[0.07]"}`}
                  >
                    {live ? <div className="pointer-events-none absolute inset-0 -translate-x-full animate-[pulse_3s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-red-300/[0.05] to-transparent" /> : null}
                    <div className="relative flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className={`flex min-w-0 items-center gap-2 text-base font-semibold ${muted ? "text-white/55" : "text-white"}`}>
                          <AgendaIcon iconKey={item.icon_key} className="h-4 w-4 shrink-0 text-indigo-200/75" />
                          <span className="truncate">{item.title}</span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/45">
                          <span className="truncate">{item.speaker || "Speaker not assigned"}</span>
                          <span className="inline-flex items-center gap-1 text-indigo-200/55">
                            <Clock3 aria-hidden="true" className="h-3.5 w-3.5" />
                            {formatDuration(item.start_at, item.end_at)}
                          </span>
                        </div>
                      </div>
                      <StatusBadge status={item.status} />
                    </div>
                    <div className="relative mt-3 flex items-center justify-between gap-3 text-xs">
                      <span className={item.is_visible ? "text-emerald-300/80" : "text-white/30"}>{item.is_visible ? "● Visible to attendees" : "○ Hidden from attendees"}</span>
                      {item.id === nextItemId && item.status === "upcoming" ? <span className="font-bold uppercase tracking-wider text-sky-300">Up next</span> : null}
                    </div>
                  </button>
                </div>
              )
            })}

            {items.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 px-6 py-12 text-center">
                <div className="text-lg font-semibold text-white/70">No sessions yet</div>
                <div className="mt-1 text-sm text-white/35">Add the first session to build your run of show.</div>
              </div>
            ) : null}
          </div>
        </section>

        <section className={`min-w-0 rounded-2xl border bg-white/[0.045] p-6 shadow-2xl backdrop-blur-xl ${editing ? "" : "lg:sticky lg:top-6"} ${selectedItem?.status === "live" ? "border-red-400/25 shadow-[0_0_50px_rgba(239,68,68,0.1)]" : "border-white/10"}`}>
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-white/35">Current Session</div>
            {selectedItem ? <StatusBadge status={selectedItem.status} /> : null}
          </div>

          {selectedItem && row ? (
            <>
              {!editing ? (
                <div className="mt-5">
                  <h2 className="flex items-start gap-3 text-3xl font-bold leading-tight tracking-tight">
                    <AgendaIcon iconKey={selectedItem.icon_key} className="mt-1 h-7 w-7 shrink-0 text-indigo-200/80" />
                    <span>{selectedItem.title}</span>
                  </h2>
                  <div className="mt-2 text-base text-white/55">{selectedItem.speaker || "Speaker not assigned"}</div>
                  {selectedItem.speaker_title ? <div className="mt-1 text-sm text-white/35">{selectedItem.speaker_title}</div> : null}

                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <InfoBlock label="Start" value={formatDateTime(selectedItem.start_at)} />
                    <InfoBlock label="End" value={formatDateTime(selectedItem.end_at)} />
                    <InfoBlock label="Duration" value={formatDuration(selectedItem.start_at, selectedItem.end_at)} />
                    <InfoBlock label="Button Text" value={selectedItem.button_text || "Not set"} />
                    <InfoBlock label="Visibility" value={selectedItem.is_visible ? "Visible to attendees" : "Hidden from attendees"} />
                    <InfoBlock label="Session Details" value={selectedItem.show_session_details ? "Shown" : "Hidden"} />
                    <InfoBlock label="Resources" value={`${selectedItem.resources?.length || 0} ${selectedItem.show_resources ? "shown" : "hidden"}`} />
                  </div>

                  <div className="mt-3 rounded-xl border border-white/[0.07] bg-black/20 p-3">
                    <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/30">Button URL</div>
                    <div className="mt-1 break-all text-sm text-white/65">{selectedItem.button_url || "Not set"}</div>
                  </div>

                  {selectedItem.description ? <p className="mt-4 text-sm leading-6 text-white/45">{selectedItem.description}</p> : null}

                  <div className="mt-6 grid grid-cols-2 gap-2">
                    <button onClick={() => updateItem(selectedItem.id, { status: "live" }, "Session is live")} disabled={busy || selectedItem.status === "live"} className="rounded-xl bg-red-600 px-4 py-3 text-sm font-bold tracking-wide text-white shadow-[0_0_20px_rgba(220,38,38,0.2)] hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-35">GO LIVE</button>
                    <button onClick={() => updateItem(selectedItem.id, { status: "complete" }, "Session completed")} disabled={busy || selectedItem.status === "complete"} className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold tracking-wide hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-35">COMPLETE</button>
                    <button onClick={() => updateItem(selectedItem.id, { status: "cancelled" }, "Session cancelled")} disabled={busy || selectedItem.status === "cancelled"} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold tracking-wide text-white/70 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35">CANCEL</button>
                    <button onClick={() => setEditing(true)} disabled={busy} className="rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold tracking-wide hover:bg-indigo-500 disabled:opacity-35">EDIT</button>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5">
                    <button onClick={() => createItem(selectedItem, true)} disabled={busy} className="rounded-xl border border-indigo-400/20 bg-indigo-500/10 px-4 py-2 text-sm font-semibold text-indigo-200 hover:bg-indigo-500/20 disabled:opacity-50">Duplicate Session</button>
                    <button onClick={() => setPendingRemoval(selectedItem)} disabled={busy} className="rounded-xl px-4 py-2 text-sm font-semibold text-red-300/70 hover:bg-red-500/10 hover:text-red-200 disabled:opacity-50">Remove Session</button>
                  </div>
                  <div className="mt-4 text-xs text-white/25">Last changed {formatDateTime(selectedItem.updated_at || selectedItem.created_at)}</div>
                </div>
              ) : (
                <div className="mt-5">
                  <SessionFields
                    eventId={eventId}
                    value={row}
                    onChange={(next) => setRow(next as AgendaItem)}
                    onPhotoChange={(url) =>
                      setRow((current) =>
                        current ? { ...current, speaker_photo_url: url } : current
                      )
                    }
                    busy={busy}
                    onUploadStateChange={setUploadingSpeakerPhoto}
                    onResourceUploadStateChange={setUploadingResource}
                  />
                  <div className="mt-5 flex flex-wrap gap-2">
                    <button onClick={() => updateItem(row.id, row)} disabled={busy || uploadingSpeakerPhoto || uploadingResource} className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold hover:bg-emerald-500 disabled:opacity-50">Save Changes</button>
                    <button onClick={() => { setRow(selectedItem); setEditing(false) }} disabled={busy || uploadingSpeakerPhoto || uploadingResource} className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm hover:bg-white/10 disabled:opacity-50">Cancel</button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="py-16 text-center">
              <div className="text-lg font-semibold text-white/65">No session selected</div>
              <div className="mt-1 text-sm text-white/35">Select a timeline card or add a session.</div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-black/20 p-3">
      <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/30">{label}</div>
      <div className="mt-1 text-sm font-medium text-white/75">{value}</div>
    </div>
  )
}

function SessionFields({
  eventId,
  value,
  onChange,
  onPhotoChange,
  busy,
  onUploadStateChange,
  onResourceUploadStateChange,
  dateFieldsSideBySide = false,
}: {
  eventId: string
  value: Partial<AgendaItem>
  onChange: (next: Partial<AgendaItem>) => void
  onPhotoChange: (url: string | null) => void
  busy: boolean
  onUploadStateChange: (uploading: boolean) => void
  onResourceUploadStateChange: (uploading: boolean) => void
  dateFieldsSideBySide?: boolean
}) {
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [resourceError, setResourceError] = useState<string | null>(null)
  const fieldClass = "mt-1 min-w-0 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 outline-none transition focus:border-indigo-400/50 focus:bg-white/[0.07]"
  const labelClass = "text-xs font-medium text-white/50"

  async function uploadSpeakerPhoto(file: File) {
    setPhotoError(null)

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setPhotoError("Speaker photos must be JPEG, PNG, or WebP")
      return
    }

    if (file.size === 0 || file.size > 5 * 1024 * 1024) {
      setPhotoError("Speaker photos must be between 1 byte and 5 MB")
      return
    }

    onUploadStateChange(true)

    try {
      const form = new FormData()
      form.append("event_id", eventId)
      form.append("file", file)

      const response = await fetch("/api/admin/event-agenda/speaker-photo", {
        method: "POST",
        body: form,
      })
      const result = await response.json()

      if (!response.ok || !result.url) {
        throw new Error(result.error || "Speaker photo upload failed")
      }

      onPhotoChange(result.url)
    } catch (error) {
      setPhotoError(error instanceof Error ? error.message : "Speaker photo upload failed")
    } finally {
      onUploadStateChange(false)
    }
  }

  async function uploadResource(file: File) {
    setResourceError(null)
    if (file.size === 0 || file.size > 50 * 1024 * 1024) {
      setResourceError("Resources must be between 1 byte and 50 MB")
      return
    }

    onResourceUploadStateChange(true)
    try {
      const form = new FormData()
      form.append("event_id", eventId)
      form.append("file", file)
      const response = await fetch("/api/admin/event-agenda/resource", {
        method: "POST",
        body: form,
      })
      const result = await response.json()
      if (!response.ok || !result.resource) {
        throw new Error(result.error || "Resource upload failed")
      }
      onChange({
        ...value,
        resources: [...(value.resources || []), result.resource as AgendaResource],
        show_resources: true,
      })
    } catch (error) {
      setResourceError(errorMessage(error, "Resource upload failed"))
    } finally {
      onResourceUploadStateChange(false)
    }
  }

  function moveResource(index: number, offset: -1 | 1) {
    const resources = [...(value.resources || [])]
    const nextIndex = index + offset

    if (nextIndex < 0 || nextIndex >= resources.length) return

    const [resource] = resources.splice(index, 1)
    resources.splice(nextIndex, 0, resource)
    onChange({ ...value, resources })
  }

  function updateStartDateTime(next: string | null) {
    const previousStart = value.start_at || ""
    const previousEnd = value.end_at || ""
    const nextStart = next || ""
    const endIsLinked = !previousEnd || previousEnd === previousStart
    const endFallsBeforeStart =
      Boolean(nextStart && previousEnd) &&
      new Date(previousEnd).getTime() < new Date(nextStart).getTime()

    onChange({
      ...value,
      start_at: nextStart,
      end_at: endIsLinked || endFallsBeforeStart ? nextStart : previousEnd,
    })
  }

  return (
    <div className="grid min-w-0 gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <div className={labelClass}>Title *</div>
        <input className={fieldClass} value={value.title || ""} onChange={(e) => onChange({ ...value, title: e.target.value })} placeholder="Opening Keynote" />
      </div>

      <div className="sm:col-span-2">
        <div className={labelClass}>Session Icon</div>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
          <button
            type="button"
            onClick={() => onChange({ ...value, icon_key: null })}
            disabled={busy}
            aria-pressed={!value.icon_key}
            className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-xs font-semibold transition disabled:opacity-50 ${!value.icon_key ? "border-indigo-300/45 bg-indigo-500/20 text-white" : "border-white/10 bg-white/[0.035] text-white/45 hover:bg-white/[0.07] hover:text-white/70"}`}
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-md border border-dashed border-current/40">—</span>
            None
          </button>
          {AGENDA_ICON_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => onChange({ ...value, icon_key: option.key })}
              disabled={busy}
              aria-pressed={value.icon_key === option.key}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-xs font-semibold transition disabled:opacity-50 ${value.icon_key === option.key ? "border-indigo-300/45 bg-indigo-500/20 text-white shadow-[0_0_18px_rgba(99,102,241,0.1)]" : "border-white/10 bg-white/[0.035] text-white/45 hover:bg-white/[0.07] hover:text-white/70"}`}
            >
              <AgendaIcon iconKey={option.key} className="h-5 w-5 shrink-0" />
              <span className="truncate">{option.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className={labelClass}>Speaker Name</div>
        <input className={fieldClass} value={value.speaker || ""} onChange={(e) => onChange({ ...value, speaker: e.target.value || null })} placeholder="Dr. Smith" />
      </div>
      <div>
        <div className={labelClass}>Speaker Role/Title</div>
        <input className={fieldClass} value={value.speaker_title || ""} onChange={(e) => onChange({ ...value, speaker_title: e.target.value || null })} placeholder="Chief Medical Officer" />
      </div>

      <div className="sm:col-span-2">
        <div className={labelClass}>Speaker Bio</div>
        <textarea className={`${fieldClass} min-h-[96px]`} value={value.speaker_bio || ""} onChange={(e) => onChange({ ...value, speaker_bio: e.target.value || null })} placeholder="Short speaker biography…" />
      </div>

      <div className="sm:col-span-2">
        <div className={labelClass}>Speaker Photo</div>
        <div className="mt-1 flex flex-wrap items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-3">
          {value.speaker_photo_url ? (
            <Image
              src={value.speaker_photo_url}
              alt={`${value.speaker || "Speaker"} photo preview`}
              width={88}
              height={88}
              className="h-[88px] w-[88px] rounded-xl object-cover"
            />
          ) : (
            <div className="flex h-[88px] w-[88px] items-center justify-center rounded-xl border border-dashed border-white/15 bg-black/20 text-center text-xs text-white/30">
              No photo
            </div>
          )}
          <div className="min-w-[220px] flex-1">
            <div className="flex flex-wrap gap-2">
              <label className="cursor-pointer rounded-lg border border-indigo-300/20 bg-indigo-500/15 px-3 py-2 text-sm font-semibold text-indigo-100 hover:bg-indigo-500/25">
                {value.speaker_photo_url ? "Replace Speaker Photo" : "Upload Speaker Photo"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={busy}
                  className="sr-only"
                  onChange={async (event) => {
                    const input = event.currentTarget
                    const file = input.files?.[0]
                    if (file) await uploadSpeakerPhoto(file)
                    input.value = ""
                  }}
                />
              </label>
              {value.speaker_photo_url ? (
                <button
                  type="button"
                  onClick={() => onPhotoChange(null)}
                  disabled={busy}
                  className="rounded-lg border border-red-300/15 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-200 hover:bg-red-500/20 disabled:opacity-50"
                >
                  Remove Photo
                </button>
              ) : null}
            </div>
            <div className="mt-2 text-xs text-white/35">JPEG, PNG, or WebP. Maximum 5 MB.</div>
            {photoError ? <div className="mt-2 text-sm text-red-300">{photoError}</div> : null}
          </div>
        </div>
      </div>

      <div className="sm:col-span-2">
        <div className={labelClass}>Attendee Details</div>
        <div className="mt-1 grid gap-2 rounded-xl border border-white/10 bg-white/5 p-3 sm:grid-cols-2">
          <label className="flex items-start gap-2 rounded-lg border border-white/[0.07] bg-black/15 px-3 py-2.5 text-sm text-white/75">
            <input
              type="checkbox"
              checked={value.show_session_details !== false}
              onChange={(event) =>
                onChange({ ...value, show_session_details: event.target.checked })
              }
              className="mt-0.5"
            />
            <span>
              <span className="block font-medium">Show Session Details</span>
              <span className="mt-0.5 block text-xs text-white/35">Displays the details link and speaker panel.</span>
            </span>
          </label>
          <label className="flex items-start gap-2 rounded-lg border border-white/[0.07] bg-black/15 px-3 py-2.5 text-sm text-white/75">
            <input
              type="checkbox"
              checked={value.show_speaker_photo !== false}
              onChange={(event) =>
                onChange({ ...value, show_speaker_photo: event.target.checked })
              }
              className="mt-0.5"
            />
            <span>
              <span className="block font-medium">Show Speaker Photo</span>
              <span className="mt-0.5 block text-xs text-white/35">Hides the portrait while keeping text details available.</span>
            </span>
          </label>
        </div>
      </div>

      <div className="sm:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className={labelClass}>Downloadable Resources</div>
            <div className="mt-0.5 text-xs text-white/30">PDF, PowerPoint, Excel, Word, image, CSV, text, or ZIP. Maximum 50 MB each. Use the arrows to set attendee order.</div>
          </div>
          <label className="cursor-pointer rounded-lg border border-indigo-300/20 bg-indigo-500/15 px-3 py-2 text-sm font-semibold text-indigo-100 hover:bg-indigo-500/25">
            Upload Resource
            <input
              type="file"
              accept=".pdf,.ppt,.pptx,.xls,.xlsx,.doc,.docx,.jpg,.jpeg,.png,.webp,.csv,.txt,.zip"
              disabled={busy}
              className="sr-only"
              onChange={async (event) => {
                const input = event.currentTarget
                const file = input.files?.[0]
                if (file) await uploadResource(file)
                input.value = ""
              }}
            />
          </label>
        </div>

        <div className="mt-2 space-y-2 rounded-xl border border-white/10 bg-white/5 p-3">
          {(value.resources || []).map((resource, index, resources) => (
            <div key={resource.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-white/[0.07] bg-black/15 p-2.5">
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-xs font-semibold text-white/45"
                aria-label={`Resource order ${index + 1}`}
              >
                {index + 1}
              </span>
              <input
                value={resource.label}
                onChange={(event) => onChange({
                  ...value,
                  resources: (value.resources || []).map((item) => item.id === resource.id ? { ...item, label: event.target.value } : item),
                })}
                aria-label={`Resource label for ${resource.file_name}`}
                className="min-w-[180px] flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-indigo-400/50"
              />
              <span className="max-w-[190px] truncate text-xs text-white/35" title={resource.file_name}>{resource.file_name}</span>
              {resource.size_bytes ? <span className="text-xs text-white/25">{formatFileSize(resource.size_bytes)}</span> : null}
              <div className="flex items-center gap-1" aria-label={`Reorder ${resource.label}`}>
                <button
                  type="button"
                  onClick={() => moveResource(index, -1)}
                  disabled={busy || index === 0}
                  aria-label={`Move ${resource.label} up`}
                  title="Move up"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/55 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-25"
                >
                  <ArrowUp size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => moveResource(index, 1)}
                  disabled={busy || index === resources.length - 1}
                  aria-label={`Move ${resource.label} down`}
                  title="Move down"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/55 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-25"
                >
                  <ArrowDown size={15} />
                </button>
              </div>
              <button
                type="button"
                onClick={() => onChange({ ...value, resources: (value.resources || []).filter((item) => item.id !== resource.id) })}
                className="rounded-lg border border-red-300/15 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-200 hover:bg-red-500/20"
              >
                Remove
              </button>
            </div>
          ))}
          {(value.resources || []).length === 0 ? (
            <div className="py-3 text-center text-sm text-white/30">No resources uploaded for this session.</div>
          ) : null}
          <label className="flex items-start gap-2 border-t border-white/[0.07] pt-3 text-sm text-white/75">
            <input
              type="checkbox"
              checked={value.show_resources !== false}
              onChange={(event) => onChange({ ...value, show_resources: event.target.checked })}
              className="mt-0.5"
            />
            <span>
              <span className="block font-medium">Show Resources to Attendees</span>
              <span className="mt-0.5 block text-xs text-white/35">The download expander appears only when this is on and files are available.</span>
            </span>
          </label>
        </div>
        {resourceError ? <div className="mt-2 text-sm text-red-300">{resourceError}</div> : null}
      </div>

      <div className="sm:col-span-2">
        <div className={labelClass}>Status</div>
        <select className={fieldClass} value={value.status || "upcoming"} onChange={(e) => onChange({ ...value, status: e.target.value as AgendaStatus })}>
          <option value="upcoming">Upcoming</option>
          <option value="live">Live</option>
          <option value="complete">Complete</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className={`grid min-w-0 gap-3 sm:col-span-2 ${dateFieldsSideBySide ? "xl:grid-cols-2" : ""}`}>
        <div className="min-w-0">
          <AdminDateTimeField label="Start" value={(value.start_at as string) || null} onChange={updateStartDateTime} disabled={busy} />
        </div>
        <div className="min-w-0">
          <AdminDateTimeField label="End" value={(value.end_at as string) || null} onChange={(next) => onChange({ ...value, end_at: next || "" })} disabled={busy} />
        </div>
      </div>

      <div>
        <div className={labelClass}>Track</div>
        <input className={fieldClass} value={value.track || ""} onChange={(e) => onChange({ ...value, track: e.target.value || null })} placeholder="Main" />
      </div>
      <div>
        <div className={labelClass}>Location</div>
        <input className={fieldClass} value={value.location || ""} onChange={(e) => onChange({ ...value, location: e.target.value || null })} placeholder="Ballroom A / Zoom / Room 1" />
      </div>

      <div>
        <div className={labelClass}>Button Text</div>
        <input className={fieldClass} value={value.button_text || ""} onChange={(e) => onChange({ ...value, button_text: e.target.value || null })} placeholder="Enter Session" />
      </div>
      <div>
        <div className={labelClass}>Button URL</div>
        <input type="url" className={fieldClass} value={value.button_url || ""} onChange={(e) => onChange({ ...value, button_url: e.target.value || null })} placeholder="https://..." />
      </div>

      <div>
        <div className={labelClass}>Sort index</div>
        <input className={fieldClass} value={String(value.sort_index ?? 0)} onChange={(e) => onChange({ ...value, sort_index: Number(e.target.value || 0) })} />
      </div>
      <div>
        <div className={labelClass}>Visibility</div>
        <label className="mt-1 flex min-h-[42px] items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/75">
          <input type="checkbox" checked={value.is_visible !== false} onChange={(e) => onChange({ ...value, is_visible: e.target.checked })} />
          Visible to attendees
        </label>
      </div>

      <div className="sm:col-span-2">
        <div className={labelClass}>Description</div>
        <textarea className={`${fieldClass} min-h-[90px]`} value={value.description || ""} onChange={(e) => onChange({ ...value, description: e.target.value || null })} placeholder="Short session description…" />
      </div>
    </div>
  )
}
