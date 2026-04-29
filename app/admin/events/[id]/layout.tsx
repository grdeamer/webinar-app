"use client"

import Link from "next/link"
import { useParams, usePathname } from "next/navigation"
import { ReactNode } from "react"
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
} from "lucide-react"

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/")
}

function NavItem({
  href,
  icon,
  children,
}: {
  href: string
  icon: ReactNode
  children: ReactNode
}) {
  const pathname = usePathname()
  const active = isActive(pathname, href)

  return (
    <Link
      href={href}
      className={[
        "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
        active
          ? "bg-violet-400/15 text-white shadow-[inset_0_0_0_1px_rgba(196,181,253,0.18)]"
          : "text-white/58 hover:bg-white/[0.06] hover:text-white",
      ].join(" ")}
    >
      <span
        className={[
          "flex h-8 w-8 items-center justify-center rounded-lg transition",
          active
            ? "bg-violet-300/15 text-violet-100"
            : "bg-white/[0.04] text-white/45 group-hover:text-white/75",
        ].join(" ")}
      >
        {icon}
      </span>
      <span className="truncate">{children}</span>
    </Link>
  )
}

function NavGroup({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <div>
      <div className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/28">
        {title}
      </div>
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
  const id = String(params.id)

  const base = `/admin/events/${id}`
  const shortId = id.length > 8 ? id.slice(0, 8) : id

  return (
    <div className="grid gap-4 xl:grid-cols-[240px_minmax(0,1fr)] 2xl:grid-cols-[250px_minmax(0,1fr)]">
      <aside className="rounded-3xl border border-white/10 bg-white/[0.035] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        <div className="mb-3 rounded-2xl border border-violet-300/10 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.18),transparent_45%),rgba(255,255,255,0.035)] p-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-violet-100/50">
            Event Workspace
          </div>
          <div className="mt-2 truncate text-base font-semibold text-white">
            Event {shortId}
          </div>
          <div className="mt-1 text-xs text-white/42">
            Configure, produce, and measure this event.
          </div>
        </div>

        <nav className="space-y-4">
          <NavGroup title="Manage">
            <NavItem href={base} icon={<LayoutDashboard size={16} />}>
              Overview
            </NavItem>
            <NavItem href={`${base}/attendees`} icon={<Users size={16} />}>
              Registrants
            </NavItem>
            <NavItem href={`${base}/sessions`} icon={<CalendarDays size={16} />}>
              Sessions
            </NavItem>
          <NavItem href={`${base}/emails`} icon={<Mail size={16} />}>
            Emails
          </NavItem>
          </NavGroup>

          <NavGroup title="Live">
            <NavItem href={`${base}/producer`} icon={<Radio size={16} />}>
              Broadcast
            </NavItem>
            <NavItem href={`${base}/page-editor`} icon={<Sparkles size={16} />}>
              Experience
            </NavItem>
            <NavItem href={`${base}/studio`} icon={<Clapperboard size={16} />}>
              Studio
            </NavItem>
            <NavItem href={`${base}/sponsors`} icon={<ImageIcon size={16} />}>
              Assets
            </NavItem>
          </NavGroup>

          <NavGroup title="Measure">
            <NavItem href={`${base}/analytics`} icon={<BarChart3 size={16} />}>
              Analytics
            </NavItem>
          </NavGroup>
        </nav>

        <div className="mt-4 rounded-2xl border border-white/8 bg-black/15 p-3 text-xs text-white/42">
          <div className="mb-1 flex items-center gap-2 font-semibold text-white/65">
            <FileText size={13} /> Event workspace
          </div>
          Local tools for this event live here. Global tools stay in the main
          admin sidebar.
        </div>
      </aside>

      <section className="min-w-0 pr-2">{children}</section>
    </div>
  )
}