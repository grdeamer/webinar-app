"use client"

import Link from "next/link"
import { ReactNode } from "react"
import { usePathname } from "next/navigation"
import {
  Activity,
  BarChart3,
  Calendar,
  LayoutDashboard,
  MessageSquare,
  Mic,
  Monitor,
  Radio,
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
      ? "border-amber-300/20 bg-gradient-to-r from-orange-400/18 via-amber-300/10 to-transparent text-white shadow-[0_0_0_1px_rgba(251,191,36,0.06),0_12px_34px_rgba(249,115,22,0.14)]"
      : "border-white/10 bg-slate-900/45 text-white/80 hover:border-white/15 hover:bg-slate-800/65 hover:text-white",
  ].join(" ")
}

function iconWrapClass(active: boolean) {
  return [
    "flex h-9 w-9 items-center justify-center rounded-xl border transition-all duration-200",
    active
      ? "border-amber-200/20 bg-orange-400/15 text-amber-50"
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
        <span className="absolute inset-y-2 left-1 w-1 rounded-full bg-amber-300/90 shadow-[0_0_16px_rgba(252,211,77,0.9)]" />
      ) : null}

      <span className={iconWrapClass(active)}>{icon}</span>

      <span className="flex-1">{children}</span>

      <span
        className={[
          "h-2.5 w-2.5 rounded-full transition-all duration-200",
          active
            ? "bg-amber-300 shadow-[0_0_14px_rgba(252,211,77,0.9)]"
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
      <div className="mb-3 px-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/35">
        {title}
      </div>
      <nav className="space-y-2">{children}</nav>
    </div>
  )
}

function JupiterMark() {
  return (
    <div className="relative h-12 w-12">
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-orange-300 via-amber-500 to-orange-700 shadow-[0_0_30px_rgba(251,146,60,0.35)]" />
      <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_28%,rgba(255,255,255,0.38),transparent_28%),radial-gradient(circle_at_70%_70%,rgba(120,53,15,0.35),transparent_36%)]" />
      <div className="absolute left-[12%] top-[30%] h-2.5 w-8 rounded-full bg-white/12 blur-[1px]" />
      <div className="absolute left-[18%] top-[49%] h-2 w-7 rounded-full bg-amber-950/30 blur-[1px]" />
      <div className="absolute left-[10%] top-[62%] h-2 w-9 rounded-full bg-orange-950/25 blur-[1px]" />
      <div className="absolute left-1/2 top-1/2 h-5 w-[140%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-amber-100/20" />
    </div>
  )
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.12),transparent_22%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.12),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(168,85,247,0.10),transparent_24%),linear-gradient(180deg,#020617_0%,#0f172a_48%,#1e293b_100%)] text-white">
      <div className="flex min-h-screen">
        <aside className="w-80 border-r border-white/10 bg-slate-950/55 backdrop-blur-xl">
          <div className="flex h-full flex-col">
            <div className="border-b border-white/10 px-6 py-6">
              <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 via-white/[0.06] to-white/[0.03] p-5 shadow-2xl shadow-black/30">
                <div className="flex items-center gap-3">
                  <JupiterMark />

                  <div>
                    <h2 className="text-lg font-bold tracking-tight">
                      Jupiter Mission Control
                    </h2>
                    <p className="text-xs text-white/50">
                      Event, broadcast, and audience operations
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-medium text-emerald-200">
                    Live System
                  </span>
                  <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-2.5 py-1 text-[11px] font-medium text-amber-100">
                    Jupiter.events
                  </span>
                </div>
              </div>
            </div>

            <div className="flex-1 space-y-8 overflow-y-auto px-5 py-6">
              <Section title="Mission Overview">
                <NavLink href="/admin" icon={<LayoutDashboard size={18} />}>
                  Dashboard
                </NavLink>

                <NavLink href="/admin/events" icon={<Calendar size={18} />}>
                  Events
                </NavLink>

                <NavLink href="/admin/activity" icon={<Activity size={18} />}>
                  Live Activity
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

            <div className="border-t border-white/10 px-5 py-4">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <div className="text-xs uppercase tracking-[0.22em] text-white/40">
                  Quick Links
                </div>
                <div className="mt-3 flex flex-col gap-2 text-sm">
                  <Link href="/" className="text-white/70 transition hover:text-white">
                    View Jupiter homepage
                  </Link>
                  <Link href="/access" className="text-white/70 transition hover:text-white">
                    Open attendee access
                  </Link>
                  <Link href="/general-session" className="text-white/70 transition hover:text-white">
                    Open general session
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/45 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-4 px-8 py-5 lg:px-10">
              <div>
                <div className="text-xs uppercase tracking-[0.24em] text-white/40">
                  Jupiter.events Admin
                </div>
                <div className="mt-1 text-2xl font-semibold tracking-tight">
                  Mission Control
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  href="/access"
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10 hover:text-white"
                >
                  Attendee View
                </Link>
                <Link
                  href="/"
                  className="rounded-xl border border-amber-300/20 bg-amber-300/10 px-4 py-2 text-sm text-amber-100 transition hover:bg-amber-300/15"
                >
                  Jupiter Home
                </Link>
              </div>
            </div>
          </header>

          <main className="flex-1 p-8 lg:p-10">
            <div className="w-full">{children}</div>
          </main>
        </div>
      </div>
    </div>
  )
}