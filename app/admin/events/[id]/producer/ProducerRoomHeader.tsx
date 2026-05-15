import { useEffect, useMemo, useState, type JSX } from "react"
import {
  Activity,
  CircleDot,
  Clock3,
  Cpu,
  Globe2,
  Radio,
  SatelliteDish,
  ShieldCheck,
  Signal,
  UserCog,
} from "lucide-react"

type StageLayout = "solo" | "grid" | "screen_speaker"

function HeaderStatusChip({
  icon,
  label,
  value,
  tone = "neutral",
}: {
  icon: JSX.Element
  label: string
  value: string
  tone?: "neutral" | "live" | "good" | "warn"
}): JSX.Element {
  const toneClass =
    tone === "live"
      ? "border-red-300/12 bg-red-400/[0.06] text-red-100/56"
      : tone === "good"
        ? "border-emerald-300/12 bg-emerald-400/[0.06] text-emerald-100/54"
        : tone === "warn"
          ? "border-amber-300/12 bg-amber-400/[0.06] text-amber-100/54"
          : "border-white/8 bg-white/[0.022] text-white/40"

  return (
    <div
      className={`flex items-center gap-2 rounded-2xl border px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.022)] ${toneClass}`}
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-white/8 bg-black/18 text-white/46">
        {icon}
      </span>

      <div className="min-w-0">
        <div className="text-[8px] font-black uppercase tracking-[0.14em] text-white/24">
          {label}
        </div>
        <div className="truncate text-xs font-semibold text-white/64">
          {value}
        </div>
      </div>
    </div>
  )
}

function TelemetryMiniChip({
  icon,
  label,
  value,
  tone = "neutral",
}: {
  icon: JSX.Element
  label: string
  value: string
  tone?: "neutral" | "sky" | "green" | "amber"
}): JSX.Element {
  const toneClass =
    tone === "sky"
      ? "border-sky-300/10 bg-sky-400/[0.06] text-sky-100/50"
      : tone === "green"
        ? "border-emerald-300/10 bg-emerald-400/[0.06] text-emerald-100/50"
        : tone === "amber"
          ? "border-amber-300/10 bg-amber-400/[0.06] text-amber-100/50"
          : "border-white/8 bg-black/18 text-white/32"

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.14em] ${toneClass}`}
    >
      <span className="opacity-56">{icon}</span>
      <span className="text-white/20">{label}</span>
      <span>{value}</span>
    </div>
  )
}

function MissionClock(): JSX.Element {
  const [seconds, setSeconds] = useState(4722)

  useEffect(() => {
    const id = window.setInterval(() => {
      setSeconds((value) => value + 1)
    }, 1000)

    return () => window.clearInterval(id)
  }, [])

  const runtime = useMemo(() => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const remainingSeconds = seconds % 60

    return [hours, minutes, remainingSeconds]
      .map((value) => String(value).padStart(2, "0"))
      .join(":")
  }, [seconds])

  return (
    <HeaderStatusChip
      icon={<Clock3 size={14} />}
      label="Mission Clock"
      value={runtime}
      tone="neutral"
    />
  )
}

function HeaderTransmissionBadge({ isLive }: { isLive: boolean }): JSX.Element {
  return (
    <div
      className={`relative overflow-hidden rounded-full border px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.22em] backdrop-blur-md transition-all duration-500 ${
        isLive
          ? "border-red-200/14 bg-red-500/[0.08] text-red-100/58 shadow-[0_0_10px_rgba(248,113,113,0.07)]"
          : "border-sky-200/12 bg-sky-500/[0.06] text-sky-100/54 shadow-[0_0_8px_rgba(56,189,248,0.05)]"
      }`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(110deg,transparent,rgba(255,255,255,0.03)_44%,transparent_62%)] animate-[headerTransmissionSweep_10s_ease-in-out_infinite]" />
      <div className="relative flex items-center gap-2">
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            isLive
              ? "bg-red-300/75 shadow-[0_0_5px_rgba(252,165,165,0.24)]"
              : "bg-sky-300/70 shadow-[0_0_5px_rgba(125,211,252,0.18)]"
          }`}
        />
        {isLive ? "Live" : "Standby"}
      </div>
    </div>
  )
}

export default function ProducerRoomHeader({
  headline,
  layout,
  previewProgramDifferent,
  onStageCount,
  overlayCount,
  isLive,
  scopeLabel,
}: {
  headline: string
  layout: StageLayout | null | undefined
  previewProgramDifferent: boolean
  onStageCount: number
  overlayCount: number
  isLive: boolean
  scopeLabel: string
}): JSX.Element {
  return (
    <div className="relative overflow-hidden border-b border-white/8 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.045),transparent_32%),radial-gradient(circle_at_top_left,rgba(168,85,247,0.045),transparent_28%),linear-gradient(180deg,rgba(6,12,26,0.988),rgba(2,6,16,0.97))] px-4 py-3 shadow-[0_18px_54px_rgba(0,0,0,0.34)] backdrop-blur-xl md:px-5 xl:px-6 2xl:px-7">
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 h-px transition-opacity duration-500 ${
          isLive
            ? "bg-gradient-to-r from-transparent via-red-200/24 to-transparent opacity-72"
            : "bg-gradient-to-r from-transparent via-sky-200/14 to-transparent opacity-54"
        }`}
      />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent,rgba(255,255,255,0.007)_38%,transparent_62%)] animate-[headerTransmissionSweep_16s_ease-in-out_infinite]" />
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="hidden flex-wrap items-center gap-2 rounded-[18px] border border-white/6 bg-black/14 px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] 2xl:flex">
          <TelemetryMiniChip
            icon={<SatelliteDish size={10} />}
            label="Relay"
            value="Locked"
            tone="green"
          />

          <TelemetryMiniChip
            icon={<Globe2 size={10} />}
            label="CDN"
            value="Healthy"
            tone="sky"
          />

          <TelemetryMiniChip
            icon={<Cpu size={10} />}
            label="GPU"
            value="62%"
            tone="amber"
          />
        </div>

        <div className="flex min-w-0 items-center gap-3">
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] border border-sky-300/14 bg-sky-400/[0.06] shadow-[0_0_14px_rgba(56,189,248,0.08)]">
            <div className="h-6 w-6 rounded-full border border-sky-200/45 bg-[radial-gradient(circle_at_35%_25%,rgba(255,255,255,0.82),rgba(56,189,248,0.28)_35%,rgba(79,70,229,0.18)_70%)] shadow-[0_0_10px_rgba(125,211,252,0.22)]" />
            <div className="absolute h-8 w-12 -rotate-12 rounded-full border border-sky-200/18" />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-[9px] uppercase tracking-[0.18em] text-white/24">
              <span>Jupiter</span>
              <span className="text-white/20">•</span>
              <span>Mission Control</span>
              <span className="text-white/20">•</span>
              <span>{scopeLabel}</span>
              <span className="hidden sm:inline-flex">
                <HeaderTransmissionBadge isLive={isLive} />
              </span>
            </div>

            <div className="mt-1.5 flex flex-wrap items-end gap-2.5">
              <h1 className="truncate text-[28px] font-semibold leading-none tracking-[-0.04em] text-white/82 xl:text-[30px]">
                {headline}
              </h1>

              <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-300/12 bg-sky-500/[0.06] px-2.5 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-sky-100/54 shadow-[0_0_8px_rgba(56,189,248,0.05)]">
                <Activity size={11} />
                {layout === "screen_speaker"
                  ? "Speaker + Screen"
                  : layout === "grid"
                    ? "Grid"
                    : "Solo"}
              </span>

              <span className="hidden items-center gap-1.5 rounded-full border border-emerald-300/12 bg-emerald-400/[0.06] px-2.5 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-emerald-100/54 shadow-[0_0_8px_rgba(52,211,153,0.05)] 2xl:inline-flex">
                <ShieldCheck size={11} />
                Systems Stable
              </span>
            </div>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 xl:min-w-[620px] xl:grid-cols-4">
          <div
            className={`relative overflow-hidden rounded-[24px] border p-3 transition-all duration-500 ${
              isLive
                ? "border-red-400/14 bg-[radial-gradient(circle_at_top,rgba(248,113,113,0.12),transparent_42%),linear-gradient(180deg,rgba(127,29,29,0.28),rgba(239,68,68,0.05))] shadow-[0_0_18px_rgba(239,68,68,0.08)]"
                : "border-sky-300/12 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.08),transparent_42%),linear-gradient(180deg,rgba(12,74,110,0.16),rgba(14,165,233,0.03))] shadow-[0_0_14px_rgba(56,189,248,0.05)]"
            }`}
          >
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(110deg,transparent,rgba(255,255,255,0.022)_44%,transparent_66%)] animate-[headerTransmissionSweep_12s_ease-in-out_infinite]" />
            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.14em] text-red-100/46">
              <CircleDot
                size={12}
                className={isLive ? "animate-pulse text-red-300" : "text-white/30"}
              />
              Transmission
            </div>
            <div className="relative mt-1.5 text-base font-semibold tracking-[-0.02em] text-white/74">
              {isLive ? "Live" : "Standby"}
            </div>
            <div className="relative mt-0.5 text-[11px] text-white/30">
              Program output {isLive ? "live to audience" : "ready for transition"}
            </div>
          </div>

          <div className="rounded-[22px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.028),rgba(255,255,255,0.01))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.022)]">
            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.14em] text-white/24">
              <Radio size={12} />
              Show State
            </div>
            <div className="mt-1.5 text-base font-semibold text-white/74">
              {previewProgramDifferent ? "Preview Armed" : "In Sync"}
            </div>
            <div className="mt-0.5 text-[11px] text-white/28">
              {onStageCount} talent · {overlayCount} overlays
            </div>
          </div>

          <HeaderStatusChip
            icon={<Signal size={14} />}
            label="Uplink"
            value="99% locked"
            tone="good"
          />

          <HeaderStatusChip
            icon={<UserCog size={14} />}
            label="Operator"
            value="Shift active"
            tone="neutral"
          />
        </div>

        <div className="hidden 2xl:block">
          <MissionClock />
        </div>
      </div>

      <style jsx global>{`
        @keyframes headerTransmissionSweep {
          0%,
          100% {
            opacity: 0;
            transform: translateX(-18%);
          }

          44% {
            opacity: 0.22;
          }

          100% {
            transform: translateX(18%);
          }
        }
      `}</style>
    </div>
  )
}