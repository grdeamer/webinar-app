"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { Activity, Archive, ArchiveRestore, Bell, CalendarDays, ChevronLeft, ChevronRight, CircleHelp, Clock3, MoreHorizontal, Radio, Search, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"

type EventRow = {
  id: string
  slug: string
  title: string
  start_label: string
  start_at: string | null
  lifecycle_stage: string
}

type PendingAction = { event: EventRow; action: "archive" | "restore" | "delete" }

export default function EventsListClient({ initialEvents, canManage = true }: { initialEvents: EventRow[]; canManage?: boolean }) {
  const [events, setEvents] = useState(initialEvents)
  const [showArchived, setShowArchived] = useState(false)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [pending, setPending] = useState<PendingAction | null>(null)
  const [confirmation, setConfirmation] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")

  const activeEvents = useMemo(() => events.filter((event) => event.lifecycle_stage !== "archived"), [events])
  const archivedCount = events.filter((event) => event.lifecycle_stage === "archived").length
  const liveCount = activeEvents.filter((event) => event.lifecycle_stage === "live").length
  const upcomingCount = activeEvents.filter((event) => event.start_at && new Date(event.start_at).getTime() > Date.now()).length
  const visibleEvents = useMemo(() => {
    const query = search.trim().toLowerCase()
    return events.filter((event) => {
      const archiveMatches = (event.lifecycle_stage === "archived") === showArchived
      const searchMatches = !query || event.title.toLowerCase().includes(query) || event.slug.toLowerCase().includes(query)
      return archiveMatches && searchMatches
    })
  }, [events, search, showArchived])
  const scheduledEvents = useMemo(() => activeEvents
    .filter((event) => event.start_at)
    .sort((a, b) => new Date(a.start_at!).getTime() - new Date(b.start_at!).getTime()), [activeEvents])
  const initialCalendarDate = scheduledEvents[0]?.start_at ? new Date(scheduledEvents[0].start_at) : new Date()
  const [calendarCursor, setCalendarCursor] = useState(() => new Date(initialCalendarDate.getFullYear(), initialCalendarDate.getMonth(), 1))
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<number | null>(null)
  const calendarYear = calendarCursor.getFullYear()
  const calendarMonth = calendarCursor.getMonth()
  const calendarDays = new Date(calendarYear, calendarMonth + 1, 0).getDate()
  const calendarOffset = new Date(calendarYear, calendarMonth, 1).getDay()
  const calendarEventsByDay = useMemo(() => {
    const eventsByDay = new Map<number, EventRow[]>()
    scheduledEvents.forEach((event) => {
      const date = new Date(event.start_at!)
      if (date.getFullYear() !== calendarYear || date.getMonth() !== calendarMonth) return
      const day = date.getDate()
      eventsByDay.set(day, [...(eventsByDay.get(day) ?? []), event])
    })
    return eventsByDay
  }, [calendarMonth, calendarYear, scheduledEvents])
  const selectedCalendarEvents = selectedCalendarDay ? calendarEventsByDay.get(selectedCalendarDay) ?? [] : []

  function changeCalendarMonth(offset: number) {
    setCalendarCursor((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1))
    setSelectedCalendarDay(null)
  }

  function beginAction(event: EventRow, action: PendingAction["action"]) {
    setOpenMenuId(null)
    setConfirmation("")
    setError(null)
    setPending({ event, action })
  }

  async function applyAction() {
    if (!pending) return
    setBusy(true)
    setError(null)
    try {
      const response = await fetch(`/api/admin/events/${pending.event.id}/lifecycle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: pending.action, confirmation }),
      })
      const payload = await response.json().catch((): null => null)
      if (!response.ok) throw new Error(payload?.error || "Could not update event")

      if (pending.action === "delete") {
        setEvents((current) => current.filter((event) => event.id !== pending.event.id))
      } else {
        const stage = pending.action === "archive" ? "archived" : "build"
        setEvents((current) => current.map((event) => event.id === pending.event.id ? { ...event, lifecycle_stage: stage } : event))
      }
      setPending(null)
      setConfirmation("")
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Could not update event")
    } finally {
      setBusy(false)
    }
  }

  const actionLabel = pending?.action === "delete"
    ? "Delete permanently"
    : pending?.action === "archive"
      ? "Archive event"
      : "Restore event"

  return (
    <>
      <div className="events-command-bar">
        <label className="events-command-search">
          <Search size={17} aria-hidden="true" />
          <span className="sr-only">Search events</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search events, sessions, or assets…" />
          <kbd>⌘ K</kbd>
        </label>
        <div className="events-command-tools" aria-label="Utilities">
          <Button type="button" variant="jupiterQuiet" size="icon" aria-label="Notifications"><Bell size={18} /><span>3</span></Button>
          <Button type="button" variant="jupiterQuiet" size="icon" aria-label="Help"><CircleHelp size={19} /></Button>
          <div className="events-command-avatar" aria-label="Account">G</div>
        </div>
      </div>

      {error && !pending ? <div className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</div> : null}

      <div className="events-operations-grid">
        <section className="events-directory-panel">
          <div className="events-metric-strip">
            <div><span className="events-metric-icon events-metric-icon--blue"><CalendarDays size={18} /></span><strong>{activeEvents.length}</strong><small>Active events</small></div>
            <div><span className="events-metric-icon events-metric-icon--violet"><Clock3 size={18} /></span><strong>{upcomingCount}</strong><small>Upcoming</small></div>
            <div><span className="events-metric-icon events-metric-icon--green"><Radio size={18} /></span><strong>{liveCount}</strong><small>Live now</small></div>
            <div><span className="events-metric-icon events-metric-icon--amber"><Archive size={18} /></span><strong>{archivedCount}</strong><small>Archived</small></div>
          </div>

          <div className="events-directory-toolbar">
            <p className="events-directory-count">{showArchived ? "Archived events" : "Active events"}</p>
            <div className="events-directory-filters">
              <Button type="button" variant={!showArchived ? "jupiterPrimary" : "jupiterQuiet"} size="sm" onClick={() => setShowArchived(false)} className={!showArchived ? "is-active" : ""}>All events</Button>
              {canManage ? <Button type="button" variant={showArchived ? "jupiterPrimary" : "jupiterQuiet"} size="sm" onClick={() => { setShowArchived((current) => !current); setOpenMenuId(null) }}>
                {showArchived ? <ArchiveRestore size={14} /> : <Archive size={14} />}{showArchived ? "Active" : "Archived"}
              </Button> : null}
            </div>
          </div>

          <div className="events-directory-list">
            {visibleEvents.map((event, index) => {
              const isLive = event.lifecycle_stage === "live"
              const isUpcoming = Boolean(event.start_at && new Date(event.start_at).getTime() > Date.now())
              return <article key={event.id} className={`event-directory-item event-directory-item--row event-directory-item--accent-${index % 4}`}>
                <Link href={`/admin/events/${event.id}`} className="event-directory-item__content">
                  <span className="event-directory-item__index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                  <div className="event-directory-item__copy">
                    <div className="event-directory-item__title">{event.title}</div>
                    <div className="event-directory-item__slug">/{event.slug}</div>
                    <div className={`event-directory-item__status ${isLive ? "is-live" : isUpcoming ? "is-upcoming" : "is-build"}`}>{isLive ? "Live" : isUpcoming ? "Upcoming" : "In preparation"}</div>
                  </div>
                  <div className="event-directory-item__date">{event.start_label}</div>
                </Link>
                {canManage ? <Button type="button" variant="jupiterQuiet" size="icon-sm" aria-label={`Actions for ${event.title}`} aria-expanded={openMenuId === event.id} onClick={() => setOpenMenuId((current) => current === event.id ? null : event.id)} className="event-directory-item__menu"><MoreHorizontal size={18} /></Button> : null}
                {canManage && openMenuId === event.id ? <div className="absolute right-4 top-14 z-20 w-52 rounded-xl border border-white/10 bg-[#101522] p-1.5 shadow-2xl">
                  {showArchived ? <Button type="button" variant="jupiterQuiet" onClick={() => beginAction(event, "restore")} className="w-full justify-start"><ArchiveRestore size={15} />Restore event</Button> : <Button type="button" variant="jupiterQuiet" onClick={() => beginAction(event, "archive")} className="w-full justify-start"><Archive size={15} />Archive event</Button>}
                  <Button type="button" variant="destructive" onClick={() => beginAction(event, "delete")} className="w-full justify-start"><Trash2 size={15} />Delete permanently</Button>
                </div> : null}
              </article>
            })}
            {visibleEvents.length === 0 ? <div className="events-directory-empty">{search ? "No events match your search." : showArchived ? "No archived events." : "No active events yet."}</div> : null}
          </div>
        </section>

        <aside className="events-insight-rail">
          <section className="events-calendar-card" id="events-calendar">
            <div className="events-rail-heading"><span>Upcoming events</span><button type="button" onClick={() => { const today = new Date(); setCalendarCursor(new Date(today.getFullYear(), today.getMonth(), 1)); setSelectedCalendarDay(today.getDate()) }}>Today</button></div>
            <div className="events-calendar-month"><h3>{calendarCursor.toLocaleString("en-US", { month: "long" }).toUpperCase()} {calendarYear}</h3><div><Button type="button" variant="jupiterQuiet" size="icon-sm" onClick={() => changeCalendarMonth(-1)} aria-label="Previous month"><ChevronLeft size={16} /></Button><Button type="button" variant="jupiterQuiet" size="icon-sm" onClick={() => changeCalendarMonth(1)} aria-label="Next month"><ChevronRight size={16} /></Button></div></div>
            <div className="events-calendar-weekdays">{["S", "M", "T", "W", "T", "F", "S"].map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}</div>
            <div className="events-calendar-days">
              {Array.from({ length: calendarOffset }, (_, index) => <span key={`blank-${index}`} />)}
              {Array.from({ length: calendarDays }, (_, index) => {
                const day = index + 1
                const dayEvents = calendarEventsByDay.get(day) ?? []
                return dayEvents.length ? <button key={day} type="button" className={`events-calendar-day has-event ${selectedCalendarDay === day ? "is-selected" : ""}`} onClick={() => setSelectedCalendarDay(day)} aria-label={`${dayEvents.length} event${dayEvents.length === 1 ? "" : "s"} on ${calendarCursor.toLocaleString("en-US", { month: "long" })} ${day}`} aria-pressed={selectedCalendarDay === day}>{day}</button> : <span key={day} className="events-calendar-day">{day}</span>
              })}
            </div>
            {selectedCalendarDay ? <div className="events-calendar-selection"><p>{calendarCursor.toLocaleString("en-US", { month: "long" })} {selectedCalendarDay}</p>{selectedCalendarEvents.length ? selectedCalendarEvents.map((event) => <Link key={event.id} href={`/admin/events/${event.id}`}><span>{event.title}</span><ChevronRight size={14} /></Link>) : <small>No events scheduled.</small>}</div> : null}
          </section>
          <section className="events-activity-card">
            <div className="events-rail-heading"><span>Recent activity</span><Link href="/admin/activity">View all <ChevronRight size={14} /></Link></div>
            <div className="events-activity-list">{activeEvents.slice(0, 4).map((event, index) => <Link href={`/admin/events/${event.id}`} key={event.id}>
              <span className={`events-activity-icon event-directory-item--accent-${index % 4}`}><Activity size={15} /></span>
              <span><strong>{event.title}</strong><small>{event.lifecycle_stage === "live" ? "Went live" : "Event workspace updated"}</small></span>
            </Link>)}</div>
          </section>
        </aside>
      </div>

      {pending ? <div role="dialog" aria-modal="true" aria-labelledby="event-action-title" className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-5 backdrop-blur-sm"><div className={`w-full max-w-lg rounded-3xl border bg-[#0b101c] p-6 shadow-2xl ${pending.action === "delete" ? "border-red-300/15" : "border-white/10"}`}><div className="flex items-start justify-between gap-4"><div><div className={`text-[10px] font-black uppercase tracking-[.2em] ${pending.action === "delete" ? "text-red-200/55" : "text-violet-200/55"}`}>Event action</div><h2 id="event-action-title" className="mt-3 text-2xl font-semibold">{actionLabel}?</h2></div><Button type="button" variant="jupiterQuiet" size="icon" aria-label="Close event action" onClick={() => { setPending(null); setConfirmation(""); setError(null) }}><X size={17} /></Button></div>
        {pending.action === "archive" ? <p className="mt-4 text-sm leading-6 text-white/55"><span className="font-semibold text-white/80">{pending.event.title}</span> will move out of the active list. You can restore it at any time from Archived events.</p> : null}
        {pending.action === "restore" ? <p className="mt-4 text-sm leading-6 text-white/55"><span className="font-semibold text-white/80">{pending.event.title}</span> will return to the active event list.</p> : null}
        {pending.action === "delete" ? <><p className="mt-4 text-sm leading-6 text-white/55">This permanently deletes <span className="font-semibold text-white/80">{pending.event.title}</span> and its people, program, production, page, and publishing records. This cannot be undone.</p><label className="mt-5 block text-xs font-semibold text-white/60">Type <span className="text-white">{pending.event.title}</span> to confirm<input autoFocus value={confirmation} onChange={(inputEvent) => setConfirmation(inputEvent.target.value)} className="mt-2 w-full rounded-xl border border-red-300/15 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-red-300/40" /></label></> : null}
        {error ? <div className="mt-4 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</div> : null}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button type="button" variant="jupiterSecondary" size="lg" onClick={() => { setPending(null); setConfirmation(""); setError(null) }}>Cancel</Button><Button type="button" variant={pending.action === "delete" ? "jupiterDanger" : "jupiterPrimary"} size="lg" disabled={busy || (pending.action === "delete" && confirmation !== pending.event.title)} onClick={() => void applyAction()}>{pending.action === "delete" ? <Trash2 size={15} /> : pending.action === "archive" ? <Archive size={15} /> : <ArchiveRestore size={15} />}{busy ? "Working…" : actionLabel}</Button></div>
      </div></div> : null}
    </>
  )
}
