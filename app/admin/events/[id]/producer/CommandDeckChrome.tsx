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
  live: "border-rose-300/30 bg-rose-400/[0.085] text-rose-100 shadow-[0_0_14px_rgba(251,113,133,0.08)]",
  preview: "border-emerald-300/26 bg-emerald-400/[0.075] text-emerald-100 shadow-[0_0_12px_rgba(52,211,153,0.07)]",
  safe: "border-sky-300/26 bg-sky-400/[0.075] text-sky-100 shadow-[0_0_12px_rgba(56,189,248,0.07)]",
  warning: "border-amber-300/30 bg-amber-300/[0.085] text-amber-100 shadow-[0_0_12px_rgba(251,191,36,0.075)]",
  danger: "border-red-300/30 bg-red-400/[0.095] text-red-100 shadow-[0_0_14px_rgba(248,113,113,0.085)]",
  muted: "border-white/8 bg-black/24 text-white/42",
}

const surfaceVariantClassNames: Record<SurfaceVariant, string> = {
  default:
    "border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.032),rgba(255,255,255,0.014))] shadow-[0_18px_45px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.03)]",
  elevated:
    "border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.018))] shadow-[0_24px_65px_rgba(0,0,0,0.30),inset_0_1px_0_rgba(255,255,255,0.04)]",
  glass:
    "border-sky-200/10 bg-[linear-gradient(180deg,rgba(125,211,252,0.045),rgba(255,255,255,0.014))] shadow-[0_22px_58px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.035)] backdrop-blur-xl",
  critical:
    "border-amber-300/14 bg-[linear-gradient(180deg,rgba(251,191,36,0.075),rgba(255,255,255,0.014))] shadow-[0_24px_62px_rgba(0,0,0,0.32),0_0_18px_rgba(251,191,36,0.045),inset_0_1px_0_rgba(255,255,255,0.04)]",
  minimal:
    "border-white/8 bg-black/18 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]",
}

export const COMMAND_SURFACE_PADDING = "p-2.5"
export const COMMAND_SURFACE_RADIUS = "rounded-[22px]"
export const COMMAND_SECTION_GAP = "gap-2"

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
    <div className={`flex flex-wrap items-start justify-between gap-2.5 ${className}`}>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2 text-[8px] font-black uppercase tracking-[0.22em] text-white/28">
          {Icon ? <Icon size={12} className="text-white/34" /> : null}
          <span>{eyebrow}</span>
        </div>
        <div className="mt-0.5 text-[12px] font-black uppercase tracking-[0.13em] text-white/76">
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
    <div className={`rounded-[18px] border px-2.5 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)] ${getToneClassName(tone)} ${className}`}>
      <div className="text-[8px] font-black uppercase tracking-[0.18em] opacity-55">{label}</div>
      <div className="mt-0.5 text-[11px] font-black text-white/80">{value}</div>
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
      className={`rounded-[18px] border px-2.5 py-2 text-[9px] font-black uppercase tracking-[0.13em] shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] transition hover:-translate-y-px focus:outline-none focus:ring-2 focus:ring-sky-300/18 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0 ${toneClassName} ${className}`}
    >
      {children}
    </button>
  )
}

export function TelemetryAccent(): JSX.Element {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[30px] opacity-65">
      <div className="absolute left-0 right-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(125,211,252,0.18),transparent)] animate-[telemetryScan_8s_ease-in-out_infinite]" />
      <div className="absolute bottom-3 right-4 flex items-center gap-1.5 opacity-75">
        <span className="h-1 w-1 rounded-full bg-sky-300/70 shadow-[0_0_6px_rgba(125,211,252,0.38)] animate-[telemetryBlink_1.8s_ease-in-out_infinite]" />
        <span className="h-1 w-1 rounded-full bg-violet-300/60 shadow-[0_0_6px_rgba(196,181,253,0.32)] animate-[telemetryBlink_2.4s_ease-in-out_infinite]" />
        <span className="h-1 w-1 rounded-full bg-emerald-300/60 shadow-[0_0_6px_rgba(110,231,183,0.32)] animate-[telemetryBlink_3.1s_ease-in-out_infinite]" />
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
      className={`group relative inline-flex items-center gap-2 overflow-hidden rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] ${getToneClassName(tone)} ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent,rgba(255,255,255,0.028)_42%,transparent_64%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      <div className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-white/18 to-transparent" />
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          tone === "live"
            ? "bg-rose-300 shadow-[0_0_6px_rgba(253,164,175,0.42)]"
            : tone === "preview"
              ? "bg-emerald-300 shadow-[0_0_6px_rgba(110,231,183,0.36)]"
              : tone === "warning"
                ? "bg-amber-300 shadow-[0_0_6px_rgba(252,211,77,0.34)]"
                : tone === "danger"
                  ? "bg-red-300 shadow-[0_0_6px_rgba(252,165,165,0.38)]"
                  : tone === "muted"
                    ? "bg-white/22"
                    : "bg-sky-300/80 shadow-[0_0_6px_rgba(125,211,252,0.30)]"
        } ${pulse ? "animate-[telemetryBlink_1.65s_ease-in-out_infinite]" : ""} relative z-10`}
      />
      <span className="relative z-10">{label}</span>
      {value ? <span className="relative z-10 text-white/42">{value}</span> : null}
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
      className={`group relative overflow-hidden rounded-xl border px-2 py-1 text-[8px] font-black uppercase tracking-[0.18em] transition ${
        active ? getToneClassName(tone) : "border-white/8 bg-black/18 text-white/34"
      } ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent,rgba(255,255,255,0.024)_42%,transparent_64%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      <div className="pointer-events-none absolute inset-x-2 top-0 h-px bg-gradient-to-r from-transparent via-white/16 to-transparent" />
      <span className="relative z-10">{label}</span>
    </div>
  )
}

export function RoutingRow({
  source,
  destination,
  status = "Ready",
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
      <div className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.055),transparent)] opacity-30 animate-[meterSweep_4.6s_ease-in-out_infinite]" />
      <div className="relative z-10 flex w-full gap-1">
        {Array.from({ length }).map((_, index) => (
          <div
            key={index}
            className={`flex-1 rounded-full transition-all duration-500 ${
              getBarClassName
                ? getBarClassName(index)
                : activeBars !== undefined && index < activeBars
                  ? "bg-sky-300 shadow-[0_0_5px_rgba(125,211,252,0.32)] animate-[meterPulse_2.6s_ease-in-out_infinite]"
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
      className={`group relative overflow-hidden ${COMMAND_SURFACE_RADIUS} border ${COMMAND_SURFACE_PADDING} ${getSurfaceVariantClassName(variant)} transition-all duration-300 hover:scale-[1.002] ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 opacity-[0.04] bg-[repeating-linear-gradient(to_bottom,rgba(255,255,255,0.02)_0px,rgba(255,255,255,0.02)_1px,transparent_1px,transparent_7px)]" />
      <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/16 to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent,rgba(255,255,255,0.016)_42%,transparent_64%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      <div className="relative z-10">
        {children}
      </div>
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
      className={`group relative overflow-hidden rounded-2xl border px-3 py-2.5 text-[12px] font-black uppercase tracking-[0.14em] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0 ${className}`}
    >
      <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent,rgba(255,255,255,0.026)_42%,transparent_64%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      <span className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/18 to-transparent" />
      <span className="relative z-10">{children}</span>
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
      className="relative group overflow-hidden rounded-[18px] border border-amber-100/65 bg-[linear-gradient(180deg,rgba(253,230,138,0.98),rgba(251,191,36,0.98))] px-2.5 py-2 text-[11px] font-black uppercase tracking-[0.13em] text-black shadow-[0_0_18px_rgba(251,191,36,0.18),inset_0_1px_0_rgba(255,255,255,0.42)] transition hover:-translate-y-px hover:shadow-[0_0_24px_rgba(251,191,36,0.24),inset_0_1px_0_rgba(255,255,255,0.5)] focus:outline-none focus:ring-2 focus:ring-amber-200/35 active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0 disabled:active:scale-100"
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
      className={`rounded-[24px] border px-3 py-3 text-[9px] font-black uppercase tracking-[0.16em] text-white/62 transition hover:-translate-y-px hover:border-white/16 hover:bg-white/[0.04] hover:text-white/86 focus:outline-none focus:ring-2 focus:ring-sky-300/18 active:translate-y-0 ${getSurfaceVariantClassName("glass")} ${className}`}
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
          opacity: 0.12;
        }
        45% {
          transform: translateX(22%);
          opacity: 0.38;
        }
      }
      @keyframes telemetryBlink {
        0%,
        100% {
          opacity: 0.35;
          transform: scale(0.86);
        }
        45% {
          opacity: 0.72;
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
          opacity: 0.62;
          transform: scaleY(0.92);
        }
        45% {
          opacity: 0.82;
          transform: scaleY(1);
        }
      }
    `}</style>
  )
}