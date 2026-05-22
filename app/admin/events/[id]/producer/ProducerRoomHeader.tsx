import { useEffect, useMemo, useState, type JSX } from "react"
import {
  Activity,
  Clock3,
  Radio,
  Signal,
  UserCog,
} from "lucide-react"

type StageLayout = "solo" | "grid" | "screen_speaker"

function MissionPill({
  icon,
  label,
  value,
  tone = "neutral",
}: {
  icon: JSX.Element
  label: string
  value: string
  tone?: "neutral" | "live" | "good" | "warn" | "sky" | "green"
}): JSX.Element {
  const toneClass =
    tone === "live"
      ? "border-red-300/10 bg-red-400/[0.045] text-red-100/46"
      : tone === "good" || tone === "green"
        ? "border-emerald-300/8 bg-emerald-400/[0.035] text-emerald-100/42"
        : tone === "warn"
          ? "border-amber-300/8 bg-amber-400/[0.035] text-amber-100/42"
          : tone === "sky"
            ? "border-sky-300/8 bg-sky-400/[0.035] text-sky-100/42"
            : "border-white/6 bg-white/[0.016] text-white/30"

  return (
    <div
      className={`flex h-7 min-w-0 items-center gap-1.5 rounded-full border px-2.5 py-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.014)] ${toneClass}`}
    >
      <span className="shrink-0 opacity-58">{icon}</span>
      <span className="hidden text-[8px] font-black uppercase tracking-[0.11em] text-white/22 2xl:inline">
        {label}
      </span>
      <span className="truncate text-[10px] font-semibold tracking-[-0.01em]">
        {value}
      </span>
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
    <MissionPill
      icon={<Clock3 size={11} />}
      label="Runtime"
      value={runtime}
      tone="neutral"
    />
  )
}

function HeaderTransmissionBadge({ isLive }: { isLive: boolean }): JSX.Element {
  return (
    <div
      className={`relative h-7 overflow-hidden rounded-full border px-2.5 py-0 text-[9px] font-black uppercase tracking-[0.11em] backdrop-blur-md transition-all duration-500 ${
        isLive
          ? "border-red-200/10 bg-red-500/[0.045] text-red-100/44 shadow-[0_0_7px_rgba(248,113,113,0.045)]"
          : "border-sky-200/8 bg-sky-500/[0.035] text-sky-100/40 shadow-[0_0_6px_rgba(56,189,248,0.035)]"
      }`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(110deg,transparent,rgba(255,255,255,0.006)_44%,transparent_62%)] animate-[headerTransmissionSweep_34s_ease-in-out_infinite]" />
      <div className="relative flex h-full items-center gap-1.5">
        <span
          className={`h-1 w-1 rounded-full ${
            isLive
              ? "bg-red-300/56 shadow-[0_0_4px_rgba(252,165,165,0.12)]"
              : "bg-sky-300/50 shadow-[0_0_4px_rgba(125,211,252,0.10)]"
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
  const layoutLabel =
    layout === "screen_speaker" ? "Speaker + Screen" : layout === "grid" ? "Grid" : "Solo"

  return (
    <div className="relative overflow-hidden border-b border-white/[0.030] bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.014),transparent_30%),radial-gradient(circle_at_top_left,rgba(168,85,247,0.012),transparent_26%),linear-gradient(180deg,rgba(6,12,26,0.78),rgba(2,6,16,0.68))] px-4 py-2 shadow-[0_4px_14px_rgba(0,0,0,0.12)] backdrop-blur-xl xl:px-5">
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 h-px transition-opacity duration-500 ${
          isLive
            ? "bg-gradient-to-r from-transparent via-red-200/10 to-transparent opacity-42"
            : "bg-gradient-to-r from-transparent via-sky-200/8 to-transparent opacity-34"
        }`}
      />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent,rgba(255,255,255,0.003)_38%,transparent_62%)] animate-[headerTransmissionSweep_42s_ease-in-out_infinite]" />

      <div className="relative z-10 flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-sky-300/10 bg-sky-400/[0.035] shadow-[0_0_18px_rgba(56,189,248,0.055)]">
            <div className="h-[22px] w-[22px] rounded-full border border-sky-200/28 bg-[radial-gradient(circle_at_35%_25%,rgba(255,255,255,0.62),rgba(56,189,248,0.20)_35%,rgba(79,70,229,0.12)_70%)] shadow-[0_0_10px_rgba(125,211,252,0.14)]" />
            <div className="absolute h-7 w-10 -rotate-12 rounded-full border border-sky-200/10" />
          </div>

          <div className="min-w-0">
            <div className="hidden items-center gap-2 text-[9px] font-black uppercase tracking-[0.16em] text-white/28 lg:flex">
              <span>Jupiter</span>
              <span className="text-white/14">/</span>
              <span>Producer Room</span>
              <span className="text-white/14">/</span>
              <span>{scopeLabel}</span>
            </div>

            <div className="flex min-w-0 items-center gap-2">
              <h1 className="truncate text-[18px] font-semibold leading-none tracking-[-0.04em] text-white/82 xl:text-[20px]">
                {headline}
              </h1>

              <HeaderTransmissionBadge isLive={isLive} />

              <span className="hidden h-7 items-center gap-1.5 rounded-full border border-white/[0.065] bg-white/[0.018] px-2.5 text-[9px] font-black uppercase tracking-[0.10em] text-white/34 lg:inline-flex">
                <Activity size={10} />
                {layoutLabel}
              </span>
            </div>
          </div>
        </div>

        <div className="flex min-w-0 shrink-0 items-center justify-end gap-1.5 opacity-90">
          <MissionPill
            icon={<Radio size={11} />}
            label="Show"
            value={previewProgramDifferent ? "Preview Armed" : "In Sync"}
            tone={previewProgramDifferent ? "warn" : "good"}
          />

          <MissionPill
            icon={<Signal size={11} />}
            label="Uplink"
            value="99% locked"
            tone="good"
          />

          <MissionPill
            icon={<UserCog size={11} />}
            label="Talent"
            value={`${onStageCount} on stage`}
            tone="neutral"
          />
          <div className="hidden xl:block">
            <MissionClock />
          </div>
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
            opacity: 0.045;
          }

          100% {
            transform: translateX(18%);
          }
        }
      `}</style>
    </div>
  )
}