import { useEffect, useMemo, useState, type JSX } from "react"
import {
  Activity,
  Clock3,
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
      className={`flex h-7 min-w-0 items-center gap-1.5 rounded-[7px] border px-2.5 py-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.014)] ${toneClass}`}
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

export default function ProducerRoomHeader({
  headline,
  layout,
  onStageCount,
  isLive,
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
    <div className="relative h-[68px] overflow-hidden bg-[#060a13] px-4 shadow-[0_8px_24px_rgba(0,0,0,0.14)] xl:px-5">
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 h-px transition-opacity duration-500 ${
          isLive
            ? "bg-gradient-to-r from-transparent via-red-200/10 to-transparent opacity-42"
            : "bg-gradient-to-r from-transparent via-sky-200/8 to-transparent opacity-34"
        }`}
      />
      <div className="relative z-10 grid h-full grid-cols-[minmax(190px,1fr)_minmax(220px,1.35fr)_minmax(180px,1fr)] items-center gap-4 pr-44">
        <div className="flex min-w-0 items-center gap-3">
          <div className="min-w-0">
            <div className="text-[8px] font-bold uppercase tracking-[0.18em] text-sky-200/46">
              Jupiter / Live production
            </div>
            <h1 className="mt-0.5 truncate text-[17px] font-semibold leading-none tracking-[-0.025em] text-white/92 xl:text-[19px]">
              Producer Room
            </h1>
          </div>
        </div>

        <div className="min-w-0 text-center">
          <div className="text-[8px] font-bold uppercase tracking-[0.15em] text-white/28">
            Main Stage
          </div>
          <div className="mt-0.5 truncate text-[13px] font-semibold text-white/76 xl:text-[14px]">
            {headline}
          </div>
        </div>

        <div className="flex min-w-0 shrink-0 items-center justify-end gap-1.5 opacity-90">
          <MissionPill
            icon={<UserCog size={11} />}
            label="Talent"
            value={`${onStageCount} ready`}
            tone={onStageCount > 0 ? "green" : "neutral"}
          />

          <div className="hidden xl:block">
            <MissionClock />
          </div>

          <span className="hidden h-7 items-center gap-1.5 rounded-[7px] border border-white/[0.065] bg-white/[0.018] px-2.5 text-[9px] font-black uppercase tracking-[0.10em] text-white/34 2xl:inline-flex">
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
