"use client"

import EventHoldScreen from "./EventHoldScreen"
import { DEFAULT_HOLD_SCREEN, type HoldScreenSettings } from "@/lib/page-editor/holdScreen"
import type { SectionBlock } from "@/lib/page-editor/sectionTypes"
import { createLiveAgendaBlocks, liveAgendaRegion, liveAgendaLabel, type LiveAgendaRegion } from "@/lib/page-editor/liveAgendaLayout"
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

export type LetsLiveAgendaProps = {
  blocks?: SectionBlock[]
  selectedBlockId?: string | null
  onSelectBlock?: (id: string) => void
  onMoveBlock?: (source: string, target: string) => void
  title: string
  description?: string | null
  agenda: LetsAgendaItem[]
  accessOpen?: boolean
  joinHref?: string | null
  preview?: boolean
  holdScreen?: HoldScreenSettings
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
  blocks, selectedBlockId, onSelectBlock, onMoveBlock,
  title,
  description,
  agenda,
  accessOpen = true,
  joinHref,
  preview = false,
  holdScreen = DEFAULT_HOLD_SCREEN,
}: LetsLiveAgendaProps) {
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

  const items = blocks ?? createLiveAgendaBlocks("live-agenda")
  function renderItem(block: SectionBlock) {
    const props = block.props
    const role = props.layoutRole
    const text = props.bindEventTitle ? title : props.bindEventDescription ? description : String(props.body ?? "")
    const label = String(props.title ?? "")
    switch (role) {
      case "eyebrow": return <div className="text-[11px] font-black uppercase tracking-[.18em] text-[#eb1700]">{text}</div>
      case "title": return <h2 className="mt-3 max-w-3xl text-5xl font-black leading-[.96] tracking-[-.055em] lg:text-7xl">{text}</h2>
      case "description": return <p className="mt-5 max-w-2xl text-base leading-7 text-[#43505f]">{text || (onSelectBlock ? "Add description" : "")}</p>
      case "current": return <div className="mt-8 flex items-center gap-4 rounded-2xl border border-black/[.08] bg-white/65 p-4"><span className="h-3 w-3 shrink-0 rounded-full bg-[#eb1700] shadow-[0_0_0_7px_rgba(235,23,0,.10)]" /><div className="min-w-0"><div className="text-[10px] font-black uppercase tracking-[.16em] text-[#6e7885]">{label || (current ? "Live now" : "Up next")}</div><div className="mt-1 truncate text-lg font-extrabold">{primary?.title || "Schedule coming soon"}</div><div className="text-sm text-[#6e7885]">{formatTime(primary?.start_at)}{primary?.end_at ? `–${formatTime(primary.end_at)} ET` : ""}</div></div></div>
      case "join": return <a href={safeLink(String(props.href || resolvedJoinHref))} className="block h-full rounded-2xl bg-[linear-gradient(135deg,#fb2a12,#b91300)] px-6 py-4 text-center text-sm font-black uppercase tracking-[.06em] text-white shadow-[0_16px_32px_rgba(235,23,0,.22)]">{label || resolvedJoinLabel}</a>
      case "next": return <div className="min-w-0 rounded-2xl border border-black/[.08] bg-white/60 px-5 py-3"><div className="text-[10px] font-black uppercase tracking-[.15em] text-[#6e7885]">{label || "Next up"}</div><div className="truncate font-bold">{next?.title || "No next session"}</div><div className="text-xs text-[#6e7885]">{formatTime(next?.start_at)} ET</div></div>
      case "status": return <div className="flex items-center justify-between text-xs font-bold text-[#6e7885]"><span>{label || (current ? "Event in progress" : "Event begins soon")}</span><span>Eastern Time</span></div>
      case "clock": return <div className="mt-8 border-b border-black/[.08] pb-7"><div className="text-[11px] font-black uppercase tracking-[.14em] text-[#6e7885]">{label || "Current time"}</div><div className="mt-2 text-5xl font-black tracking-[-.05em]">{now ? new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit", timeZone: "America/New_York" }).format(new Date(now)) : "--:--:--"}</div><div className="mt-2 text-sm text-[#43505f]">{now ? new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "America/New_York" }).format(new Date(now)) : "Eastern Time"}</div></div>
      case "countdown": return <div className="mt-6 rounded-[20px] border border-black/[.08] bg-white/55 px-5 py-5"><div className="text-[11px] font-black uppercase tracking-[.14em] text-[#6e7885]">{label || "Next session begins in"}</div><div className="mt-2 text-4xl font-bold tracking-[-.025em]">{now ? formatCountdown(current ? next?.start_at : primary?.start_at, now) : "--:--:--"}</div><div className="mt-2 text-sm font-semibold text-[#43505f]">{(current ? next : primary)?.title || "Schedule coming soon"}</div></div>
      case "notice": return <p className="pt-6 text-xs leading-5 text-[#6e7885]">{text}</p>
      case "agenda-date": return <div className="text-[11px] font-black uppercase tracking-[.17em] text-[#eb1700]">{label ? `${label} • ` : ""}{formatDate(agenda[0]?.start_at)}</div>
      case "agenda-title": return <h3 className="mt-2 text-3xl font-black tracking-[-.04em]">{text}</h3>
      case "agenda": return <div className="mt-6 space-y-3">{label ? <h3 className="font-bold">{label}</h3> : null}{agenda.map(item => <div key={item.id} className={`grid gap-4 rounded-2xl border p-4 sm:grid-cols-[145px_1fr_auto] sm:items-center ${item.status === "live" ? "border-[#eb1700]/30 bg-red-50" : "border-black/[.08] bg-white/55"}`}><div className="text-sm font-extrabold">{formatTime(item.start_at)}–{formatTime(item.end_at)}</div><div><div className="text-base font-extrabold">{item.title}</div>{item.description ? <div className="mt-1 text-sm text-[#6e7885]">{item.description}</div> : null}</div><div className="text-[10px] font-black uppercase tracking-[.14em] text-[#6e7885]">{item.status === "live" ? "Live now" : item.status || "Upcoming"}</div></div>)}</div>
      case "footer": case "attribution": return <a href={safeLink(String(props.href || "#"))} className={role === "footer" ? "text-sm font-extrabold" : "mt-1 text-[11px] font-semibold"}>{text}</a>
      default: return <div>{label ? <h3 className="font-bold">{label}</h3> : null}<p>{text}</p></div>
    }
  }
  function region(name: LiveAgendaRegion) {
    return items.filter(block => liveAgendaRegion(block) === name && block.props.visible !== false && (block.props.layoutRole !== "next" || next || onSelectBlock)).map(block => <div
      key={block.id} data-live-agenda-block={block.id}
      className={`${name === "actions" ? "min-w-0 flex-1" : ""} ${block.props.layoutRole === "notice" ? "mt-auto" : ""} ${onSelectBlock ? "relative cursor-pointer rounded-lg outline-offset-4 hover:outline-2 hover:outline-violet-400 focus-visible:outline-2 focus-visible:outline-violet-400" : ""} ${selectedBlockId === block.id ? "outline-2 outline-violet-500" : ""}`}
      role={onSelectBlock ? "button" : undefined} tabIndex={onSelectBlock ? 0 : undefined}
      aria-label={onSelectBlock ? `Edit ${liveAgendaLabel(block)}` : undefined}
      aria-pressed={onSelectBlock ? selectedBlockId === block.id : undefined}
      draggable={Boolean(onMoveBlock)}
      onPointerDown={onSelectBlock ? event => event.stopPropagation() : undefined}
      onClick={onSelectBlock ? event => { event.preventDefault(); event.stopPropagation(); onSelectBlock(block.id) } : undefined}
      onKeyDown={onSelectBlock ? event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); event.stopPropagation(); onSelectBlock(block.id) } } : undefined}
      onDragStart={onMoveBlock ? event => { event.stopPropagation(); event.dataTransfer.setData("application/jupiter-block", block.id); event.dataTransfer.effectAllowed = "move" } : undefined}
      onDragOver={onMoveBlock ? event => { event.preventDefault(); event.stopPropagation() } : undefined}
      onDrop={onMoveBlock ? event => { event.preventDefault(); event.stopPropagation(); onMoveBlock(event.dataTransfer.getData("application/jupiter-block"), block.id) } : undefined}
    >{renderItem(block)}</div>)
  }
  return <div className="overflow-hidden rounded-[30px] bg-[radial-gradient(circle_at_8%_8%,rgba(255,255,255,.98),transparent_31rem),radial-gradient(circle_at_93%_4%,rgba(235,23,0,.10),transparent_30rem),linear-gradient(150deg,#fafbfc_0%,#edf1f4_52%,#e2e8ed_100%)] text-[#11161c] shadow-[0_32px_90px_rgba(16,24,40,.14)]">
    {!accessOpen && !preview ? <EventHoldScreen settings={holdScreen} eventTitle={title} /> : <>
      <div className="grid gap-5 p-6 lg:grid-cols-[1.35fr_.75fr]">
        <section className="rounded-[30px] border border-black/[.08] bg-white/85 p-8 lg:p-12">{region("welcome")}<div className="mt-5 flex flex-col gap-3 sm:flex-row">{region("actions")}</div></section>
        <aside className="flex flex-col rounded-[30px] border border-black/[.08] bg-white/85 p-7">{region("sidebar")}</aside>
      </div>
      <section className="mx-6 mb-6 rounded-[30px] border border-black/[.08] bg-white/85 p-6 lg:p-9">{region("agenda")}</section>
      <footer className="pb-8 text-center text-[#6e7885]">{region("footer")}</footer>
    </>}
  </div>
}

function safeLink(value: string): string {
  return /^(https?:\/\/|mailto:|#|\/(?!\/))/i.test(value) ? value : "#"
}
