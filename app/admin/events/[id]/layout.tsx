"use client"

import Link from "next/link"
import { startVisibilityPoll } from "@/lib/browser/visibilityPoll"
import { useParams, usePathname } from "next/navigation"
import { CSSProperties, ReactNode, useCallback, useEffect, useState } from "react"
import { Activity, CalendarDate, Home03, Signal02, Tool02, Users01 } from "@untitledui/icons"
import { Menu, X } from "lucide-react"
import JupiterLogo from "@/components/brand/JupiterLogo"
import AdminProfileMenu from "@/components/admin/AdminProfileMenu"
import { JupiterAppearanceSwitch, useJupiterAppearance, usesDefaultAppearance } from "@/components/ui/JupiterAppearance"
import AdminDocumentTitle from "@/components/admin/AdminDocumentTitle"
import type { EventFeature } from "@/lib/eventPermissions"
import { EventWorkspaceNavigation, EventWorkspaceSection } from "./EventWorkspaceNavigation"
import styles from "./event-workspace-navigation.module.css"

type EventWorkspaceContext = {
  title: string
  badgeImageUrl: string | null
  startAt: string | null
  endAt: string | null
  access: "open" | "closed"
  hasLiveSession: boolean
  teamRole: "owner" | "administrator" | "event_admin" | "producer" | "viewer"
  isGlobalAdmin: boolean
  features: EventFeature[]
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

function NavLink({ href, label, icon, exact = false, badge, iconTone, disabled = false }: { href: string; label: string; icon?: ReactNode; exact?: boolean; badge?: string; iconTone?: string; disabled?: boolean }) {
  const pathname = usePathname()
  const selected = active(pathname, href, exact)
  const iconStyle = iconTone ? ({ "--jv1-nav-icon-rgb": iconTone } as CSSProperties) : undefined
  const content = <><span className="jv1-nav-dot" style={iconStyle}>{icon}</span><span className="min-w-0 flex-1 truncate">{label}</span>{badge ? <span className="jv1-nav-badge">{badge}</span> : null}</>
  if (disabled) return <span className="jv1-nav-item jv1-nav-item--disabled" aria-disabled="true" title={`${label} — No access`}>{content}</span>
  return <Link href={href} className={`jv1-nav-item ${selected ? "jv1-nav-item--selected" : ""}`} aria-current={selected ? "page" : undefined}>{content}</Link>
}

export default function EventLayout({ children }: { children: ReactNode }) {
  const params = useParams()
  const pathname = usePathname()
  const appearance = useJupiterAppearance()
  const canChangeAppearance = !usesDefaultAppearance(pathname)
  const id = String(params.id)
  const base = `/admin/events/${id}`
  const isProducer = pathname.startsWith(`${base}/producer`)
  const [eventContext, setEventContext] = useState<EventWorkspaceContext | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)

  const loadContext = useCallback(async (signal?: AbortSignal) => {
    const response = await fetch(`/api/admin/events/${id}/workspace-context`, { cache: "no-store", signal })
    if (!response.ok) throw new Error("Event workspace context unavailable")
    if (response.headers.get("content-type")?.includes("application/json")) {
      const value = await response.json() as EventWorkspaceContext
      if (!signal?.aborted) setEventContext(value)
    }
  }, [id])

  useEffect(() => {
    const poll = startVisibilityPoll({ run: loadContext, intervalMs: 30_000, onError: error => console.error("Event workspace context failed", error) })
    window.addEventListener("jupiter:event-context-updated", poll.wake)
    return () => { poll.stop(); window.removeEventListener("jupiter:event-context-updated", poll.wake) }
  }, [loadContext])

  const documentTitle = <AdminDocumentTitle eventTitle={eventContext?.title} eventBasePath={base} />

  if (isProducer) return <>{documentTitle}{children}</>

  const route = pathname.slice(base.length).replace(/^\//, "")
  const eventTitle = eventContext?.title ?? "Loading event…"
  const eventStatus = eventContext
    ? `${formatEventDate(eventContext.startAt)} · ${eventContext.access === "closed" ? "Closed" : "Open"}`
    : "Loading schedule…"

  return (
    <div className="jv1-shell">
      {documentTitle}
      <header className={styles.header}>
        <div className={styles.horizon}>
          <JupiterLogo className="text-white" markClassName="h-8 w-8" wordmarkClassName="text-[18px] font-semibold tracking-[.18em]" />
          <span className={styles.live}><span />{eventContext?.hasLiveSession ? "Event live" : "Live ready"}</span>
          <button type="button" className={styles.mobileMenu} onClick={() => setMobileOpen((open) => !open)}
            aria-label="Jupiter navigation" aria-expanded={mobileOpen} aria-controls="event-global-navigation">
            {mobileOpen ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>
        <EventWorkspaceNavigation base={base} access={eventContext} route={route}>
          <div className={styles.eventIdentity}>
            {eventContext?.badgeImageUrl ? <img className="jv1-header-event-thumbnail" src={eventContext.badgeImageUrl} alt="" /> : <span className="jv1-header-event-thumbnail jv1-header-event-thumbnail--default" aria-hidden="true" />}
            <div className={styles.eventCopy} aria-busy={!eventContext}><strong>{eventTitle}</strong><span>{eventStatus}</span></div>
          </div>
        </EventWorkspaceNavigation>
      </header>

      <div className="jv1-workspace" onClick={(event) => { if (mobileOpen && (event.target as HTMLElement).closest("a")) setMobileOpen(false) }}>
        <aside id="event-global-navigation" className={`jv1-global-rail ${mobileOpen ? styles.railOpen : ""}`}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setMobileOpen(false)
              document.querySelector<HTMLButtonElement>('[aria-controls="event-global-navigation"]')?.focus()
            }
          }}>
          <JupiterLogo className="jv1-rail-logo text-white" markClassName="h-9 w-9 shrink-0" wordmarkClassName="text-sm font-bold tracking-[0.18em]" />
          <div className="jv1-rail-kicker">MISSION CONTROL</div>
          <div className="jv1-system-card">
            <div><div className="jv1-system-label">System</div><div className="jv1-system-status">Live Ready</div></div>
            <span className="jv1-system-icon"><Signal02 /></span>
          </div>
          <div className="jv1-rail-section-label">Global</div>
          <nav className="jv1-global-navigation space-y-1.5"><NavLink href="/admin" label="Dashboard" icon={<Home03 />} iconTone="112 169 255" exact /><NavLink href="/admin/events" label="Events" icon={<CalendarDate />} iconTone="174 108 255" /><NavLink href="/admin/activity" label="Live Activity" icon={<Activity />} iconTone="83 229 168" disabled={eventContext ? !eventContext.isGlobalAdmin : false} /></nav>
          {eventContext?.isGlobalAdmin ? <><div className="jv1-rail-section-label jv1-rail-section-label--administration">Administration</div><nav className="jv1-global-navigation space-y-1.5"><NavLink href="/admin/users" label="Team & Access" icon={<Users01 />} iconTone="91 211 255" /><NavLink href="/admin/dev-tools" label="Dev Tools" icon={<Tool02 />} iconTone="241 188 104" /></nav></> : null}
          <div className="mt-auto pt-6">{canChangeAppearance ? <JupiterAppearanceSwitch appearance={appearance} /> : null}<AdminProfileMenu /></div>
        </aside>
        <main className="jv1-content">
          <EventWorkspaceSection base={base} route={route} access={eventContext} eventId={id} eventTitle={eventTitle} />
          {children}
        </main>
      </div>
    </div>
  )
}
