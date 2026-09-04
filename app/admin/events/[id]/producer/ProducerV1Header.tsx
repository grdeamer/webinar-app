"use client"

import Link from "next/link"
import JupiterLogo from "@/components/brand/JupiterLogo"
import {
  Activity,
  AlertTriangle,
  Check,
  ChevronDown,
  HeartPulse,
  ListVideo,
  MonitorCheck,
  RadioTower,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  X,
} from "lucide-react"
import { useEffect, useMemo, useRef, useState, type JSX } from "react"

import type { ProducerWorkspaceMode } from "./ProducerModeBar"
import type { ProducerTransportHealth } from "./producerHealthUtils"

const MODES: Array<{
  id: ProducerWorkspaceMode
  label: string
  icon: typeof MonitorCheck
}> = [
  { id: "show", label: "Show", icon: MonitorCheck },
  { id: "prepare", label: "Prepare", icon: ListVideo },
  { id: "advanced", label: "Advanced", icon: SlidersHorizontal },
]

type AudienceSnapshot = {
  destination: string
  connected: number
  registered: number
  nextDestination: string | null
  transition: string
  transitionDurationMs: number
  districtCount: number
  unassignedCount: number
}

const INITIAL_AUDIENCE_SNAPSHOT: AudienceSnapshot = {
  destination: "Loading…",
  connected: 0,
  registered: 0,
  nextDestination: null,
  transition: "Fade",
  transitionDurationMs: 3000,
  districtCount: 0,
  unassignedCount: 0,
}

function titleCase(value: string | null | undefined): string {
  if (!value) return "Lobby"
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function cueLabel(cue: Record<string, unknown> | null | undefined): string | null {
  if (!cue) return null
  if (typeof cue.label === "string" && cue.label.trim()) return cue.label.trim()
  if (typeof cue.headline === "string" && cue.headline.trim()) return cue.headline.trim()
  if (typeof cue.destinationKind === "string") return titleCase(cue.destinationKind)
  return null
}

function formatDuration(durationMs: number): string {
  const seconds = Math.max(0, durationMs) / 1000
  return `${Number.isInteger(seconds) ? seconds.toFixed(0) : seconds.toFixed(1)} seconds`
}

export default function ProducerV1Header({
  eventId,
  eventTitle,
  stageTitle,
  mode,
  transportHealth,
  isProgramLive,
  liveActionBusy,
  onModeChange,
  onGoLive,
  onGoOffAir,
}: {
  eventId: string
  eventTitle: string
  stageTitle: string
  mode: ProducerWorkspaceMode
  transportHealth: ProducerTransportHealth
  isProgramLive: boolean
  liveActionBusy: boolean
  onModeChange: (mode: ProducerWorkspaceMode) => void
  onGoLive: () => void
  onGoOffAir: () => void
}): JSX.Element {
  const connected = transportHealth === "connected"
  const [audienceOpen, setAudienceOpen] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [audienceSnapshot, setAudienceSnapshot] = useState(INITIAL_AUDIENCE_SNAPSHOT)
  const audienceRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    const loadDestination = async (): Promise<void> => {
      try {
        const [routingResponse, contextResponse, attendeesResponse] = await Promise.all([
          fetch(`/api/admin/events/${eventId}/live-state`, { cache: "no-store", signal: controller.signal }),
          fetch(`/api/admin/events/${eventId}/workspace-context`, { cache: "no-store", signal: controller.signal }),
          fetch(`/api/admin/events/${eventId}/attendees`, { cache: "no-store", signal: controller.signal }),
        ])
        if (!routingResponse.ok) return

        const routingPayload = await routingResponse.json() as {
          liveState?: {
            mode?: string | null
            destination_type?: string | null
            headline?: string | null
            transition_type?: string | null
            transition_duration_ms?: number | null
          }
          nextCue?: Record<string, unknown> | null
        }
        const contextPayload = contextResponse.ok
          ? await contextResponse.json() as { liveAttendeeCount?: number }
          : {}
        const attendeesPayload = attendeesResponse.ok
          ? await attendeesResponse.json() as {
              attendees?: Array<{ session_ids?: string[] }>
              districts?: Array<{ id?: string }>
            }
          : {}

        const attendees = attendeesPayload.attendees ?? []
        const districtIds = new Set(
          (attendeesPayload.districts ?? [])
            .map((district) => district.id)
            .filter((id): id is string => typeof id === "string")
        )
        const unassignedCount = districtIds.size > 0
          ? attendees.filter((attendee) => !(attendee.session_ids ?? []).some((id) => districtIds.has(id))).length
          : 0
        const state = routingPayload.liveState

        setAudienceSnapshot({
          destination: state?.headline?.trim() || titleCase(state?.destination_type || state?.mode),
          connected: typeof contextPayload.liveAttendeeCount === "number" ? contextPayload.liveAttendeeCount : 0,
          registered: attendees.length,
          nextDestination: cueLabel(routingPayload.nextCue),
          transition: titleCase(state?.transition_type || "fade"),
          transitionDurationMs: typeof state?.transition_duration_ms === "number" ? state.transition_duration_ms : 3000,
          districtCount: districtIds.size,
          unassignedCount,
        })
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setAudienceSnapshot((current) => ({ ...current, destination: "Check Audience Flow" }))
        }
      }
    }
    void loadDestination()
    const interval = window.setInterval((): void => { void loadDestination() }, 15_000)
    return () => { controller.abort(); window.clearInterval(interval) }
  }, [eventId])

  useEffect(() => {
    if (!audienceOpen) return

    function handlePointerDown(event: PointerEvent): void {
      if (!audienceRef.current?.contains(event.target as Node)) {
        setAudienceOpen(false)
        setReviewOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        setAudienceOpen(false)
        setReviewOpen(false)
      }
    }

    document.addEventListener("pointerdown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [audienceOpen])

  const audienceCountLabel = useMemo(() => {
    if (audienceSnapshot.connected > 0) return `${audienceSnapshot.connected} connected`
    if (audienceSnapshot.registered > 0) return `${audienceSnapshot.registered} registered`
    return "No attendees connected"
  }, [audienceSnapshot.connected, audienceSnapshot.registered])

  return (
    <header className="producer-v1-header relative z-[100] shrink-0 px-5 pt-4 lg:px-7 lg:pt-5">
      <div className="pointer-events-none absolute inset-x-[28%] -top-16 h-40 bg-[radial-gradient(ellipse_at_center,rgba(var(--producer-brand-primary),0.13),transparent_70%)] blur-3xl" />
      <div className="relative flex min-h-[70px] items-center justify-between gap-5">
        <div className="producer-v1-header__identity flex min-w-0 items-center gap-6">
          <JupiterLogo
            className="shrink-0 text-white"
            markClassName="h-10 w-10"
            wordmarkClassName="text-[17px] font-semibold tracking-[0.22em]"
          />
          <span className="h-10 w-px bg-white/16" />
          <h1 className="shrink-0 text-[24px] font-semibold tracking-[-0.035em] text-white">
            Producer Room
          </h1>
          <span className="hidden h-10 w-px bg-white/16 xl:block" />
          <div className="hidden min-w-0 xl:block">
            <div className="truncate text-[16px] font-medium text-white/90">{eventTitle}</div>
            <div className="mt-0.5 truncate text-[13px] font-medium text-sky-300">{stageTitle}</div>
          </div>
        </div>

        <nav className="producer-v1-header__modes grid shrink-0 grid-cols-3 overflow-hidden rounded-[12px] border border-white/14 bg-[#07111f]/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.045)]" aria-label="Producer workspace mode">
          {MODES.map(({ id, label, icon: Icon }) => {
            const active = id === mode
            return (
              <button
                key={id}
                type="button"
                onClick={() => onModeChange(id)}
                aria-pressed={active}
                className={`flex h-14 min-w-[132px] items-center justify-center gap-3 border-r border-white/10 px-5 text-[13px] font-semibold uppercase tracking-[0.08em] transition last:border-r-0 ${
                  active
                    ? "bg-[linear-gradient(180deg,rgba(var(--producer-brand-primary),0.34),rgba(var(--producer-brand-primary),0.16))] text-white shadow-[inset_0_-2px_0_rgb(var(--producer-brand-secondary))]"
                    : "text-white/72 hover:bg-white/[0.045] hover:text-white"
                }`}
              >
                <Icon size={18} strokeWidth={1.8} />
                {label}
              </button>
            )
          })}
        </nav>
      </div>

      <div className="producer-v1-header__status relative mt-2 flex min-h-[58px] items-center justify-between rounded-[12px] border border-white/10 bg-[#07111d]/78 px-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] backdrop-blur-xl">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-3 text-[13px] font-medium uppercase tracking-[0.09em] text-white/62">
            <HeartPulse size={19} strokeWidth={1.7} />
            Health
          </div>
          <span className="h-7 w-px bg-white/14" />
          <div className={`flex items-center gap-3 text-[13px] font-semibold uppercase tracking-[0.08em] ${connected ? "text-emerald-300" : "text-amber-300"}`}>
            <span className={`h-3 w-3 rounded-full ${connected ? "bg-emerald-300 shadow-[0_0_16px_rgba(110,231,183,0.68)]" : "bg-amber-300 shadow-[0_0_16px_rgba(252,211,77,0.5)]"}`} />
            {connected ? "Connected" : "Connecting"}
          </div>
          {mode === "prepare" ? <><span className="h-7 w-px bg-white/14" /><span className="text-[14px] font-medium text-emerald-300">Ready for rehearsal</span></> : null}
          {mode === "advanced" ? <><span className="h-7 w-px bg-white/14" /><span className="flex items-center gap-2 text-[14px] text-white/72"><Activity size={16} />Control plane healthy</span><span className="h-2.5 w-2.5 rounded-full bg-emerald-300" /><span className="text-[14px] text-white/78">42 ms</span></> : null}
        </div>

        <div className="flex items-center gap-4">
          <div ref={audienceRef} className="relative hidden xl:block">
            <button
              type="button"
              aria-expanded={audienceOpen}
              aria-haspopup="dialog"
              onClick={() => {
                setAudienceOpen((current) => !current)
                setReviewOpen(false)
              }}
              className={`flex min-w-[220px] items-center gap-3 rounded-[10px] border px-4 py-2 text-left transition ${audienceOpen ? "border-violet-300/45 bg-violet-300/[0.11] shadow-[0_0_28px_rgba(139,92,246,0.14)]" : "border-sky-300/16 bg-sky-300/[0.055] hover:border-sky-200/28 hover:bg-sky-300/[0.085]"}`}
            >
              <Users size={17} className="shrink-0 text-violet-200/85" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[9px] font-semibold uppercase tracking-[0.12em] text-sky-100/50">Audience · {audienceSnapshot.destination}</div>
                <div className="mt-0.5 text-[12px] font-semibold text-white/86">{audienceCountLabel}</div>
              </div>
              <ChevronDown size={14} className={`shrink-0 text-white/48 transition-transform ${audienceOpen ? "rotate-180" : ""}`} />
            </button>

            {audienceOpen ? (
              <div
                role="dialog"
                aria-label="Audience destination"
                className="absolute right-0 top-[calc(100%+10px)] z-[260] w-[360px] overflow-hidden rounded-[18px] border border-violet-300/35 bg-[linear-gradient(180deg,rgba(8,13,27,0.985),rgba(3,7,16,0.995))] p-4 shadow-[0_30px_90px_rgba(0,0,0,0.72),0_0_38px_rgba(109,75,235,0.12),inset_0_1px_0_rgba(255,255,255,0.045)] backdrop-blur-2xl"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.15em] text-white/72">
                    <RadioTower size={14} className="text-violet-300" />
                    Audience destination
                  </div>
                  <button type="button" onClick={() => { setAudienceOpen(false); setReviewOpen(false) }} aria-label="Close audience destination" className="rounded-md p-1 text-white/35 hover:bg-white/[0.06] hover:text-white/70"><X size={14} /></button>
                </div>

                {reviewOpen ? (
                  <div className="mt-4">
                    <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-violet-200/58">Review audience move</div>
                    <h2 className="mt-2 text-[18px] font-semibold tracking-[-0.02em] text-white">{audienceSnapshot.destination} <span className="text-white/28">→</span> {audienceSnapshot.nextDestination || "No queued destination"}</h2>
                    <div className="mt-4 space-y-2 rounded-[13px] border border-white/[0.08] bg-white/[0.025] p-3 text-[12px] text-white/64">
                      <div className="flex items-center gap-2"><Check size={14} className="text-emerald-300" />{audienceSnapshot.connected} attendees currently connected</div>
                      {audienceSnapshot.unassignedCount > 0 ? <div className="flex items-center gap-2 text-amber-200/82"><AlertTriangle size={14} />{audienceSnapshot.unassignedCount} people have no district assignment</div> : <div className="flex items-center gap-2"><Check size={14} className="text-emerald-300" />District assignments ready</div>}
                      <div className="flex items-center gap-2"><Check size={14} className="text-emerald-300" />Recovery destination: {audienceSnapshot.destination}</div>
                    </div>
                    <p className="mt-3 text-[11px] leading-5 text-white/42">No attendee browsers change from Producer Room. Continue into Audience Flow to confirm and execute the move.</p>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => setReviewOpen(false)} className="rounded-[10px] border border-white/[0.09] bg-white/[0.025] px-3 py-2.5 text-[11px] font-semibold text-white/62 hover:bg-white/[0.055]">Back</button>
                      <Link href={`/admin/events/${eventId}/routing`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center rounded-[10px] border border-violet-300/35 bg-violet-500/75 px-3 py-2.5 text-[11px] font-bold text-white shadow-[0_10px_24px_rgba(109,40,217,0.18)] transition hover:bg-violet-500">Continue to review ↗</Link>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="mt-4 rounded-[13px] border border-white/[0.08] bg-white/[0.025] p-3.5">
                      <div className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/35">Currently live</div>
                      <div className="mt-1 text-[15px] font-semibold text-white/92">{audienceSnapshot.destination}</div>
                      <div className="mt-1 text-[12px] text-white/48">{audienceSnapshot.registered} attendees · {audienceSnapshot.connected} connected</div>
                    </div>
                    <div className="mt-2 rounded-[13px] border border-white/[0.08] bg-white/[0.025] p-3.5">
                      <div className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/35">Next from Run of Show</div>
                      <div className="mt-1 text-[15px] font-semibold text-white/92">{audienceSnapshot.nextDestination || "No audience move queued"}</div>
                      {audienceSnapshot.districtCount > 0 ? <div className={`mt-1 flex items-center gap-1.5 text-[12px] ${audienceSnapshot.unassignedCount > 0 ? "text-amber-200/76" : "text-white/48"}`}>{audienceSnapshot.districtCount} rooms · {audienceSnapshot.unassignedCount} people unassigned {audienceSnapshot.unassignedCount > 0 ? <AlertTriangle size={12} /> : null}</div> : <div className="mt-1 text-[12px] text-white/38">Queue moves in Audience Flow</div>}
                    </div>
                    <div className="mt-2 rounded-[13px] border border-white/[0.08] bg-white/[0.025] p-3.5">
                      <div className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/35">Transition</div>
                      <div className="mt-1 text-[13px] font-semibold text-white/78">{audienceSnapshot.transition} · {formatDuration(audienceSnapshot.transitionDurationMs)}</div>
                    </div>
                    <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
                      <button type="button" disabled={!audienceSnapshot.nextDestination} onClick={() => setReviewOpen(true)} className="rounded-[10px] border border-violet-300/35 bg-violet-500/75 px-3 py-2.5 text-[11px] font-bold text-white shadow-[0_10px_24px_rgba(109,40,217,0.18)] transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-35">Review move</button>
                      <Link href={`/admin/events/${eventId}/routing`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center rounded-[10px] px-3 py-2.5 text-[11px] font-semibold text-violet-100/72 transition hover:bg-white/[0.04] hover:text-white">Open full Audience Flow ↗</Link>
                    </div>
                  </>
                )}
              </div>
            ) : null}
          </div>
          <span className={`inline-flex h-10 min-w-[140px] items-center justify-center gap-3 rounded-[10px] border px-4 text-[12px] font-semibold uppercase tracking-[0.10em] ${isProgramLive ? "border-red-300/25 bg-red-400/10 text-red-200" : "border-emerald-300/24 bg-emerald-400/10 text-white"}`}>
            <span className={`h-2.5 w-2.5 rounded-full ${isProgramLive ? "bg-red-300" : "bg-emerald-300"}`} />
            {isProgramLive ? "On Air" : "Standby"}
          </span>
          <button
            type="button"
            disabled={liveActionBusy}
            onClick={isProgramLive ? onGoOffAir : onGoLive}
            className={`inline-flex h-10 min-w-[154px] items-center justify-center gap-3 rounded-[10px] border px-5 text-[12px] font-semibold uppercase tracking-[0.08em] transition disabled:cursor-not-allowed disabled:opacity-45 ${isProgramLive ? "border-red-300/30 bg-red-400/12 text-red-100 hover:bg-red-400/20" : "border-white/10 bg-white/[0.025] text-white/42 hover:border-emerald-300/24 hover:text-white/78"}`}
          >
            <ShieldCheck size={17} />
            {liveActionBusy ? "Applying" : isProgramLive ? "End Live" : "Go Live"}
          </button>
        </div>
      </div>
    </header>
  )
}
