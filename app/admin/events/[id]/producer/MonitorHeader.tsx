import type { JSX, ReactNode } from "react"

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
    <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/[0.02] px-3 py-2 backdrop-blur-sm">
      <div className="min-w-0 flex-1">
        <div className="mb-1 h-px w-24 overflow-hidden rounded-full bg-white/5">
          <div className={`h-full w-full bg-gradient-to-r ${accentBar}`} />
        </div>

        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${dotClass}`} />
          <div className={`text-[11px] font-black uppercase tracking-[0.24em] ${toneClass}`}>
            {title}
          </div>
        </div>

        <div className="mt-1 truncate text-[12px] text-white/48">
          {subtitle}
        </div>
      </div>

      {badge ? <div className="shrink-0">{badge}</div> : null}
    </div>
  )
}