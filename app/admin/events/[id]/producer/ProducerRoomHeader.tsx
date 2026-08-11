import { useEffect, useMemo, useState, type JSX } from "react"
import {
  Activity,
  Clock3,
  Radio,
  UserCog,
} from "lucide-react"
import JupiterLogo from "@/components/brand/JupiterLogo"

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
  const [seconds, setSeconds] = useState(0)

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
      label="Room open"
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
    <div className="relative overflow-hidden border-b border-white/[0.045] bg-[radial-gradient(circle_at_top_right,rgba(112,87,255,0.06),transparent_32%),linear-gradient(180deg,rgba(10,15,34,0.96),rgba(6,9,22,0.92))] px-5 py-3 shadow-[0_8px_24px_rgba(0,0,0,0.18)] backdrop-blur-xl xl:px-7">
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 h-px transition-opacity duration-500 ${
          isLive
            ? "bg-gradient-to-r from-transparent via-red-200/10 to-transparent opacity-42"
            : "bg-gradient-to-r from-transparent via-sky-200/8 to-transparent opacity-34"
        }`}
      />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent,rgba(255,255,255,0.003)_38%,transparent_62%)] animate-[headerTransmissionSweep_42s_ease-in-out_infinite]" />

      <div className="relative z-10 grid grid-cols-[minmax(250px,1fr)_minmax(280px,1.4fr)_minmax(250px,1fr)] items-center gap-5 pr-52">
        <div className="flex min-w-0 items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] border border-violet-300/16 bg-violet-400/[0.08] text-white/88 shadow-[0_0_24px_rgba(112,87,255,0.12),inset_0_1px_0_rgba(255,255,255,0.05)]">
            <JupiterLogo showWordmark={false} markClassName="h-8 w-8" />
          </div>

          <div className="min-w-0">
            <div className="text-[9px] font-black uppercase tracking-[0.19em] text-violet-200/58">
              Jupiter
            </div>
            <h1 className="truncate text-[22px] font-bold leading-none tracking-[-0.035em] text-white/94 xl:text-[25px]">
              Producer Room
            </h1>
          </div>
        </div>

        <div className="min-w-0 text-center">
          <div className="text-[9px] font-black uppercase tracking-[0.15em] text-white/30">
            Current production
          </div>
          <div className="mt-1 truncate text-[15px] font-semibold text-white/82 xl:text-[17px]">
            {headline}
          </div>
        </div>

        <div className="flex min-w-0 shrink-0 items-center justify-end gap-1.5 opacity-90">
          <MissionPill
            icon={<Radio size={11} />}
            label="Program"
            value={isLive ? "Live" : "Standby"}
            tone={isLive ? "live" : "neutral"}
          />

          <MissionPill
            icon={<UserCog size={11} />}
            label="Talent"
            value={`${onStageCount} ready`}
            tone={onStageCount > 0 ? "green" : "neutral"}
          />

          <div className="hidden xl:block">
            <MissionClock />
          </div>

          <span className="hidden h-7 items-center gap-1.5 rounded-full border border-white/[0.065] bg-white/[0.018] px-2.5 text-[9px] font-black uppercase tracking-[0.10em] text-white/34 2xl:inline-flex">
            <Activity size={10} />
            {layoutLabel}
          </span>
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
