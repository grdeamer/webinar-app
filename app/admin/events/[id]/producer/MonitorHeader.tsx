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
      ? "text-red-200/80"
      : tone === "preview"
        ? "text-sky-200/80"
        : "text-white/40"

  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <div>
        <div className={`text-xs uppercase tracking-[0.2em] ${toneClass}`}>
          {title}
        </div>
        <div className="text-sm text-white/55">{subtitle}</div>
      </div>

      {badge ? <div className="shrink-0">{badge}</div> : null}
    </div>
  )
}