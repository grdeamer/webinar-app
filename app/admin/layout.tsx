"use client"

import Link from "next/link"
import { ReactNode } from "react"
import { usePathname } from "next/navigation"
import {
  Activity,
  ArrowLeft,
  CalendarDate,
  Home03,
  Signal02,
  Tool02,
  Users01,
} from "@untitledui/icons"
import JupiterLogo from "@/components/brand/JupiterLogo"

function matches(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin"
  return pathname === href || pathname.startsWith(`${href}/`)
}

function navClass(active: boolean) {
  return [
    "group relative flex items-center gap-3 overflow-hidden rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
    active
      ? "border border-[#397cff]/70 bg-[#0c1428] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
      : "text-white/62 hover:bg-white/[0.055] hover:text-white",
  ].join(" ")
}

function iconWrapClass(active: boolean) {
  return [
    "flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200",
    active
      ? "bg-[#142548] text-white"
      : "bg-white/[0.035] text-white/48 group-hover:bg-white/[0.07] group-hover:text-white/80",
  ].join(" ")
}

function NavLink({
  href,
  icon,
  children,
  compact = false,
}: {
  href: string
  icon: ReactNode
  children: ReactNode
  compact?: boolean
}) {
  const pathname = usePathname()
  const active = matches(pathname, href)

  return (
    <Link
      href={href}
      title={compact && typeof children === "string" ? children : undefined}
      className={`${navClass(active)} ${compact ? "flex-col justify-center gap-1 px-1 py-3 text-[10px]" : ""}`}
    >
      {active ? <span className="absolute inset-y-2 left-0 w-px rounded-full bg-[#63a1ff]" /> : null}
      <span className={iconWrapClass(active)}>{icon}</span>
      <span className={compact ? "truncate text-[9px] font-medium text-white/55" : "flex-1 truncate"}>{children}</span>
    </Link>
  )
}

function Section({
  title,
  children,
  compact = false,
}: {
  title: string
  children: ReactNode
  compact?: boolean
}) {
  return (
    <div>
      <div className={`${compact ? "sr-only" : "mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/30"}`}>
        {title}
      </div>
      <nav className="space-y-1">{children}</nav>
    </div>
  )
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const isProducerWorkspace = /^\/admin\/events\/[^/]+\/producer(?:\/.*)?$/.test(pathname)
  const producerMatch = pathname.match(/^\/admin\/events\/([^/]+)\/producer(?:\/.*)?$/)
  const producerEventId = producerMatch?.[1]
  const isPageEditorWorkspace = pathname.startsWith("/admin/page-editor/event/")
  const isEventWorkspace = /^\/admin\/events\/[^/]+(?:\/.*)?$/.test(pathname) && !isProducerWorkspace

  if (isProducerWorkspace) {
    return (
      <div className="min-h-screen bg-transparent text-white">
        <main className="relative min-h-screen p-2 pt-16 lg:p-3 lg:pt-[72px] 2xl:p-4 2xl:pt-[76px]">
          {producerEventId ? (
            <div className="fixed left-3 right-3 top-3 z-50 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.82),rgba(2,6,23,0.72))] px-2.5 py-2 shadow-[0_18px_60px_rgba(0,0,0,0.34)] backdrop-blur-2xl lg:left-4 lg:right-4 lg:top-4">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-violet-300/15 bg-violet-300/10 text-violet-100/75">
                  <Signal02 className="h-3.5 w-3.5" strokeWidth={1.8} />
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
                  <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.8} />
                  Event
                </Link>
                <Link
                  href="/access"
                  className="rounded-xl border border-violet-300/15 bg-violet-300/10 px-2.5 py-1.5 text-xs font-semibold text-violet-100/75 transition hover:border-violet-200/30 hover:bg-violet-300/15 hover:text-violet-50"
                >
                  Attendee Preview
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
      <div
        className={`flex ${
          isPageEditorWorkspace ? "h-full min-h-0" : "min-h-screen"
        }`}
      >
        <aside
          className={`${
            isPageEditorWorkspace ? "h-full" : ""
          } ${isEventWorkspace ? "w-[84px]" : "w-[288px]"} border-r border-white/10 bg-[#050816]/92 backdrop-blur-2xl`}
        >
          <div className="flex h-full flex-col">
            <div className={isEventWorkspace ? "px-2 py-5" : "px-5 py-5"}>
              <div className={isEventWorkspace ? "flex w-full justify-center" : "flex items-center gap-3"}>
                <div className={isEventWorkspace ? "w-full text-center" : "min-w-0"}>
                  <JupiterLogo
                    className={isEventWorkspace ? "mx-auto flex w-full justify-center text-white" : "text-white"}
                    markClassName={isEventWorkspace ? "h-8 w-8 shrink-0" : "h-9 w-9 shrink-0"}
                    wordmarkClassName={isEventWorkspace ? "hidden" : "text-sm font-bold tracking-[0.18em]"}
                  />
                  {isEventWorkspace ? (
                    <p className="mt-1 text-center text-[9px] font-semibold tracking-[0.14em] text-white/72">JUPITER</p>
                  ) : (
                    <p className="text-[10px] uppercase tracking-[0.22em] text-white/35">Mission Control</p>
                  )}
                </div>
              </div>

              {!isEventWorkspace ? <div className="mt-4 rounded-2xl border border-violet-300/12 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.14),transparent_42%),rgba(255,255,255,0.035)] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
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
                    <Signal02 className="h-[15px] w-[15px]" strokeWidth={1.8} />
                  </span>
                </div>
              </div> : <div className="mx-auto mt-5 h-px w-8 bg-white/15" />}
            </div>

            <div className={`${isEventWorkspace ? "space-y-3 px-2" : "space-y-6 px-3"} flex-1 overflow-y-auto pb-4`}>
              <Section title="Global" compact={isEventWorkspace}>
                <NavLink compact={isEventWorkspace} href="/admin" icon={<Home03 className="h-[17px] w-[17px]" strokeWidth={1.8} />}>
                  Dashboard
                </NavLink>
                <NavLink compact={isEventWorkspace} href="/admin/events" icon={<CalendarDate className="h-[17px] w-[17px]" strokeWidth={1.8} />}>
                  Events
                </NavLink>
                <NavLink compact={isEventWorkspace} href="/admin/activity" icon={<Activity className="h-[17px] w-[17px]" strokeWidth={1.8} />}>
                  Live Activity
                </NavLink>
              </Section>

              <Section title="Administration" compact={isEventWorkspace}>
                <NavLink compact={isEventWorkspace} href="/admin/users" icon={<Users01 className="h-[17px] w-[17px]" strokeWidth={1.8} />}>
                  Users
                </NavLink>
                <NavLink compact={isEventWorkspace} href="/admin/dev-tools" icon={<Tool02 className="h-[17px] w-[17px]" strokeWidth={1.8} />}>
                  Dev Tools
                </NavLink>
              </Section>
            </div>

            {!isEventWorkspace ? <div className="border-t border-white/10 p-4">
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
            </div> : <div className="mx-auto mb-5 h-9 w-9 rounded-full border border-white/15 bg-[linear-gradient(135deg,#1c78ff,#7542ef)]" />}
          </div>
        </aside>

        <div
          className={`flex min-w-0 flex-1 flex-col ${
            isPageEditorWorkspace ? "h-full min-h-0" : "min-h-screen"
          }`}
        >
          {!isEventWorkspace ? <header className="sticky top-0 z-20 shrink-0 border-b border-white/10 bg-slate-950/45 backdrop-blur-xl">
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
                  Attendee Preview
                </Link>
                <Link
                  href="/"
                  className="rounded-xl border border-violet-300/20 bg-violet-300/10 px-4 py-2 text-sm text-violet-100 transition hover:bg-violet-300/15"
                >
                  Jupiter Home
                </Link>
              </div>
            </div>
          </header> : null}

          <main
            className={`flex-1 ${isEventWorkspace ? "p-3" : "p-8 lg:p-10"} ${
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
