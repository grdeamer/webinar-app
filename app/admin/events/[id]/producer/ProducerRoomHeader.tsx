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
      ? "border-red-300/18 bg-red-400/8 text-red-100/72"
      : tone === "good"
        ? "border-emerald-300/16 bg-emerald-400/8 text-emerald-100/68"
        : tone === "warn"
          ? "border-amber-300/16 bg-amber-400/8 text-amber-100/68"
          : "border-white/10 bg-white/[0.035] text-white/58"

  return (
    <div
      className={`flex items-center gap-2 rounded-2xl border px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] ${toneClass}`}
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/24 text-white/68">
        {icon}
      </span>

      <div className="min-w-0">
        <div className="text-[8px] font-black uppercase tracking-[0.18em] text-white/32">
          {label}
        </div>
        <div className="truncate text-xs font-semibold text-white/82">
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
      ? "border-sky-300/14 bg-sky-400/8 text-sky-100/60"
      : tone === "green"
        ? "border-emerald-300/14 bg-emerald-400/8 text-emerald-100/60"
        : tone === "amber"
          ? "border-amber-300/14 bg-amber-400/8 text-amber-100/60"
          : "border-white/10 bg-black/24 text-white/42"

  return (
    <div className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.14em] ${toneClass}`}>
      <span className="opacity-80">{icon}</span>
      <span className="text-white/30">{label}</span>
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
    <div className="border-b border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.12),transparent_32%),radial-gradient(circle_at_top_left,rgba(168,85,247,0.11),transparent_28%),linear-gradient(180deg,rgba(6,12,26,0.98),rgba(2,6,16,0.94))] px-4 py-3 shadow-[0_28px_110px_rgba(0,0,0,0.52)] backdrop-blur-2xl md:px-5 xl:px-6 2xl:px-7">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-2 rounded-[20px] border border-white/8 bg-black/18 px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] xl:hidden">
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
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] border border-sky-300/22 bg-sky-400/10 shadow-[0_0_34px_rgba(56,189,248,0.2)]">
            <div className="h-6 w-6 rounded-full border border-sky-200/75 bg-[radial-gradient(circle_at_35%_25%,rgba(255,255,255,0.95),rgba(56,189,248,0.48)_35%,rgba(79,70,229,0.34)_70%)] shadow-[0_0_24px_rgba(125,211,252,0.65)]" />
            <div className="absolute h-8 w-12 -rotate-12 rounded-full border border-sky-200/35" />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-[9px] uppercase tracking-[0.3em] text-white/35">
              <span>Jupiter</span>
              <span className="text-white/20">•</span>
              <span>Mission Control</span>
              <span className="text-white/20">•</span>
              <span>{scopeLabel}</span>
            </div>

            <div className="mt-1.5 flex flex-wrap items-end gap-2.5">
              <h1 className="truncate text-[28px] font-semibold leading-none tracking-[-0.05em] text-white xl:text-[30px]">
                {headline}
              </h1>

              <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-300/22 bg-sky-500/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.16em] text-sky-100/82 shadow-[0_0_16px_rgba(56,189,248,0.13)]">
                <Activity size={11} />
                {layout === "screen_speaker"
                  ? "Speaker + Screen"
                  : layout === "grid"
                    ? "Grid"
                    : "Solo"}
              </span>

              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/18 bg-emerald-400/8 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-100/78 shadow-[0_0_14px_rgba(52,211,153,0.12)]">
                <ShieldCheck size={11} />
                Telemetry Nominal
              </span>
            </div>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 xl:min-w-[620px] xl:grid-cols-4">
          <div className="relative overflow-hidden rounded-[24px] border border-red-400/22 bg-[radial-gradient(circle_at_top,rgba(248,113,113,0.18),transparent_42%),linear-gradient(180deg,rgba(127,29,29,0.42),rgba(239,68,68,0.09))] p-3 shadow-[0_0_42px_rgba(239,68,68,0.16)]">
            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.22em] text-red-100/65">
              <CircleDot size={12} className={isLive ? "animate-pulse text-red-300" : "text-white/30"} />
              Transmission
            </div>
            <div className="mt-1.5 text-base font-semibold tracking-[-0.03em] text-white">
              {isLive ? "On Air" : "Holding"}
            </div>
            <div className="mt-0.5 text-[11px] text-red-50/38">
              Program output {isLive ? "transmitting" : "standing by"}
            </div>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.22em] text-white/35">
              <Radio size={12} />
              Show State
            </div>
            <div className="mt-1.5 text-base font-semibold text-white">
              {previewProgramDifferent ? "Preview Armed" : "In Sync"}
            </div>
            <div className="mt-0.5 text-[11px] text-white/40">
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
    </div>
  )
}
