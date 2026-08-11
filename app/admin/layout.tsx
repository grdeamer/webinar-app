"use client"

import Link from "next/link"
import { ReactNode } from "react"
import { usePathname } from "next/navigation"
import {
  Activity,
  Calendar,
  LayoutDashboard,
  Radio,
  Users,
  Wrench,
  ArrowLeft,
  Satellite,
} from "lucide-react"
import JupiterLogo from "@/components/brand/JupiterLogo"

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

function AdminPlanetBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed right-[4%] top-[-76px] z-[15] h-[228px] w-[300px] overflow-visible"
    >
      <div className="absolute right-8 top-0 h-[210px] w-[210px] rounded-full border border-blue-100/40 bg-[radial-gradient(circle_at_30%_25%,rgba(225,236,255,0.96),rgba(103,153,255,0.88)_11%,rgba(38,82,180,0.98)_39%,rgba(8,23,65,0.99)_70%,rgba(2,7,22,1)_100%)] opacity-90 shadow-[0_0_28px_rgba(117,168,255,0.58),0_0_90px_rgba(54,107,230,0.48),inset_-34px_-28px_48px_rgba(0,0,0,0.66)]" />
      <div className="absolute -right-2 top-[80px] h-[58px] w-[300px] rotate-[-13deg] rounded-[50%] border-[3px] border-blue-100/65 opacity-95 shadow-[0_0_20px_rgba(124,175,255,0.76)]" />
      <div className="absolute right-5 top-[92px] h-[34px] w-[244px] rotate-[-13deg] rounded-[50%] border border-indigo-200/55 opacity-90" />
      <div className="absolute right-14 top-8 h-[150px] w-[150px] rounded-full bg-blue-300/25 blur-3xl" />
    </div>
  )
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const isProducerWorkspace = /^\/admin\/events\/[^/]+\/producer(?:\/.*)?$/.test(pathname)
  const producerMatch = pathname.match(/^\/admin\/events\/([^/]+)\/producer(?:\/.*)?$/)
  const producerEventId = producerMatch?.[1]
  const isPageEditorWorkspace = pathname.startsWith("/admin/page-editor/event/")

  if (isProducerWorkspace) {
    return (
      <div className="min-h-screen bg-transparent text-white">
        <main className="relative min-h-screen p-2 pt-16 lg:p-3 lg:pt-[72px] 2xl:p-4 2xl:pt-[76px]">
          {producerEventId ? (
            <div className="fixed left-3 right-3 top-3 z-50 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.82),rgba(2,6,23,0.72))] px-2.5 py-2 shadow-[0_18px_60px_rgba(0,0,0,0.34)] backdrop-blur-2xl lg:left-4 lg:right-4 lg:top-4">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-violet-300/15 bg-violet-300/10 text-violet-100/75">
                  <Satellite size={14} />
                </span>
                <div className="hidden min-w-0 sm:block">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-violet-100/42">
                    Producer Workspace
                  </div>
                  <div className="truncate text-xs font-semibold text-white/72">
                    Fullscreen broadcast mode
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <Link
                  href={`/admin/events/${producerEventId}`}
                  className="flex h-8 items-center gap-2 rounded-xl border border-transparent px-2.5 text-xs font-semibold text-white/62 transition hover:border-white/10 hover:bg-white/8 hover:text-white"
                  title="Back to event dashboard"
                >
                  <ArrowLeft size={14} />
                  Event
                </Link>
                <Link
                  href="/access"
                  className="rounded-xl border border-violet-300/15 bg-violet-300/10 px-2.5 py-1.5 text-xs font-semibold text-violet-100/75 transition hover:border-violet-200/30 hover:bg-violet-300/15 hover:text-violet-50"
                >
                  Attendee View
                </Link>
              </div>
            </div>
          ) : null}
          {children}
        </main>
      </div>
    )
  }

  return (
    <div
      className={`${
        isPageEditorWorkspace ? "h-screen overflow-hidden" : "min-h-screen"
      } bg-transparent text-white`}
    >
      <AdminPlanetBackdrop />
      <div
        className={`flex ${
          isPageEditorWorkspace ? "h-full min-h-0" : "min-h-screen"
        }`}
      >
        <aside
          className={`${
            isPageEditorWorkspace ? "h-full" : ""
          } w-[288px] border-r border-white/10 bg-[#050816]/78 backdrop-blur-2xl`}
        >
          <div className="flex h-full flex-col">
            <div className="px-5 py-5">
              <div className="flex items-center gap-3">
                <div className="min-w-0">
                  <JupiterLogo
                    className="text-white"
                    markClassName="h-9 w-9 shrink-0"
                    wordmarkClassName="text-sm font-bold tracking-[0.18em]"
                  />
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
              <Section title="Global">
                <NavLink href="/admin" icon={<LayoutDashboard size={17} />}>
                  Dashboard
                </NavLink>
                <NavLink href="/admin/events" icon={<Calendar size={17} />}>
                  Events
                </NavLink>
                <NavLink href="/admin/activity" icon={<Activity size={17} />}>
                  Live Activity
                </NavLink>
              </Section>

              <Section title="Administration">
                <NavLink href="/admin/users" icon={<Users size={17} />}>
                  Users
                </NavLink>
                <NavLink href="/admin/dev-tools" icon={<Wrench size={17} />}>
                  Dev Tools
                </NavLink>
              </Section>
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

        <div
          className={`flex min-w-0 flex-1 flex-col ${
            isPageEditorWorkspace ? "h-full min-h-0" : "min-h-screen"
          }`}
        >
          <header className="sticky top-0 z-20 shrink-0 border-b border-white/10 bg-slate-950/45 backdrop-blur-xl">
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

          <main
            className={`flex-1 p-8 lg:p-10 ${
              isPageEditorWorkspace ? "min-h-0 overflow-hidden" : ""
            }`}
          >
            <div
              className={`w-full ${
                isPageEditorWorkspace ? "h-full min-h-0" : ""
              }`}
            >
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
