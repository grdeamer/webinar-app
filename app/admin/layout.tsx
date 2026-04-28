"use client"

import Link from "next/link"
import { ReactNode } from "react"
import { usePathname } from "next/navigation"
import {
  Activity,
  BarChart3,
  Calendar,
  Clapperboard,
  LayoutDashboard,
  MessageSquare,
  Mic,
  Monitor,
  Radio,
  Sparkles,
  Users,
  Video,
  Wrench,
  Zap,
} from "lucide-react"

function matches(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin"
  return pathname === href || pathname.startsWith(`${href}/`)
}

function navClass(active: boolean) {
  return [
    "group relative flex items-center gap-3 overflow-hidden rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
    active
      ? "bg-violet-500/14 text-white shadow-[inset_0_0_0_1px_rgba(196,181,253,0.16),0_0_26px_rgba(168,85,247,0.16)]"
      : "text-white/62 hover:bg-white/[0.055] hover:text-white",
  ].join(" ")
}

function iconWrapClass(active: boolean) {
  return [
    "flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200",
    active
      ? "bg-violet-300/14 text-violet-100 shadow-[0_0_18px_rgba(196,181,253,0.16)]"
      : "bg-white/[0.035] text-white/48 group-hover:bg-white/[0.07] group-hover:text-white/80",
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
        <span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-violet-300 shadow-[0_0_18px_rgba(196,181,253,0.85)]" />
      ) : null}

      <span className={iconWrapClass(active)}>{icon}</span>
      <span className="flex-1 truncate">{children}</span>

      {active ? (
        <span className="h-1.5 w-1.5 rounded-full bg-violet-200 shadow-[0_0_12px_rgba(196,181,253,0.9)]" />
      ) : null}
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
      <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/30">
        {title}
      </div>
      <nav className="space-y-1">{children}</nav>
    </div>
  )
}

function JupiterMark() {
  return (
    <div className="relative h-9 w-9 shrink-0">
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-orange-200 via-amber-500 to-orange-800 shadow-[0_0_24px_rgba(251,146,60,0.28)]" />
      <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_28%,rgba(255,255,255,0.42),transparent_28%),radial-gradient(circle_at_70%_70%,rgba(120,53,15,0.35),transparent_36%)]" />
      <div className="absolute left-[12%] top-[33%] h-1.5 w-7 rounded-full bg-white/14 blur-[1px]" />
      <div className="absolute left-1/2 top-1/2 h-4 w-[140%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-amber-100/20" />
    </div>
  )
}

function QuickAction({
  href,
  icon,
  label,
}: {
  href: string
  icon: ReactNode
  label: string
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.035] px-3 py-2 text-xs font-semibold text-white/62 transition hover:border-violet-300/25 hover:bg-violet-400/10 hover:text-white"
    >
      <span className="text-violet-200/55 transition group-hover:text-violet-100">
        {icon}
      </span>
      {label}
    </Link>
  )
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(168,85,247,0.14),transparent_22%),radial-gradient(circle_at_top_right,rgba(56,189,248,0.10),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(245,158,11,0.08),transparent_24%),linear-gradient(180deg,#020617_0%,#07111f_48%,#0f172a_100%)] text-white">
      <div className="flex min-h-screen">
        <aside className="w-[360px] border-r border-white/10 bg-[#050816]/82 backdrop-blur-2xl">
          <div className="flex h-full flex-col">
            <div className="px-5 py-5">
              <div className="flex items-center gap-3">
                <JupiterMark />
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-bold tracking-tight text-white">
                    Jupiter
                  </h2>
                  <p className="text-[10px] uppercase tracking-[0.22em] text-white/35">
                    Mission Control
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-violet-300/12 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.14),transparent_42%),rgba(255,255,255,0.035)] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-violet-100/55">
                      System
                    </div>
                    <div className="mt-1 text-sm font-semibold text-white">
                      Live Ready
                    </div>
                  </div>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-emerald-300/20 bg-emerald-400/10 text-emerald-200">
                    <Radio size={15} />
                  </span>
                </div>
              </div>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto px-3 pb-4">
              <Section title="Overview">
                <NavLink href="/admin" icon={<LayoutDashboard size={17} />}>
                  Dashboard
                </NavLink>
                <NavLink href="/admin/events" icon={<Calendar size={17} />}>
                  Events
                </NavLink>
                <NavLink href="/admin/activity" icon={<Activity size={17} />}>
                  Live Activity
                </NavLink>
                <NavLink href="/admin/analytics" icon={<BarChart3 size={17} />}>
                  Analytics
                </NavLink>
              </Section>

              <Section title="Broadcast">
                <NavLink href="/admin/general-session" icon={<Video size={17} />}>
                  General Session
                </NavLink>
                <NavLink href="/admin/qa" icon={<MessageSquare size={17} />}>
                  Q&amp;A Control
                </NavLink>
                <NavLink href="/presenter" icon={<Mic size={17} />}>
                  Presenter Mode
                </NavLink>
                <NavLink href="/admin/graphics" icon={<Clapperboard size={17} />}>
                  Graphics
                </NavLink>
              </Section>

              <Section title="Platform">
                <NavLink href="/admin/webinars" icon={<Monitor size={17} />}>
                  Webinars
                </NavLink>
                <NavLink href="/admin/users" icon={<Users size={17} />}>
                  Users
                </NavLink>
                <NavLink href="/admin/dev-tools" icon={<Wrench size={17} />}>
                  Dev Tools
                </NavLink>
              </Section>

              <div className="px-2">
                <div className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/30">
                  Quick Actions
                </div>
                <div className="grid gap-2">
                  <QuickAction href="/access" icon={<Zap size={14} />} label="Attendee View" />
                  <QuickAction href="/" icon={<Sparkles size={14} />} label="Jupiter Home" />
                </div>
              </div>
            </div>

            <div className="border-t border-white/10 p-4">
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-400/15 text-sm font-black text-violet-100">
                  JD
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-white">
                    Producer Console
                  </div>
                  <div className="truncate text-xs text-white/40">
                    Jupiter.events Admin
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/45 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-4 px-6 py-3.5 lg:px-8">
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-white/35">
                  Jupiter.events Admin
                </div>
                <div className="mt-0.5 text-xl font-semibold tracking-tight">
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
                  className="rounded-xl border border-violet-300/20 bg-violet-300/10 px-4 py-2 text-sm text-violet-100 transition hover:bg-violet-300/15"
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