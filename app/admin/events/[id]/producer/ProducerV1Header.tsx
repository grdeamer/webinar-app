"use client"

import JupiterLogo from "@/components/brand/JupiterLogo"
import {
  Activity,
  HeartPulse,
  ListVideo,
  MonitorCheck,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react"
import type { JSX } from "react"

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

export default function ProducerV1Header({
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
