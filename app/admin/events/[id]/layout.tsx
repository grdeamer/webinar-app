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
        "group flex items-center rounded-xl py-2 text-[13px] font-medium transition",
        collapsed ? "justify-center px-1.5" : "gap-2 px-2.5",
        active
          ? "bg-violet-400/15 text-white shadow-[inset_0_0_0_1px_rgba(196,181,253,0.18)]"
          : "text-white/58 hover:bg-white/[0.06] hover:text-white",
      ].join(" ")}
    >
      <span
        className={[
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition",
          active
            ? "bg-violet-300/15 text-violet-100"
            : "bg-white/[0.04] text-white/45 group-hover:text-white/75",
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
    <div>
      {!collapsed && (
        <div className="mb-1 px-2.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-white/28">
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
    const stored = window.localStorage.getItem("jupiter:eventWorkspaceRail")

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
        "jupiter:eventWorkspaceRail",
        next ? "collapsed" : "expanded"
      )
      return next
    })
  }

  return (
    <div
      className={[
        "grid gap-3 transition-all duration-300",
        collapsed
          ? "xl:grid-cols-[72px_minmax(0,1fr)]"
          : "xl:grid-cols-[184px_minmax(0,1fr)] 2xl:grid-cols-[196px_minmax(0,1fr)]",
      ].join(" ")}
    >
      <aside
        className={[
          "relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-all duration-300",
          collapsed ? "p-2 pt-11" : "p-2.5",
        ].join(" ")}
      >
        <button
          type="button"
          onClick={toggleCollapsed}
          className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-black/20 text-white/45 transition hover:border-violet-300/20 hover:bg-violet-400/10 hover:text-white"
          aria-label={collapsed ? "Expand event workspace sidebar" : "Collapse event workspace sidebar"}
          title={collapsed ? "Expand workspace" : "Collapse workspace"}
        >
          <PanelLeftClose
            size={14}
            className={collapsed ? "rotate-180 transition-transform" : "transition-transform"}
          />
        </button>
        {collapsed && isProducerWorkspace && (
          <div className="mb-2 flex justify-center text-[8px] font-semibold uppercase tracking-[0.18em] text-violet-100/35">
            Live
          </div>
        )}
        {!collapsed && (
          <div className="mb-2.5 rounded-2xl border border-violet-300/10 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.14),transparent_45%),rgba(255,255,255,0.03)] p-3 pr-10">
            <div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-violet-100/48">
              Event Workspace
            </div>
            <div className="mt-1.5 truncate text-sm font-semibold text-white">
              Event {shortId}
            </div>
            <div className="mt-1 text-[11px] leading-snug text-white/38">
              Configure, produce, and measure.
            </div>
          </div>
        )}

        <nav className={collapsed ? "space-y-2" : "space-y-3"}>
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
          <div className="mt-3 rounded-2xl border border-white/8 bg-black/15 p-2.5 text-[11px] leading-snug text-white/38">
            <div className="mb-1 flex items-center gap-1.5 font-semibold text-white/62">
              <FileText size={13} /> Event workspace
            </div>
            Local tools for this event live here. Global tools stay in the main
            admin sidebar.
          </div>
        )}
      </aside>

      <section className="min-w-0 pr-1">{children}</section>
    </div>
  )
}