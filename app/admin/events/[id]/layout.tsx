"use client"

import Link from "next/link"
import { useParams, usePathname } from "next/navigation"
import { ReactNode, useEffect, useState } from "react"
import {
  BarChart3,
  CalendarDays,
  Clapperboard,
  FileText,
  ImageIcon,
  LayoutDashboard,
  Mail,
  Radio,
  Sparkles,
  Users,
  PanelLeftClose,
} from "lucide-react"

const EVENT_WORKSPACE_RAIL_STORAGE_KEY = "jupiter:eventWorkspaceRail"

const EVENT_WORKSPACE_GRID_CLASS =
  "grid min-h-0 gap-3 transition-all duration-300"

const EVENT_WORKSPACE_SHELL_CLASS =
  "relative isolate overflow-hidden rounded-[22px] border border-white/[0.075] bg-[linear-gradient(180deg,rgba(7,11,20,0.92),rgba(3,6,13,0.98))] shadow-[0_18px_56px_rgba(0,0,0,0.26),inset_0_1px_0_rgba(255,255,255,0.045)] transition-all duration-300"

const EVENT_WORKSPACE_SHELL_TEXTURE_CLASS =
  "pointer-events-none absolute inset-0 opacity-[0.018] bg-[repeating-linear-gradient(to_bottom,rgba(255,255,255,0.018)_0px,rgba(255,255,255,0.018)_1px,transparent_1px,transparent_18px)]"

const EVENT_WORKSPACE_SHELL_GLOW_CLASS =
  "pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-100/[0.10] to-transparent"

const EVENT_WORKSPACE_TOGGLE_CLASS =
  "absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.09] bg-black/24 text-white/45 shadow-[inset_0_1px_0_rgba(255,255,255,0.030)] transition hover:border-violet-300/22 hover:bg-violet-400/10 hover:text-white"

const EVENT_WORKSPACE_CARD_CLASS =
  "relative z-10 mb-2.5 overflow-hidden rounded-[18px] border border-violet-200/[0.105] bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.16),transparent_45%),linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.018))] p-3 pr-10 shadow-[inset_0_1px_0_rgba(255,255,255,0.040)]"

const EVENT_WORKSPACE_FOOTER_CARD_CLASS =
  "relative z-10 mt-3 rounded-[18px] border border-white/[0.07] bg-black/18 p-2.5 text-[11px] leading-snug text-white/38 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]"

const EVENT_WORKSPACE_SECTION_CLASS =
  "relative min-w-0 overflow-hidden rounded-[24px] border border-white/[0.045] bg-[linear-gradient(180deg,rgba(6,10,18,0.55),rgba(2,4,9,0.18))] shadow-[inset_0_1px_0_rgba(255,255,255,0.020)]"

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
          ? "border border-violet-200/[0.14] bg-violet-300/[0.105] text-white shadow-[0_0_24px_rgba(168,85,247,0.055),inset_0_1px_0_rgba(255,255,255,0.040)]"
          : "border border-transparent text-white/54 hover:border-white/[0.065] hover:bg-white/[0.045] hover:text-white/84",
      ].join(" ")}
    >
      {active ? (
        <span className="pointer-events-none absolute inset-y-2 left-0 w-px rounded-full bg-violet-200/42 shadow-[0_0_10px_rgba(196,181,253,0.32)]" />
      ) : null}

      <span
        className={[
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-[10px] transition-all duration-200",
          active
            ? "bg-violet-200/[0.14] text-violet-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.045)]"
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

  useEffect(() => {
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

  return (
    <div
      className={[
        EVENT_WORKSPACE_GRID_CLASS,
        collapsed
          ? "xl:grid-cols-[72px_minmax(0,1fr)]"
          : "xl:grid-cols-[184px_minmax(0,1fr)] 2xl:grid-cols-[196px_minmax(0,1fr)]",
      ].join(" ")}
    >
      <aside
        className={[
          EVENT_WORKSPACE_SHELL_CLASS,
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
          <PanelLeftClose
            size={14}
            className={collapsed ? "rotate-180 transition-transform" : "transition-transform"}
          />
        </button>

        {collapsed && isProducerWorkspace && (
          <div className="relative z-10 mb-2 flex justify-center text-[8px] font-black uppercase tracking-[0.18em] text-violet-100/38">
            Live
          </div>
        )}

        {!collapsed && (
          <div className={EVENT_WORKSPACE_CARD_CLASS}>
            <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-violet-100/16 to-transparent" />
            <div className="text-[9px] font-black uppercase tracking-[0.2em] text-violet-100/48">
              Event Workspace
            </div>
            <div className="mt-1.5 truncate text-sm font-semibold text-white/92">
              Event {shortId}
            </div>
            <div className="mt-1 text-[11px] leading-snug text-white/38">
              Configure, produce, and measure.
            </div>
          </div>
        )}

        <nav className={collapsed ? "relative z-10 space-y-2" : "relative z-10 space-y-3"}>
          <NavGroup title="Manage" collapsed={collapsed}>
            <NavItem href={base} icon={<LayoutDashboard size={16} />} label="Overview" collapsed={collapsed} exact>
              Overview
            </NavItem>
            <NavItem href={`${base}/attendees`} icon={<Users size={16} />} label="Registrants" collapsed={collapsed}>
              Registrants
            </NavItem>
            <NavItem href={`${base}/sessions`} icon={<CalendarDays size={16} />} label="Sessions" collapsed={collapsed}>
              Sessions
            </NavItem>
            <NavItem href={`${base}/emails`} icon={<Mail size={16} />} label="Emails" collapsed={collapsed}>
              Emails
            </NavItem>
          </NavGroup>

          <NavGroup title="Live" collapsed={collapsed}>
            <NavItem href={`${base}/producer`} icon={<Radio size={16} />} label="Broadcast" collapsed={collapsed}>
              Broadcast
            </NavItem>
            <NavItem href={`${base}/page-editor`} icon={<Sparkles size={16} />} label="Experience" collapsed={collapsed}>
              Experience
            </NavItem>
            <NavItem href={`${base}/studio`} icon={<Clapperboard size={16} />} label="Studio" collapsed={collapsed}>
              Studio
            </NavItem>
            <NavItem href={`${base}/sponsors`} icon={<ImageIcon size={16} />} label="Assets" collapsed={collapsed}>
              Assets
            </NavItem>
          </NavGroup>

          <NavGroup title="Measure" collapsed={collapsed}>
            <NavItem href={`${base}/analytics`} icon={<BarChart3 size={16} />} label="Analytics" collapsed={collapsed}>
              Analytics
            </NavItem>
          </NavGroup>
        </nav>

        {!collapsed && (
          <div className={EVENT_WORKSPACE_FOOTER_CARD_CLASS}>
            <div className="mb-1 flex items-center gap-1.5 font-semibold text-white/62">
              <FileText size={13} /> Event workspace
            </div>
            Local tools for this event live here. Global tools stay in the main
            admin sidebar.
          </div>
        )}
      </aside>

      <section className={EVENT_WORKSPACE_SECTION_CLASS}>
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.055] to-transparent" />
        <div className="relative min-w-0 p-0">
          {children}
        </div>
      </section>
    </div>
  )
}