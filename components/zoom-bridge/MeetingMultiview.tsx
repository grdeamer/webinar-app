"use client"

import { useState, type FormEvent } from "react"
import { ExternalLink, Maximize2, Monitor, Users, X } from "lucide-react"
import { meetingJoinLink } from "@/lib/zoom-bridge/meeting-link"
import { ioButton, ioField } from "./SatelliteCard"
import RtmsMeetingReturn from "./RtmsMeetingReturn"
import LocalMeetingReturn from "./LocalMeetingReturn"
import DesktopMeetingReturn from "./DesktopMeetingReturn"

interface Meeting { id: string; name: string; joinUrl: string }
type Layout = 4 | 9 | 16
type ReturnSource = "window" | "rtms" | "desktop"
const grids: Record<Layout, string> = {
  4: "grid-cols-1 sm:grid-cols-2",
  9: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  16: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
}

function MeetingTile({ meeting, slot, expanded, onExpand, onRemove, source }: {
  meeting?: Meeting; slot: number; expanded: boolean; onExpand: () => void; onRemove: () => void; source: ReturnSource
}) {
  return <article className="min-w-0 overflow-hidden rounded-xl border border-white/15 bg-[#0d1c2a]" aria-label={meeting?.name ?? `Empty meeting slot ${slot}`}>
    <header className="flex min-h-12 flex-wrap items-center justify-between gap-2 px-3 py-2">
      <h2 className="min-w-0 break-words text-sm font-medium">{meeting?.name ?? `Meeting ${slot}`}</h2>
      <span className="text-xs text-slate-400">{meeting ? slot === 1 ? "Test receiver" : "○ Not connected" : "Empty slot"}</span>
    </header>
    {meeting && slot === 1 ? source === "window" ? <LocalMeetingReturn /> : source === "desktop" ? <DesktopMeetingReturn joinUrl={meeting.joinUrl} /> : <RtmsMeetingReturn joinUrl={meeting.joinUrl} /> : <><div className="flex aspect-video flex-col items-center justify-center gap-2 bg-[#14283d] px-4 text-center text-slate-400">
      <Monitor size={24} aria-hidden="true" />
      <span className="text-sm">{meeting ? "Waiting for shared presentation" : "Shared presentation"}</span>
      <span className="text-xs">{meeting ? "Zoom media connection required" : "Add a meeting to this multiview"}</span>
    </div>
    <div className="grid grid-cols-4 gap-1 p-1" aria-label="Active speaker and participant thumbnails">
      {["Active speaker", "Participant", "Participant", "Participant"].map((label, index) => <div key={index} className={`flex aspect-[4/3] min-w-0 flex-col items-center justify-center gap-1 bg-[#1b2938] px-1 text-center text-slate-400 ${index === 0 ? "ring-1 ring-inset ring-blue-400/40" : ""}`}>
        <Users size={18} aria-hidden="true" /><span className="text-[11px]">{label}</span>
      </div>)}
    </div>
    </>}
    <footer className="flex flex-wrap items-center gap-2 p-2">
      <button type="button" className={ioButton} onClick={onExpand} aria-label={`${expanded ? "Collapse" : "Expand"} ${meeting?.name ?? `meeting slot ${slot}`}`}><Maximize2 size={14} aria-hidden="true" />{expanded ? "Back to grid" : "Expand"}</button>
      {meeting ? <>
        <a href={meeting.joinUrl} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" className={ioButton} aria-label={`Open ${meeting.name} in Zoom`}>Open in Zoom <ExternalLink size={14} aria-hidden="true" /></a>
        <button type="button" className={ioButton} onClick={onRemove} aria-label={`Remove ${meeting.name}`}><X size={14} aria-hidden="true" /></button>
      </> : null}
    </footer>
  </article>
}

export default function MeetingMultiview() {
  const [layout, setLayout] = useState<Layout>(4)
  const [source, setSource] = useState<ReturnSource>("window")
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [page, setPage] = useState(0)
  const [expanded, setExpanded] = useState<number | null>(null)
  const [name, setName] = useState("")
  const [link, setLink] = useState("")
  const [error, setError] = useState("")
  const pages = Math.max(1, Math.ceil(meetings.length / layout))
  const currentPage = Math.min(page, pages - 1)
  const start = currentPage * layout
  const slots = expanded === null ? Array.from({ length: layout }, (_, i) => start + i) : [expanded]

  function addMeeting(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      const joinUrl = meetingJoinLink(link)
      const meetingNumber = new URL(joinUrl).pathname.replace(/\/$/, "")
      if (meetings.some(meeting => new URL(meeting.joinUrl).pathname.replace(/\/$/, "") === meetingNumber)) throw new Error("This meeting is already in the multiview.")
      const meeting = { id: crypto.randomUUID(), name: name.trim() || `Meeting ${meetings.length + 1}`, joinUrl }
      setMeetings(previous => [...previous, meeting])
      setPage(Math.floor(meetings.length / layout)); setExpanded(null)
      setName(""); setLink(""); setError("")
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Enter a valid Zoom meeting link.") }
  }

  return <section className="space-y-5" aria-label="Meeting multiview">
    <div className="rounded-xl border border-amber-300/25 bg-amber-300/5 px-4 py-3 text-sm text-amber-100" role="status">
      One-meeting pilot: select a Zoom window on this Mac, or use the separately configured RTMS receiver. Other tiles remain disconnected until qualified.
    </div>
    <div className="flex flex-wrap items-center gap-3" role="group" aria-label="Meeting return source">
      <span className="text-sm text-slate-300">First tile source</span>
      <button type="button" className={ioButton} aria-pressed={source === "window"} onClick={() => setSource("window")}>This Mac · Zoom window</button>
      <button type="button" className={ioButton} aria-pressed={source === "desktop"} onClick={() => setSource("desktop")}>Server · Zoom desktop</button>
      <button type="button" className={ioButton} aria-pressed={source === "rtms"} onClick={() => setSource("rtms")}>Server · Zoom RTMS</button>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-3"><span className="text-sm text-slate-300">Meetings per page</span><div className="flex flex-wrap gap-2" role="group" aria-label="Meetings per page">
        {([4, 9, 16] as const).map(value => <button key={value} type="button" className={`${ioButton} ${layout === value ? "!border-blue-400 !bg-blue-500/20 !text-blue-100" : ""}`} aria-pressed={layout === value} onClick={() => { setLayout(value); setPage(0); setExpanded(null) }}>{value} · {Math.sqrt(value)}×{Math.sqrt(value)}</button>)}
      </div></div>
      <span className="text-sm tabular-nums text-slate-400" aria-live="polite">{meetings.length} meetings added · {expanded === null ? `${layout} slots per page` : "Expanded view"}</span>
    </div>
    <form onSubmit={addMeeting} className="flex flex-wrap items-end gap-3">
      <label className="min-w-0 flex-[1_1_180px] text-sm text-slate-300">Meeting name<input value={name} onChange={e => setName(e.target.value)} maxLength={80} className={ioField} placeholder="Training room" autoComplete="off" /></label>
      <label className="min-w-0 flex-[2_1_240px] text-sm text-slate-300">Zoom join link or meeting ID<input value={link} onChange={e => { setLink(e.target.value); setError("") }} maxLength={2048} required className={ioField} placeholder="https://zoom.us/j/…" autoComplete="off" spellCheck={false} aria-invalid={Boolean(error)} aria-describedby={error ? "multiview-error" : undefined} /></label>
      <button type="submit" className={ioButton}>Add meeting</button>
    </form>
    {error ? <p id="multiview-error" role="alert" className="text-sm text-amber-200">{error}</p> : null}
    <div className={`grid gap-3 ${expanded === null ? grids[layout] : "mx-auto max-w-4xl grid-cols-1"}`}>
      {slots.map(slot => <MeetingTile key={meetings[slot]?.id ?? `empty-${slot}`} meeting={meetings[slot]} slot={slot + 1} source={source} expanded={expanded !== null} onExpand={() => setExpanded(expanded === null ? slot : null)} onRemove={() => { setMeetings(previous => previous.filter((_, i) => i !== slot)); setExpanded(null) }} />)}
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-xs text-slate-400">Shared presentation + active speaker + participant strip</p>
      <nav className="flex items-center gap-3" aria-label="Meeting pages">
        <button type="button" className={ioButton} disabled={currentPage === 0} onClick={() => { setPage(currentPage - 1); setExpanded(null) }}>Previous</button>
        <span className="text-sm tabular-nums text-slate-300" aria-live="polite">Page {currentPage + 1} of {pages}</span>
        <button type="button" className={ioButton} disabled={currentPage + 1 >= pages} onClick={() => { setPage(currentPage + 1); setExpanded(null) }}>Next</button>
      </nav>
    </div>
    <p className="text-xs leading-5 text-slate-400">Meeting links stay in this page’s memory and clear on refresh. Adding a meeting does not join it or start a server. Open in Zoom launches Zoom’s join page, where your browser can open the Zoom app.</p>
  </section>
}
