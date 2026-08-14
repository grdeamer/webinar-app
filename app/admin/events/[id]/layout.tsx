"use client"

import Link from "next/link"
import { useParams, usePathname } from "next/navigation"
import { ReactNode, useCallback, useEffect, useState } from "react"
import {
  BarChart08,
  CalendarDate,
  ChevronLeft,
  File04,
  Image03,
  LayersThree01,
  List,
  Mail02,
  Signal02,
  UploadCloud01,
  Users01,
  VideoRecorder,
} from "@untitledui/icons"

const EVENT_WORKSPACE_RAIL_STORAGE_KEY = "jupiter:eventWorkspaceRail"

const EVENT_WORKSPACE_GRID_CLASS =
  "grid min-h-0 transition-all duration-300"

const EVENT_WORKSPACE_SHELL_CLASS =
  "relative isolate overflow-hidden border-r border-white/[0.09] bg-[linear-gradient(180deg,#050814,#030510)] transition-all duration-300"

const EVENT_WORKSPACE_SHELL_TEXTURE_CLASS =
  "pointer-events-none absolute inset-0 opacity-[0.018] bg-[repeating-linear-gradient(to_bottom,rgba(255,255,255,0.018)_0px,rgba(255,255,255,0.018)_1px,transparent_1px,transparent_18px)]"

const EVENT_WORKSPACE_SHELL_GLOW_CLASS =
  "pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-100/[0.10] to-transparent"

const EVENT_WORKSPACE_TOGGLE_CLASS =
  "absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.09] bg-black/24 text-white/45 shadow-[inset_0_1px_0_rgba(255,255,255,0.030)] transition hover:border-violet-300/22 hover:bg-violet-400/10 hover:text-white"

const EVENT_WORKSPACE_CARD_CLASS =
  "relative z-10 mb-3 border-b border-white/[0.12] px-1 pb-4 pt-8"

const EVENT_WORKSPACE_FOOTER_CARD_CLASS =
  "relative z-10 mt-4 border-t border-white/[0.08] px-2 pt-3 text-[10px] leading-snug text-white/34"

const EVENT_WORKSPACE_SECTION_CLASS =
  "event-editorial-surface relative min-w-0 overflow-hidden bg-[#02040a]"

type EventWorkspaceContext = {
  title: string
  startAt: string | null
  endAt: string | null
  access: "open" | "closed"
  hasLiveSession: boolean
  teamRole: "owner" | "administrator" | "event_admin" | "producer" | "viewer"
  isGlobalAdmin: boolean
}

function formatEventDate(startAt: string | null, endAt: string | null): string {
  if (!startAt) return "Schedule not set"

  const start = new Date(startAt)
  if (Number.isNaN(start.getTime())) return "Schedule not set"

  const date = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(start)

  if (!endAt) return date

  const end = new Date(endAt)
  if (Number.isNaN(end.getTime())) return date

  const sameDay = start.toDateString() === end.toDateString()
  if (sameDay) return date

  return `${date} – ${new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(end)}`
}

function isActive(pathname: string, href: string, exact = false) {
  if (exact) return pathname === href
  return pathname === href || pathname.startsWith(href + "/")
}

function NavItem({
  href,
  icon,
  children,
  label,
  collapsed = false,
  exact = false,
}: {
  href: string
  icon: ReactNode
  children: ReactNode
  label: string
  collapsed?: boolean
  exact?: boolean
}) {
  const pathname = usePathname()
  const active = isActive(pathname, href, exact)

  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      aria-label={label}
      className={[
        "group relative flex items-center overflow-hidden rounded-[14px] py-2 text-[13px] font-semibold transition-all duration-200",
        collapsed ? "justify-center px-1.5" : "gap-2 px-2.5",
        active
          ? "border border-[#397cff]/70 bg-[#0c1428] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
          : "border border-transparent text-white/54 hover:border-white/[0.065] hover:bg-white/[0.045] hover:text-white/84",
      ].join(" ")}
    >
      {active ? (
        <span className="pointer-events-none absolute inset-y-2 left-0 w-px rounded-full bg-[#63a1ff]" />
      ) : null}

      <span
        className={[
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-[10px] transition-all duration-200",
          active
            ? "bg-[#142548] text-white"
            : "bg-white/[0.035] text-white/42 group-hover:bg-white/[0.055] group-hover:text-white/72",
        ].join(" ")}
      >
        {icon}
      </span>
      {!collapsed && <span className="truncate">{children}</span>}
    </Link>
  )
}

function NavGroup({
  title,
  children,
  collapsed = false,
}: {
  title: string
  children: ReactNode
  collapsed?: boolean
}) {
  return (
    <div className="relative z-10">
      {!collapsed && (
        <div className="mb-1.5 px-2.5 text-[9px] font-black uppercase tracking-[0.2em] text-white/25">
          {title}
        </div>
      )}
      <div className="space-y-1">{children}</div>
    </div>
  )
}

export default function EventLayout({
  children,
}: {
  children: ReactNode
}) {
  const params = useParams()
  const pathname = usePathname()

  const id = String(params.id)

  const base = `/admin/events/${id}`
  const producerPath = `${base}/producer`
  const isProducerWorkspace = pathname === producerPath || pathname.startsWith(producerPath + "/")

  const shortId = id.length > 8 ? id.slice(0, 8) : id
  const [collapsed, setCollapsed] = useState(false)
  const [eventContext, setEventContext] = useState<EventWorkspaceContext | null>(null)

  const loadEventContext = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch(`/api/admin/events/${id}/workspace-context`, {
        cache: "no-store",
        signal,
      })

      if (!response.ok) throw new Error("Failed to load event context")
      setEventContext((await response.json()) as EventWorkspaceContext)
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === "AbortError") return
      console.error("Event workspace context failed to load", error)
    }
  }, [id])

  useEffect(() => {
    const controller = new AbortController()
    const refresh = (): void => {
      void loadEventContext(controller.signal)
    }

    refresh()
    const interval = window.setInterval(refresh, 15_000)
    window.addEventListener("jupiter:event-context-updated", refresh)

    return () => {
      controller.abort()
      window.clearInterval(interval)
      window.removeEventListener("jupiter:event-context-updated", refresh)
    }
  }, [loadEventContext])

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const stored = window.localStorage.getItem(EVENT_WORKSPACE_RAIL_STORAGE_KEY)

      if (stored === "collapsed") {
        setCollapsed(true)
        return
      }

      if (stored === "expanded") {
        setCollapsed(false)
        return
      }

      if (isProducerWorkspace) setCollapsed(true)
    })

    return () => window.cancelAnimationFrame(frame)
  }, [isProducerWorkspace])

  function toggleCollapsed() {
    setCollapsed((value) => {
      const next = !value
      window.localStorage.setItem(
        EVENT_WORKSPACE_RAIL_STORAGE_KEY,
        next ? "collapsed" : "expanded"
      )
      return next
    })
  }

  const eventStatus = eventContext?.hasLiveSession
    ? "Live"
    : eventContext?.access === "open"
      ? "Open"
      : "Closed"
  const canConfigure = !eventContext || eventContext.isGlobalAdmin || eventContext.teamRole === "event_admin"
  const canOperate = canConfigure || eventContext?.teamRole === "producer"

  return (
    <div
      className={[
        EVENT_WORKSPACE_GRID_CLASS,
        collapsed
          ? "xl:grid-cols-[72px_minmax(0,1fr)]"
          : "xl:grid-cols-[220px_minmax(0,1fr)]",
      ].join(" ")}
    >
      <aside
        className={[
          EVENT_WORKSPACE_SHELL_CLASS,
          "hidden xl:block",
          collapsed ? "p-2 pt-11" : "p-2.5",
        ].join(" ")}
      >
        <div className={EVENT_WORKSPACE_SHELL_TEXTURE_CLASS} />
        <div className={EVENT_WORKSPACE_SHELL_GLOW_CLASS} />

        <button
          type="button"
          onClick={toggleCollapsed}
          className={EVENT_WORKSPACE_TOGGLE_CLASS}
          aria-label={collapsed ? "Expand event workspace sidebar" : "Collapse event workspace sidebar"}
          title={collapsed ? "Expand workspace" : "Collapse workspace"}
        >
          <ChevronLeft
            strokeWidth={1.8}
            className={`h-3.5 w-3.5 ${collapsed ? "rotate-180 transition-transform" : "transition-transform"}`}
          />
        </button>

        {collapsed && eventContext?.hasLiveSession && (
          <div
            className="relative z-10 mb-2 flex flex-col items-center gap-1 text-[8px] font-black uppercase tracking-[0.18em] text-rose-300/90"
            title="Event running"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
            Running
          </div>
        )}

        {!collapsed && (
          <div className={EVENT_WORKSPACE_CARD_CLASS}>
            <div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#8fa1c5]">Event admin</div>
            <div className="mt-2 text-xl font-semibold tracking-[-0.03em] text-white">Mission Control</div>
            <div className="mt-6 text-[9px] font-semibold uppercase tracking-[0.18em] text-[#7182a6]">Current event</div>
            <div className="mt-2 line-clamp-2 text-sm font-semibold leading-snug text-white/92" title={eventContext?.title}>
              {eventContext?.title || `Event ${shortId}`}
            </div>
            {eventContext?.hasLiveSession ? (
              <div className="mt-2 space-y-1.5">
                <div className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-rose-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                  <span>Event running</span>
                </div>
                <div className="text-[9px] font-medium uppercase tracking-[0.12em] text-white/38">
                  {formatEventDate(eventContext?.startAt ?? null, eventContext?.endAt ?? null)}
                </div>
              </div>
            ) : (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-emerald-300/90">
                <span>{eventStatus}</span><span>/</span><span>{formatEventDate(eventContext?.startAt ?? null, eventContext?.endAt ?? null)}</span>
              </div>
            )}
          </div>
        )}

        <nav className={collapsed ? "relative z-10 space-y-2" : "relative z-10 space-y-3"}>
          <NavGroup title="Setup" collapsed={collapsed}>
            <NavItem href={base} icon={<BarChart08 className="h-4 w-4" strokeWidth={1.75} />} label="Overview" collapsed={collapsed} exact>
              Overview
            </NavItem>
            {canConfigure ? <NavItem href={`${base}/settings`} icon={<File04 className="h-4 w-4" strokeWidth={1.75} />} label="Event Details" collapsed={collapsed}>
              Event Details
            </NavItem> : null}
            {canConfigure ? <NavItem href={`${base}/attendees`} icon={<Users01 className="h-4 w-4" strokeWidth={1.75} />} label="People" collapsed={collapsed}>
              People
            </NavItem> : null}
            {canConfigure ? <NavItem href={`${base}/sessions`} icon={<CalendarDate className="h-4 w-4" strokeWidth={1.75} />} label="Program" collapsed={collapsed}>
              Program
            </NavItem> : null}
            {canConfigure ? <NavItem href={`${base}/page-editor`} icon={<LayersThree01 className="h-4 w-4" strokeWidth={1.75} />} label="Experience" collapsed={collapsed}>
              Experience
            </NavItem> : null}
            {canConfigure ? <NavItem href={`${base}/emails`} icon={<Mail02 className="h-4 w-4" strokeWidth={1.75} />} label="Communications" collapsed={collapsed}>
              Communications
            </NavItem> : null}
            {canConfigure ? <NavItem href={`${base}/publishing`} icon={<UploadCloud01 className="h-4 w-4" strokeWidth={1.75} />} label="Publish" collapsed={collapsed}>
              Publish
            </NavItem> : null}
            {canConfigure ? <NavItem href={`${base}/sponsors`} icon={<Image03 className="h-4 w-4" strokeWidth={1.75} />} label="Media & Sponsors" collapsed={collapsed}>
              Media & Sponsors
            </NavItem> : null}
          </NavGroup>

          {canOperate ? <NavGroup title="Live" collapsed={collapsed}>
            <NavItem
              href={`${base}/routing`}
              icon={<Signal02 className="h-4 w-4" strokeWidth={1.75} />}
              label="Run Event"
              collapsed={collapsed}
            >
              Run Event
            </NavItem>
            <NavItem
              href={`${base}/agenda`}
              icon={<List className="h-4 w-4" strokeWidth={1.75} />}
              label="Run of Show"
              collapsed={collapsed}
            >
              Run of Show
            </NavItem>
            <NavItem
              href={`${base}/producer/room`}
              icon={<VideoRecorder className="h-4 w-4" strokeWidth={1.75} />}
              label="Producer Room"
              collapsed={collapsed}
            >
              Producer Room
            </NavItem>
          </NavGroup> : null}

          <NavGroup title="Review" collapsed={collapsed}>
            <NavItem href={`${base}/analytics`} icon={<BarChart08 className="h-4 w-4" strokeWidth={1.75} />} label="Analytics" collapsed={collapsed}>
              Analytics
            </NavItem>
          </NavGroup>
        </nav>

        {!collapsed && (
          <Link href="/admin/events" className={`${EVENT_WORKSPACE_FOOTER_CARD_CLASS} flex items-center gap-2 hover:text-white/72`}>
            <span aria-hidden>←</span> All events
          </Link>
        )}
      </aside>

      <section className={EVENT_WORKSPACE_SECTION_CLASS}>
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.055] to-transparent" />
        <details className="sticky top-16 z-40 border-b border-white/10 bg-[#050814]/95 px-4 py-3 backdrop-blur-2xl xl:hidden">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm font-semibold text-white marker:hidden">
            <span className="min-w-0 truncate">{eventContext?.title || `Event ${shortId}`}</span>
            <span className="shrink-0 text-xs font-medium text-sky-300">Event menu ↓</span>
          </summary>
          <nav className="mt-3 grid grid-cols-2 gap-2 pb-1 text-sm">
            <MobileEventLink href={base} label="Overview" />
            {canConfigure ? <MobileEventLink href={`${base}/settings`} label="Event Details" /> : null}
            {canConfigure ? <MobileEventLink href={`${base}/attendees`} label="People" /> : null}
            {canConfigure ? <MobileEventLink href={`${base}/sessions`} label="Program" /> : null}
            {canConfigure ? <MobileEventLink href={`${base}/page-editor`} label="Experience" /> : null}
            {canConfigure ? <MobileEventLink href={`${base}/emails`} label="Communications" /> : null}
            {canConfigure ? <MobileEventLink href={`${base}/publishing`} label="Publish" /> : null}
            {canConfigure ? <MobileEventLink href={`${base}/sponsors`} label="Media & Sponsors" /> : null}
            {canOperate ? <MobileEventLink href={`${base}/routing`} label="Run Event" /> : null}
            {canOperate ? <MobileEventLink href={`${base}/agenda`} label="Run of Show" /> : null}
            {canOperate ? <MobileEventLink href={`${base}/producer/room`} label="Producer Room" /> : null}
            <MobileEventLink href={`${base}/analytics`} label="Analytics" />
          </nav>
        </details>
        <div className="relative min-w-0 p-0">
          {children}
        </div>
      </section>
    </div>
  )
}

function MobileEventLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname()
  const active = isActive(pathname, href, href.split("/").length === 4)

  return (
    <Link
      href={href}
      className={`flex min-h-11 items-center rounded-xl border px-3 font-medium ${active ? "border-sky-400/45 bg-sky-400/10 text-white" : "border-white/8 bg-white/[0.025] text-white/65"}`}
    >
      {label}
    </Link>
  )
}
