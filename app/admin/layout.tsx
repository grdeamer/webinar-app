"use client"

import Link from "next/link"
import { ReactNode } from "react"
import { usePathname } from "next/navigation"
import {
  Activity,
  BarChart3,
  Building2,
  Calendar,
  LayoutDashboard,
  MessageSquare,
  Mic,
  Monitor,
  Radio,
  Upload,
  Users,
  Video,
  Wrench,
} from "lucide-react"

function matches(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin"
  return pathname === href || pathname.startsWith(`${href}/`)
}

function navClass(active: boolean) {
  return [
    "group relative flex items-center gap-3 overflow-hidden rounded-2xl border px-4 py-3 text-sm font-medium transition-all duration-200",
    active
      ? "border-sky-400/25 bg-gradient-to-r from-sky-500/20 via-cyan-400/10 to-transparent text-white shadow-[0_0_0_1px_rgba(56,189,248,0.08),0_10px_30px_rgba(14,165,233,0.12)]"
      : "border-white/10 bg-slate-800/50 text-white/80 hover:border-white/15 hover:bg-slate-800/70 hover:text-white",
  ].join(" ")
}

function iconWrapClass(active: boolean) {
  return [
    "flex h-9 w-9 items-center justify-center rounded-xl border transition-all duration-200",
    active
      ? "border-sky-300/20 bg-sky-400/15 text-sky-100"
      : "border-white/10 bg-slate-800/70 text-white/65 group-hover:border-white/15 group-hover:bg-slate-700/80 group-hover:text-white",
  ].join(" ")
}

function NavLink({
  href,
  icon,
  children,
}: {
  href: string
  icon: ReactNode
  children: ReactNode
}) {
  const pathname = usePathname()
  const active = matches(pathname, href)

  return (
    <Link href={href} className={navClass(active)}>
      {active ? (
        <span className="absolute inset-y-2 left-1 w-1 rounded-full bg-sky-300/90 shadow-[0_0_14px_rgba(125,211,252,0.9)]" />
      ) : null}

      <span className={iconWrapClass(active)}>{icon}</span>

      <span className="flex-1">{children}</span>

      <span
        className={[
          "h-2.5 w-2.5 rounded-full transition-all duration-200",
          active
            ? "bg-sky-300 shadow-[0_0_14px_rgba(125,211,252,0.9)]"
            : "bg-white/15 group-hover:bg-white/30",
        ].join(" ")}
      />
    </Link>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <div>
      <div className="mb-3 px-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/35">
        {title}
      </div>
      <nav className="space-y-2">{children}</nav>
    </div>
  )
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.15),transparent_22%),radial-gradient(circle_at_bottom_left,rgba(168,85,247,0.12),transparent_25%),linear-gradient(180deg,#020617_0%,#1e293b_100%)] text-white">
      <div className="flex min-h-screen">
        <aside className="w-80 border-r border-white/10 bg-slate-900/60 backdrop-blur-xl">
          <div className="flex h-full flex-col">
            <div className="border-b border-white/10 px-6 py-6">
              <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 via-white/[0.06] to-white/[0.03] p-5 shadow-2xl shadow-black/25">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 via-cyan-300 to-teal-300 text-lg font-black text-slate-950 shadow-lg shadow-sky-500/20">
                    A
                  </div>

                  <div>
                    <h2 className="text-lg font-bold tracking-tight">
                      Admin Console
                    </h2>
                    <p className="text-xs text-white/50">
                      Event &amp; Webinar Control
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-medium text-emerald-200">
                    Live System
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-white/60">
                    Internal
                  </span>
                </div>
              </div>
            </div>

            <div className="flex-1 space-y-8 overflow-y-auto px-5 py-6">
              <Section title="Main">
                <NavLink href="/admin" icon={<LayoutDashboard size={18} />}>
                  Dashboard
                </NavLink>

                <NavLink href="/admin/activity" icon={<Activity size={18} />}>
                  Operations
                </NavLink>

                <NavLink href="/admin/live" icon={<Radio size={18} />}>
                  Live Monitor
                </NavLink>

                <NavLink href="/admin/analytics" icon={<BarChart3 size={18} />}>
                  Analytics
                </NavLink>
              </Section>

              <Section title="Broadcast">
                <NavLink href="/admin/general-session" icon={<Video size={18} />}>
                  General Session
                </NavLink>

                <NavLink href="/admin/qa" icon={<MessageSquare size={18} />}>
                  Q&amp;A Control
                </NavLink>

                <NavLink href="/presenter" icon={<Mic size={18} />}>
                  Presenter Mode
                </NavLink>
              </Section>

              <Section title="Content">
                <NavLink href="/admin/events" icon={<Calendar size={18} />}>
                  Events
                </NavLink>

                <NavLink href="/admin/import" icon={<Upload size={18} />}>
                  Import Registrants
                </NavLink>

                <NavLink href="/admin/sponsors" icon={<Building2 size={18} />}>
                  Sponsors
                </NavLink>

                <NavLink href="/admin/speakers" icon={<Users size={18} />}>
                  Speakers
                </NavLink>
              </Section>

              <Section title="Platform">
                <NavLink href="/admin/webinars" icon={<Monitor size={18} />}>
                  Webinars
                </NavLink>

                <NavLink href="/admin/users" icon={<Users size={18} />}>
                  Users
                </NavLink>

                <NavLink href="/admin/dev-tools" icon={<Wrench size={18} />}>
                  Dev Tools
                </NavLink>
              </Section>
            </div>
          </div>
        </aside>

        <main className="flex-1 p-8 lg:p-10">{children}</main>
      </div>
    </div>
  )
}