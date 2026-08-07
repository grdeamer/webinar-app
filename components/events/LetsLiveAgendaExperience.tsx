"use client"

import { useEffect, useMemo, useState } from "react"

export type LetsAgendaItem = {
  id: string
  title: string
  description?: string | null
  speaker?: string | null
  track?: string | null
  start_at?: string | null
  end_at?: string | null
  status?: string | null
  button_text?: string | null
  button_url?: string | null
}

type Props = {
  title: string
  description?: string | null
  agenda: LetsAgendaItem[]
  accessOpen?: boolean
  joinHref?: string | null
  preview?: boolean
}

function formatTime(value?: string | null) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  }).format(date)
}

function formatDate(value?: string | null) {
  if (!value) return "Date coming soon"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Date coming soon"
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "America/New_York",
  }).format(date)
}

function formatCountdown(target: string | null | undefined, now: number) {
  if (!target) return "--:--:--"
  const milliseconds = new Date(target).getTime() - now
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) return "Starting soon"
  const seconds = Math.floor(milliseconds / 1000)
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = seconds % 60
  return [hours, minutes, remainingSeconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":")
}

export default function LetsLiveAgendaExperience({
  title,
  description,
  agenda,
  accessOpen = true,
  joinHref,
  preview = false,
}: Props) {
  const [now, setNow] = useState(0)

  useEffect(() => {
    const initial = window.setTimeout(() => setNow(Date.now()), 0)
    const interval = window.setInterval(() => setNow(Date.now()), 1000)
    return () => {
      window.clearTimeout(initial)
      window.clearInterval(interval)
    }
  }, [])

  const current = useMemo(
    () => agenda.find((item) => item.status === "live") ?? null,
    [agenda],
  )
  const primary = current ?? agenda.find((item) => item.status === "upcoming") ?? agenda[0] ?? null
  const primaryIndex = primary ? agenda.findIndex((item) => item.id === primary.id) : -1
  const next = agenda.slice(primaryIndex + 1).find((item) => item.status !== "complete") ?? null
  const resolvedJoinHref = current?.button_url || primary?.button_url || joinHref || "#"
  const resolvedJoinLabel = current?.button_text || primary?.button_text || "Enter live meeting"

  return (
    <div className="overflow-hidden rounded-[30px] bg-[radial-gradient(circle_at_8%_8%,rgba(255,255,255,.98),transparent_31rem),radial-gradient(circle_at_93%_4%,rgba(235,23,0,.10),transparent_30rem),linear-gradient(150deg,#fafbfc_0%,#edf1f4_52%,#e2e8ed_100%)] text-[#11161c] shadow-[0_32px_90px_rgba(16,24,40,.14)]">
      {!accessOpen && !preview ? (
        <div className="grid min-h-[620px] place-items-center p-8">
          <div className="w-full max-w-2xl rounded-[30px] border border-black/[.09] bg-white/90 px-10 py-16 text-center shadow-[0_32px_90px_rgba(16,24,40,.14)]">
            <div className="text-[11px] font-black uppercase tracking-[.16em] text-[#eb1700]">{title}</div>
            <h2 className="mt-4 text-5xl font-black tracking-[-.05em]">The event hasn’t opened yet.</h2>
            <p className="mx-auto mt-4 max-w-lg text-[#43505f]">Please check back shortly. This page will open automatically when the event team begins the program.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-5 p-6 lg:grid-cols-[1.35fr_.75fr]">
            <section className="rounded-[30px] border border-black/[.08] bg-white/85 p-8 lg:p-12">
              <div className="text-[11px] font-black uppercase tracking-[.18em] text-[#eb1700]">Welcome</div>
              <h2 className="mt-3 max-w-3xl text-5xl font-black leading-[.96] tracking-[-.055em] lg:text-7xl">{title}</h2>
              {description ? <p className="mt-5 max-w-2xl text-base leading-7 text-[#43505f]">{description}</p> : null}

              <div className="mt-8 flex items-center gap-4 rounded-2xl border border-black/[.08] bg-white/65 p-4">
                <span className="h-3 w-3 rounded-full bg-[#eb1700] shadow-[0_0_0_7px_rgba(235,23,0,.10)]" />
                <div className="min-w-0">
                  <div className="text-[10px] font-black uppercase tracking-[.16em] text-[#6e7885]">{current ? "Live now" : "Up next"}</div>
                  <div className="mt-1 truncate text-lg font-extrabold">{primary?.title || "Schedule coming soon"}</div>
                  <div className="text-sm text-[#6e7885]">{formatTime(primary?.start_at)}{primary?.end_at ? `–${formatTime(primary.end_at)} ET` : ""}</div>
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <a href={resolvedJoinHref} className="rounded-2xl bg-[linear-gradient(135deg,#fb2a12,#b91300)] px-6 py-4 text-center text-sm font-black uppercase tracking-[.06em] text-white shadow-[0_16px_32px_rgba(235,23,0,.22)]">{resolvedJoinLabel}</a>
                {next ? <div className="min-w-0 flex-1 rounded-2xl border border-black/[.08] bg-white/60 px-5 py-3"><div className="text-[10px] font-black uppercase tracking-[.15em] text-[#6e7885]">Next up</div><div className="truncate font-bold">{next.title}</div><div className="text-xs text-[#6e7885]">{formatTime(next.start_at)} ET</div></div> : null}
              </div>
            </section>

            <aside className="flex flex-col rounded-[30px] border border-black/[.08] bg-white/85 p-7">
              <div className="flex items-center justify-between text-xs font-bold text-[#6e7885]"><span>{current ? "Event in progress" : "Event begins soon"}</span><span>Eastern Time</span></div>
              <div className="mt-8 border-b border-black/[.08] pb-7">
                <div className="text-[11px] font-black uppercase tracking-[.14em] text-[#6e7885]">Current time</div>
                <div className="mt-2 text-5xl font-black tracking-[-.05em]">{now ? new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit", timeZone: "America/New_York" }).format(new Date(now)) : "--:--:--"}</div>
                <div className="mt-2 text-sm text-[#43505f]">{now ? new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "America/New_York" }).format(new Date(now)) : "Eastern Time"}</div>
              </div>
              <div className="mt-6 rounded-[20px] border border-black/[.08] bg-white/55 px-5 py-5">
                <div className="text-[11px] font-black uppercase tracking-[.14em] text-[#6e7885]">Next session begins in</div>
                <div className="mt-2 text-4xl font-bold tracking-[-.025em]">{now ? formatCountdown(current ? next?.start_at : primary?.start_at, now) : "--:--:--"}</div>
                <div className="mt-2 text-sm font-semibold text-[#43505f]">{(current ? next : primary)?.title || "Schedule coming soon"}</div>
              </div>
              <p className="mt-auto pt-6 text-xs leading-5 text-[#6e7885]">This page updates automatically. No refresh is required.</p>
            </aside>
          </div>

          <section className="mx-6 mb-6 rounded-[30px] border border-black/[.08] bg-white/85 p-6 lg:p-9">
            <div className="text-[11px] font-black uppercase tracking-[.17em] text-[#eb1700]">Day One • {formatDate(agenda[0]?.start_at)}</div>
            <h3 className="mt-2 text-3xl font-black tracking-[-.04em]">Today’s agenda</h3>
            <div className="mt-6 space-y-3">
              {agenda.map((item) => (
                <div key={item.id} className={`grid gap-4 rounded-2xl border p-4 sm:grid-cols-[145px_1fr_auto] sm:items-center ${item.status === "live" ? "border-[#eb1700]/30 bg-red-50" : "border-black/[.08] bg-white/55"}`}>
                  <div className="text-sm font-extrabold">{formatTime(item.start_at)}–{formatTime(item.end_at)}</div>
                  <div><div className="text-base font-extrabold">{item.title}</div>{item.description ? <div className="mt-1 text-sm text-[#6e7885]">{item.description}</div> : null}</div>
                  <div className="text-[10px] font-black uppercase tracking-[.14em] text-[#6e7885]">{item.status === "live" ? "Live now" : item.status || "Upcoming"}</div>
                </div>
              ))}
            </div>
          </section>

          <footer className="pb-8 text-center text-[#6e7885]"><a className="text-sm font-extrabold" href="https://letstrainonline.com">Leading Edge Training Solutions, LLC</a><div className="mt-1 text-[11px] font-semibold">Powered by <a href="https://jupiter.events">Jupiter</a></div></footer>
        </>
      )}
    </div>
  )
}
