import type { JSX } from "react"

export type CinematicTransitionType = "fade" | "warp" | "curtain" | "none"

export default function CinematicTransitionOverlay({
  active,
  headline,
  message,
  transitionType = "fade",
}: {
  active: boolean
  headline?: string | null
  message?: string | null
  transitionType?: CinematicTransitionType | null
}): JSX.Element | null {
  if (!active || transitionType === "none") return null

  return (
    <div className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-black/80 backdrop-blur-xl">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(56,189,248,0.22),transparent_34%),radial-gradient(circle_at_70%_70%,rgba(168,85,247,0.18),transparent_32%),linear-gradient(180deg,rgba(2,6,23,0.35),rgba(0,0,0,0.92))]" />

      <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(125,211,252,0.7),transparent)]" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-[linear-gradient(90deg,transparent,rgba(196,181,253,0.55),transparent)]" />

      <div className="relative mx-6 max-w-2xl rounded-[32px] border border-white/10 bg-white/[0.045] p-8 text-center shadow-[0_30px_120px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.08)]">
        <div className="mx-auto mb-5 h-1.5 w-24 rounded-full bg-sky-300/70 shadow-[0_0_24px_rgba(125,211,252,0.65)]" />

        <div className="text-[11px] font-black uppercase tracking-[0.32em] text-sky-100/60">
          Jupiter Event Routing
        </div>

        <h2 className="mt-4 text-3xl font-black tracking-tight text-white md:text-5xl">
          {headline || "Moving you to the next experience"}
        </h2>

        <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-white/60 md:text-base">
          {message || "Stand by while Jupiter prepares your next destination."}
        </p>

        <div className="mt-7 flex justify-center gap-2">
          <span className="h-2 w-2 animate-pulse rounded-full bg-sky-300" />
          <span className="h-2 w-2 animate-pulse rounded-full bg-violet-300 [animation-delay:150ms]" />
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-300 [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  )
}