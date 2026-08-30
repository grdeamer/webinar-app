"use client"

import Link from "next/link"
import { useParams, usePathname } from "next/navigation"
import { CSSProperties, ReactNode, useCallback, useEffect, useState } from "react"
import { Activity, CalendarDate, File04, Home03, LayersThree01, List, Mail02, Signal02, Tool02, UploadCloud01, Users01, VideoRecorder } from "@untitledui/icons"
import { Menu, X } from "lucide-react"
import JupiterLogo from "@/components/brand/JupiterLogo"

type EventWorkspaceContext = {
  title: string
  startAt: string | null
  endAt: string | null
  access: "open" | "closed"
  hasLiveSession: boolean
  teamRole: "owner" | "administrator" | "event_admin" | "producer" | "viewer"
  isGlobalAdmin: boolean
}

function active(pathname: string, href: string, exact = false) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)
}

function formatEventDate(value: string | null) {
  if (!value) return "Schedule pending"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Schedule pending"
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date)
}

function NavLink({ href, label, icon, exact = false, badge, iconTone }: { href: string; label: string; icon?: ReactNode; exact?: boolean; badge?: string; iconTone?: string }) {
  const pathname = usePathname()
  const selected = active(pathname, href, exact)
  const iconStyle = iconTone ? ({ "--jv1-nav-icon-rgb": iconTone } as CSSProperties) : undefined
  return <Link href={href} className={`jv1-nav-item ${selected ? "jv1-nav-item--selected" : ""}`} aria-current={selected ? "page" : undefined}><span className="jv1-nav-dot" style={iconStyle}>{icon}</span><span className="min-w-0 flex-1 truncate">{label}</span>{badge ? <span className="jv1-nav-badge">{badge}</span> : null}</Link>
}

function TopLink({ href, label, icon, exact = false }: { href: string; label: string; icon: ReactNode; exact?: boolean }) {
  const pathname = usePathname()
  const selected = active(pathname, href, exact)
  return <Link href={href} className={`jv1-top-link ${selected ? "jv1-top-link--selected" : ""}`} aria-current={selected ? "page" : undefined}><span className="jv1-top-link-icon">{icon}</span><span>{label}</span></Link>
}

export default function EventLayout({ children }: { children: ReactNode }) {
  const params = useParams()
  const pathname = usePathname()
  const id = String(params.id)
  const base = `/admin/events/${id}`
  const isProducer = pathname.startsWith(`${base}/producer`)
  const [eventContext, setEventContext] = useState<EventWorkspaceContext | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)

  const loadContext = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch(`/api/admin/events/${id}/workspace-context`, { cache: "no-store", signal })
      if (response.ok && response.headers.get("content-type")?.includes("application/json")) setEventContext((await response.json()) as EventWorkspaceContext)
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) console.error("Event workspace context failed", error)
    }
  }, [id])

  useEffect(() => {
    const controller = new AbortController()
    const initialLoad = window.setTimeout(() => { void loadContext(controller.signal) }, 0)
    const interval = window.setInterval((): void => { void loadContext(controller.signal) }, 30_000)
    return () => { controller.abort(); window.clearTimeout(initialLoad); window.clearInterval(interval) }
  }, [loadContext])

  if (isProducer) return <>{children}</>

  const canConfigure = !eventContext || eventContext.isGlobalAdmin || eventContext.teamRole === "event_admin"
  const canOperate = canConfigure || eventContext?.teamRole === "producer"
  const eventTitle = eventContext?.title || `Event ${id.slice(0, 8)}`

  return (
    <div className="jv1-shell">
      <header className="jv1-atmospheric-header">
        <div className="jv1-header-veil" />
        <div className="jv1-header-brand"><JupiterLogo className="text-white" markClassName="h-8 w-8" wordmarkClassName="text-[18px] font-semibold tracking-[.18em]" /></div>
        <div className="jv1-header-workspace-bar">
          <div className="jv1-header-event-context">
            <span className="jv1-header-event-thumbnail" aria-hidden="true" />
            <span className="jv1-header-event-copy"><strong>{eventTitle}</strong><span>{formatEventDate(eventContext?.startAt ?? null)} <i /> {eventContext?.access === "closed" ? "Closed" : "Open"}</span></span>
          </div>
          <nav className="jv1-top-navigation" aria-label="Event workspace">
            <TopLink href={base} label="Overview" icon={<Home03 />} exact />
            {canConfigure ? <TopLink href={`${base}/settings`} label="Event Details" icon={<File04 />} /> : null}
            {canConfigure ? <TopLink href={`${base}/attendees`} label="People" icon={<Users01 />} /> : null}
            {canConfigure ? <TopLink href={`${base}/sessions`} label="Program" icon={<CalendarDate />} /> : null}
            {canConfigure ? <TopLink href={`${base}/page-editor`} label="Experience" icon={<LayersThree01 />} /> : null}
            {canConfigure ? <TopLink href={`${base}/emails`} label="Communications" icon={<Mail02 />} /> : null}
            {canConfigure ? <TopLink href={`${base}/publishing`} label="Publish" icon={<UploadCloud01 />} /> : null}
            {canOperate ? <TopLink href={`${base}/routing`} label="Run Event" icon={<Signal02 />} /> : null}
            {canOperate ? <TopLink href={`${base}/agenda`} label="Run of Show" icon={<List />} /> : null}
            {canOperate ? <TopLink href={`${base}/producer/room`} label="Producer Room" icon={<VideoRecorder />} /> : null}
          </nav>
        </div>
        <div className="jv1-live-badge"><span />{eventContext?.hasLiveSession ? "EVENT LIVE" : "LIVE READY"}</div>
        <button className="jv1-mobile-menu" onClick={() => setMobileOpen((open) => !open)} aria-label="Toggle event navigation">{mobileOpen ? <X size={19} /> : <Menu size={19} />}</button>
      </header>

      <div className={`jv1-workspace ${mobileOpen ? "jv1-workspace--open" : ""}`} onClick={(event) => { if (mobileOpen && (event.target as HTMLElement).closest("a")) setMobileOpen(false) }}>
        <aside className="jv1-global-rail">
          <JupiterLogo className="jv1-rail-logo text-white" markClassName="h-9 w-9 shrink-0" wordmarkClassName="text-sm font-bold tracking-[0.18em]" />
          <div className="jv1-rail-kicker">MISSION CONTROL</div>
          <div className="jv1-system-card">
            <div><div className="jv1-system-label">System</div><div className="jv1-system-status">Live Ready</div></div>
            <span className="jv1-system-icon"><Signal02 /></span>
          </div>
          <div className="jv1-rail-section-label">Global</div>
          <nav className="jv1-global-navigation space-y-1.5"><NavLink href="/admin" label="Dashboard" icon={<Home03 />} iconTone="112 169 255" exact /><NavLink href="/admin/events" label="Events" icon={<CalendarDate />} iconTone="174 108 255" /><NavLink href="/admin/activity" label="Live Activity" icon={<Activity />} iconTone="83 229 168" /></nav>
          <div className="jv1-rail-section-label jv1-rail-section-label--administration">Administration</div>
          <nav className="jv1-global-navigation space-y-1.5"><NavLink href="/admin/users" label="Team & Access" icon={<Users01 />} iconTone="91 211 255" /><NavLink href="/admin/dev-tools" label="Dev Tools" icon={<Tool02 />} iconTone="241 188 104" /></nav>
        </aside>
        <aside className="jv1-event-rail" aria-label="Mobile event workspace">
          <div className="jv1-event-rail-label"><span /> Event workspace</div>
          <div className="jv1-event-context"><h2>{eventTitle}</h2><p>{formatEventDate(eventContext?.startAt ?? null)} · {eventContext?.access === "closed" ? "Closed" : "Open"}</p></div>
          <nav className="jv1-event-navigation space-y-1"><NavLink href={base} label="Overview" exact />{canConfigure ? <NavLink href={`${base}/settings`} label="Event Details" icon={<File04 />} /> : null}{canConfigure ? <NavLink href={`${base}/attendees`} label="People" icon={<Users01 />} /> : null}{canConfigure ? <NavLink href={`${base}/sessions`} label="Program" icon={<CalendarDate />} /> : null}{canConfigure ? <NavLink href={`${base}/page-editor`} label="Experience" icon={<LayersThree01 />} /> : null}{canConfigure ? <NavLink href={`${base}/emails`} label="Communications" icon={<Mail02 />} /> : null}{canConfigure ? <NavLink href={`${base}/publishing`} label="Publish" icon={<UploadCloud01 />} /> : null}{canOperate ? <NavLink href={`${base}/routing`} label="Run Event" icon={<Signal02 />} /> : null}{canOperate ? <NavLink href={`${base}/agenda`} label="Run of Show" icon={<List />} /> : null}{canOperate ? <NavLink href={`${base}/producer/room`} label="Producer Room" icon={<VideoRecorder />} /> : null}</nav>
        </aside>
        <main className="jv1-content">{children}</main>
      </div>
    </div>
  )
}
