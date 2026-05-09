import type { JSX, ReactNode } from "react"

import type { LucideIcon } from "lucide-react"

type OperationalTone = "neutral" | "live" | "preview" | "safe" | "warning" | "danger" | "muted"
type SurfaceVariant = "default" | "elevated" | "glass" | "critical" | "minimal"

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

type SurfaceHeaderProps = {
  eyebrow: string
  title: string
  status?: string
  tone?: OperationalTone
  icon?: LucideIcon
  className?: string
}

type CompactStatTileProps = {
  label: string
  value: string
  tone?: OperationalTone
  detail?: string
  className?: string
}

type CommandActionButtonProps = {
  children: ReactNode
  tone?: OperationalTone
  className?: string
  disabled?: boolean
  onClick?: () => void
  title?: string
  type?: "button" | "submit" | "reset"
}

type SurfaceDividerProps = {
  className?: string
}

type CompactStatusItem = {
  label: string
  value: string
  tone?: OperationalTone
  detail?: string
}

type CompactStatusGridProps = {
  items: CompactStatusItem[]
  columnsClassName?: string
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

const surfaceVariantClassNames: Record<SurfaceVariant, string> = {
  default:
    "border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.016))] shadow-[0_18px_45px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.035)]",
  elevated:
    "border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.02))] shadow-[0_24px_70px_rgba(0,0,0,0.32),inset_0_1px_0_rgba(255,255,255,0.05)]",
  glass:
    "border-sky-200/10 bg-[linear-gradient(180deg,rgba(125,211,252,0.07),rgba(255,255,255,0.018))] shadow-[0_22px_65px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.045)] backdrop-blur-xl",
  critical:
    "border-amber-300/16 bg-[linear-gradient(180deg,rgba(251,191,36,0.12),rgba(255,255,255,0.018))] shadow-[0_24px_70px_rgba(0,0,0,0.34),0_0_30px_rgba(251,191,36,0.08),inset_0_1px_0_rgba(255,255,255,0.05)]",
  minimal:
    "border-white/8 bg-black/18 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]",
}

export const COMMAND_SURFACE_PADDING = "p-3"
export const COMMAND_SURFACE_RADIUS = "rounded-[24px]"
export const COMMAND_SECTION_GAP = "gap-2.5"

function getToneClassName(tone: OperationalTone = "neutral"): string {
  return toneClassNames[tone]
}

export function getSurfaceVariantClassName(variant: SurfaceVariant = "default"): string {
  return surfaceVariantClassNames[variant]
}

export function SurfaceHeader({
  eyebrow,
  title,
  status,
  tone = "neutral",
  icon: Icon,
  className = "",
}: SurfaceHeaderProps): JSX.Element {
  return (
    <div className={`flex flex-wrap items-start justify-between gap-3 ${className}`}>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2 text-[8px] font-black uppercase tracking-[0.22em] text-white/28">
          {Icon ? <Icon size={12} className="text-white/34" /> : null}
          <span>{eyebrow}</span>
        </div>
        <div className="mt-1 text-[13px] font-black uppercase tracking-[0.14em] text-white/78">
          {title}
        </div>
      </div>
      {status ? <StatusPill label={status} tone={tone} className="shrink-0" /> : null}
    </div>
  )
}

export function CompactStatTile({
  label,
  value,
  tone = "neutral",
  detail,
  className = "",
}: CompactStatTileProps): JSX.Element {
  return (
    <div className={`rounded-2xl border px-2.5 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)] ${getToneClassName(tone)} ${className}`}>
      <div className="text-[8px] font-black uppercase tracking-[0.18em] opacity-55">{label}</div>
      <div className="mt-1 text-[12px] font-black text-white/82">{value}</div>
      {detail ? <div className="mt-1 text-[10px] font-semibold opacity-50">{detail}</div> : null}
    </div>
  )
}

export function CompactStatusGrid({
  items,
  columnsClassName = "md:grid-cols-5",
  className = "",
}: CompactStatusGridProps): JSX.Element {
  return (
    <div className={`grid gap-1.5 ${columnsClassName} ${className}`}>
      {items.map((item) => (
        <CompactStatTile
          key={`${item.label}-${item.value}`}
          label={item.label}
          value={item.value}
          tone={item.tone ?? "neutral"}
          detail={item.detail}
        />
      ))}
    </div>
  )
}

export function SurfaceDivider({ className = "" }: SurfaceDividerProps): JSX.Element {
  return (
    <div
      className={`h-px w-full bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.12),transparent)] ${className}`}
    />
  )
}

export function CommandActionButton({
  children,
  tone = "neutral",
  className = "",
  disabled = false,
  onClick,
  title,
  type = "button",
}: CommandActionButtonProps): JSX.Element {
  const toneClassName =
    tone === "live"
      ? "border-rose-300/35 bg-rose-400/12 text-rose-100 hover:bg-rose-400/16"
      : tone === "preview"
        ? "border-emerald-300/24 bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/14"
        : tone === "safe"
          ? "border-sky-300/24 bg-sky-400/10 text-sky-100 hover:bg-sky-400/14"
          : tone === "warning"
            ? "border-amber-300/30 bg-amber-400/12 text-amber-100 hover:bg-amber-400/16"
            : tone === "danger"
              ? "border-red-300/32 bg-red-400/12 text-red-100 hover:bg-red-400/16"
              : tone === "muted"
                ? "border-white/8 bg-black/20 text-white/34 hover:bg-white/[0.035]"
                : "border-white/10 bg-black/24 text-white/62 hover:bg-white/[0.05] hover:text-white/84"

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`rounded-2xl border px-3 py-2.5 text-[10px] font-black uppercase tracking-[0.14em] shadow-[inset_0_1px_0_rgba(255,255,255,0.045)] transition hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-sky-300/20 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-45 ${toneClassName} ${className}`}
    >
      {children}
    </button>
  )
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
      className={`rounded-[22px] border ${COMMAND_SURFACE_PADDING} ${getSurfaceVariantClassName("default")} ${className}`}
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
  variant = "default",
}: {
  children: ReactNode
  className?: string
  variant?: SurfaceVariant
}): JSX.Element {
  return (
    <div
      className={`${COMMAND_SURFACE_RADIUS} border ${COMMAND_SURFACE_PADDING} ${getSurfaceVariantClassName(variant)} ${className}`}
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
      className="relative group overflow-hidden rounded-2xl border border-amber-100/70 bg-[linear-gradient(180deg,rgba(253,230,138,1),rgba(251,191,36,1))] px-3 py-2.5 text-[12px] font-black uppercase tracking-[0.14em] text-black shadow-[0_0_28px_rgba(251,191,36,0.28),inset_0_1px_0_rgba(255,255,255,0.5)] transition hover:-translate-y-0.5 hover:shadow-[0_0_38px_rgba(251,191,36,0.38),inset_0_1px_0_rgba(255,255,255,0.6)] focus:outline-none focus:ring-2 focus:ring-amber-200/40 active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"
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
      className={`rounded-[24px] border px-3 py-3 text-[9px] font-black uppercase tracking-[0.16em] text-white/66 transition hover:-translate-y-0.5 hover:border-white/18 hover:bg-white/[0.05] hover:text-white focus:outline-none focus:ring-2 focus:ring-sky-300/20 active:translate-y-0 ${getSurfaceVariantClassName("glass")} ${className}`}
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
      @keyframes telemetryScan {
        0%,
        100% {
          transform: translateX(-22%);
          opacity: 0.18;
        }
        45% {
          transform: translateX(22%);
          opacity: 0.72;
        }
      }
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