import type { JSX, ReactNode } from "react"

import type { LucideIcon } from "lucide-react"

type OperationalTone = "neutral" | "live" | "preview" | "safe" | "warning" | "danger" | "muted"

type StatusPillProps = {
  label: string
  value?: string
  tone?: OperationalTone
  pulse?: boolean
  className?: string
}

type BusBadgeProps = {
  label: string
  active?: boolean
  tone?: OperationalTone
  className?: string
}

type RoutingRowProps = {
  source: string
  destination: string
  status?: string
  tone?: OperationalTone
  icon?: LucideIcon
  className?: string
}

type ConfidenceTileProps = {
  label: string
  value: string
  detail?: string
  tone?: OperationalTone
  meter?: number
  className?: string
}

const toneClassNames: Record<OperationalTone, string> = {
  neutral: "border-white/10 bg-white/[0.035] text-white/68",
  live: "border-rose-300/35 bg-rose-400/[0.10] text-rose-100 shadow-[0_0_20px_rgba(251,113,133,0.13)]",
  preview: "border-emerald-300/30 bg-emerald-400/[0.09] text-emerald-100 shadow-[0_0_18px_rgba(52,211,153,0.11)]",
  safe: "border-sky-300/30 bg-sky-400/[0.09] text-sky-100 shadow-[0_0_18px_rgba(56,189,248,0.11)]",
  warning: "border-amber-300/35 bg-amber-300/[0.10] text-amber-100 shadow-[0_0_18px_rgba(251,191,36,0.12)]",
  danger: "border-red-300/35 bg-red-400/[0.12] text-red-100 shadow-[0_0_20px_rgba(248,113,113,0.14)]",
  muted: "border-white/8 bg-black/24 text-white/42",
}

function getToneClassName(tone: OperationalTone = "neutral"): string {
  return toneClassNames[tone]
}

export function TelemetryAccent(): JSX.Element {

  return (

    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[30px] opacity-90">

      <div className="absolute left-0 right-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(125,211,252,0.26),transparent)] animate-[telemetryScan_5.8s_ease-in-out_infinite]" />

      <div className="absolute bottom-3 right-4 flex items-center gap-1.5 opacity-75">

        <span className="h-1 w-1 rounded-full bg-sky-300/70 shadow-[0_0_8px_rgba(125,211,252,0.65)] animate-[telemetryBlink_1.8s_ease-in-out_infinite]" />

        <span className="h-1 w-1 rounded-full bg-violet-300/60 shadow-[0_0_8px_rgba(196,181,253,0.55)] animate-[telemetryBlink_2.4s_ease-in-out_infinite]" />

        <span className="h-1 w-1 rounded-full bg-emerald-300/60 shadow-[0_0_8px_rgba(110,231,183,0.55)] animate-[telemetryBlink_3.1s_ease-in-out_infinite]" />

      </div>

      <div className="absolute left-4 top-4 h-10 w-16 rounded-full border border-sky-200/8 opacity-40" />

      <div className="absolute left-7 top-7 h-px w-10 rotate-[-18deg] bg-sky-200/8" />

    </div>

  )

}

export function StatusPill({
  label,
  value,
  tone = "neutral",
  pulse = false,
  className = "",
}: StatusPillProps): JSX.Element {
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] ${getToneClassName(tone)} ${className}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          tone === "live"
            ? "bg-rose-300 shadow-[0_0_8px_rgba(253,164,175,0.65)]"
            : tone === "preview"
              ? "bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,0.58)]"
              : tone === "warning"
                ? "bg-amber-300 shadow-[0_0_8px_rgba(252,211,77,0.55)]"
                : tone === "danger"
                  ? "bg-red-300 shadow-[0_0_8px_rgba(252,165,165,0.62)]"
                  : tone === "muted"
                    ? "bg-white/22"
                    : "bg-sky-300/80 shadow-[0_0_8px_rgba(125,211,252,0.48)]"
        } ${pulse ? "animate-[telemetryBlink_1.65s_ease-in-out_infinite]" : ""}`}
      />
      <span>{label}</span>
      {value ? <span className="text-white/42">{value}</span> : null}
    </div>
  )
}

export function BusBadge({
  label,
  active = false,
  tone = "neutral",
  className = "",
}: BusBadgeProps): JSX.Element {
  return (
    <div
      className={`rounded-xl border px-2 py-1 text-[8px] font-black uppercase tracking-[0.18em] transition ${
        active ? getToneClassName(tone) : "border-white/8 bg-black/18 text-white/34"
      } ${className}`}
    >
      {label}
    </div>
  )
}

export function RoutingRow({
  source,
  destination,
  status = "Routed",
  tone = "safe",
  icon: Icon,
  className = "",
}: RoutingRowProps): JSX.Element {
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border border-white/8 bg-black/22 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] ${className}`}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent)] opacity-0 transition group-hover:opacity-100" />
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {Icon ? <Icon size={13} className="shrink-0 text-white/45" /> : null}
            <p className="truncate text-[10px] font-black uppercase tracking-[0.16em] text-white/74">
              {source}
            </p>
          </div>
          <div className="mt-1 flex items-center gap-2 text-[10px] font-semibold text-white/42">
            <span className="truncate">{destination}</span>
          </div>
        </div>
        <StatusPill label={status} tone={tone} />
      </div>
    </div>
  )
}

export function ConfidenceTile({
  label,
  value,
  detail,
  tone = "neutral",
  meter,
  className = "",
}: ConfidenceTileProps): JSX.Element {
  const safeMeter = typeof meter === "number" ? Math.max(0, Math.min(10, Math.round(meter))) : undefined

  return (
    <div
      className={`rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.012))] p-3 shadow-[0_18px_45px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.035)] ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-white/38">{label}</p>
          <p className="mt-1 truncate text-sm font-black text-white">{value}</p>
        </div>
        <span className={`rounded-full border px-2 py-1 text-[8px] font-black uppercase tracking-[0.16em] ${getToneClassName(tone)}`}>
          {tone}
        </span>
      </div>
      {detail ? <p className="mt-2 text-[11px] leading-relaxed text-white/42">{detail}</p> : null}
      {safeMeter !== undefined ? <div className="mt-3"><LevelMeter length={10} activeBars={safeMeter} /></div> : null}
    </div>
  )
}

export function LevelMeter({
  length,
  activeBars,
  getBarClassName,
}: {
  length: number
  activeBars?: number
  getBarClassName?: (index: number) => string
}): JSX.Element {
  return (
    <div className="relative flex h-3 overflow-hidden rounded-full border border-white/8 bg-black/38 px-1 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      <div className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.10),transparent)] opacity-45 animate-[meterSweep_2.8s_ease-in-out_infinite]" />
      <div className="relative z-10 flex w-full gap-1">
        {Array.from({ length }).map((_, index) => (
          <div
            key={index}
            className={`flex-1 rounded-full transition-all duration-500 ${
              getBarClassName
                ? getBarClassName(index)
                : activeBars !== undefined && index < activeBars
                  ? "bg-sky-300 shadow-[0_0_7px_rgba(125,211,252,0.55)] animate-[meterPulse_1.9s_ease-in-out_infinite]"
                  : "bg-white/8"
            }`}
            style={{ animationDelay: `${index * 70}ms` }}
          />
        ))}
      </div>
    </div>
  )
}

export function PanelCard({

  children,

  className = "",

}: {

  children: ReactNode

  className?: string

}): JSX.Element {

  return (

    <div

      className={`rounded-[24px] border border-white/10 bg-black/24 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] ${className}`}

    >

      {children}

    </div>

  )

}

export function CommandButton({

  children,

  className = "",

  disabled = false,

  onClick,

  title,

  type = "button",

}: {

  children: ReactNode

  className?: string

  disabled?: boolean

  onClick?: () => void

  title?: string

  type?: "button" | "submit" | "reset"

}): JSX.Element {

  return (

    <button

      type={type}

      onClick={onClick}

      disabled={disabled}

      title={title}

      className={`rounded-2xl border px-3 py-2.5 text-[12px] font-black uppercase tracking-[0.14em] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-45 ${className}`}

    >

      {children}

    </button>

  )

}

export function PrimaryTakeButton({

  disabled,

  isTaking,

  onClick,

}: {

  disabled: boolean

  isTaking: boolean

  onClick: () => void

}): JSX.Element {

  return (

    <button

      type="button"

      onClick={onClick}

      disabled={disabled}

      className="relative group overflow-hidden rounded-2xl border border-amber-100/70 bg-[linear-gradient(180deg,rgba(253,230,138,1),rgba(251,191,36,1))] px-3 py-2.5 text-[12px] font-black uppercase tracking-[0.14em] text-black shadow-[0_0_28px_rgba(251,191,36,0.28),inset_0_1px_0_rgba(255,255,255,0.5)] transition hover:-translate-y-0.5 hover:shadow-[0_0_38px_rgba(251,191,36,0.38),inset_0_1px_0_rgba(255,255,255,0.6)] active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"

      title="Take preview to program (T)"

    >

      <span className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.22),transparent)] opacity-0 transition group-hover:opacity-100" />

      <span className="relative z-10">{isTaking ? "Taking" : "Take"}</span>

    </button>

  )

}

export function IconGlassButton({

  label,

  icon: Icon,

  className = "",

  showLabel = true,

}: {

  label: string

  icon: LucideIcon

  className?: string

  showLabel?: boolean

}): JSX.Element {

  return (

    <button

      type="button"

      className={`rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.016))] px-3 py-3 text-[9px] font-black uppercase tracking-[0.16em] text-white/66 shadow-[0_16px_45px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.035)] transition hover:-translate-y-0.5 hover:border-white/18 hover:bg-white/[0.05] hover:text-white active:translate-y-0 ${className}`}

      aria-label={label}

    >

      <Icon size={15} className={showLabel ? "mx-auto mb-1.5" : "mx-auto"} />

      {showLabel ? label : null}

    </button>

  )

}

export function CommandDeckChromeStyles(): JSX.Element {
  return (
    <style jsx>{`
      @keyframes telemetryBlink {
        0%,
        100% {
          opacity: 0.45;
          transform: scale(0.86);
        }
        45% {
          opacity: 1;
          transform: scale(1);
        }
      }
      @keyframes meterSweep {
        0% {
          transform: translateX(-130%);
          opacity: 0;
        }
        22% {
          opacity: 0.5;
        }
        55% {
          opacity: 0.28;
        }
        100% {
          transform: translateX(330%);
          opacity: 0;
        }
      }

      @keyframes meterPulse {
        0%,
        100% {
          opacity: 0.76;
          transform: scaleY(0.88);
        }
        45% {
          opacity: 1;
          transform: scaleY(1);
        }
      }
    `}</style>
  )
}