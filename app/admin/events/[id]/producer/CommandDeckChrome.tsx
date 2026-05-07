import type { JSX, ReactNode } from "react"

import type { LucideIcon } from "lucide-react"

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

    <div className="flex h-3 gap-1 rounded-full border border-white/8 bg-black/38 px-1 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">

      {Array.from({ length }).map((_, index) => (

        <div

          key={index}

          className={`flex-1 rounded-full transition ${

            getBarClassName

              ? getBarClassName(index)

              : activeBars !== undefined && index < activeBars

                ? "bg-sky-300 shadow-[0_0_6px_rgba(125,211,252,0.45)]"

                : "bg-white/8"

          }`}

        />

      ))}

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