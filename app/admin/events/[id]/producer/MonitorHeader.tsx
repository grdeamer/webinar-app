import type { JSX, ReactNode } from "react"
import {
  Activity,
  Radio,
  ShieldCheck,
  Signal,
} from "lucide-react"

function TelemetryPill({
  icon,
  label,
  tone = "neutral",
}: {
  icon: JSX.Element
  label: string
  tone?: "neutral" | "live" | "preview"
}): JSX.Element {
  const toneClass =
    tone === "live"
      ? "border-red-300/18 bg-red-400/10 text-red-100/72"
      : tone === "preview"
        ? "border-sky-300/18 bg-sky-400/10 text-sky-100/72"
        : "border-white/10 bg-black/28 text-white/46"

  return (
    <div
      className={`flex items-center gap-1.5 rounded-full border px-2 py-1 text-[8px] font-black uppercase tracking-[0.16em] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] ${toneClass}`}
    >
      {icon}
      {label}
    </div>
  )
}

export default function MonitorHeader({
  title,
  subtitle,
  badge,
  tone = "neutral",
}: {
  title: string
  subtitle: string
  badge?: ReactNode
  tone?: "neutral" | "preview" | "program"
}): JSX.Element {
  const toneClass =
    tone === "program"
      ? "text-red-100"
      : tone === "preview"
        ? "text-sky-100"
        : "text-white/70"

  const accentBar =
    tone === "program"
      ? "from-red-400/90 via-red-300/50 to-transparent"
      : tone === "preview"
        ? "from-sky-400/90 via-sky-300/50 to-transparent"
        : "from-white/50 via-white/20 to-transparent"

  const dotClass =
    tone === "program"
      ? "bg-red-400 shadow-[0_0_12px_rgba(248,113,113,0.85)]"
      : tone === "preview"
        ? "bg-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.85)]"
        : "bg-white/50"

  return (
    <div className="relative mb-3 overflow-hidden rounded-[24px] border border-white/8 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.08),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.018))] px-3 py-2 shadow-[0_18px_55px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.035)] backdrop-blur-md">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.04),transparent_42%)]" />
      <div className="relative min-w-0 flex-1">
        <div className="mb-1 h-px w-28 overflow-hidden rounded-full bg-white/5 shadow-[0_0_12px_rgba(255,255,255,0.08)]">
          <div className={`h-full w-full bg-gradient-to-r ${accentBar}`} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${dotClass}`} />

          <div className={`text-[11px] font-black uppercase tracking-[0.24em] ${toneClass}`}>
            {title}
          </div>

          <TelemetryPill
            icon={<Radio size={9} />}
            label={tone === "program" ? "Program" : tone === "preview" ? "Preview" : "Confidence"}
            tone={tone === "program" ? "live" : tone === "preview" ? "preview" : "neutral"}
          />

          <TelemetryPill
            icon={<Signal size={9} />}
            label="Signal Locked"
          />
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-2">
          <div className="truncate text-[12px] text-white/48">
            {subtitle}
          </div>

          <div className="hidden items-center gap-1.5 rounded-full border border-emerald-300/12 bg-emerald-400/8 px-2 py-1 text-[8px] font-black uppercase tracking-[0.16em] text-emerald-100/52 lg:flex">
            <ShieldCheck size={9} />
            Routed Feed Stable
          </div>

          <div className="hidden items-center gap-1.5 rounded-full border border-violet-300/12 bg-violet-400/8 px-2 py-1 text-[8px] font-black uppercase tracking-[0.16em] text-violet-100/52 xl:flex">
            <Activity size={9} />
            Confidence Enabled
          </div>
        </div>
      </div>

      {badge ? (
        <div className="relative shrink-0 rounded-2xl border border-white/8 bg-black/24 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          {badge}
        </div>
      ) : null}
    </div>
  )
}