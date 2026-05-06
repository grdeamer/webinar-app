"use client"

import type { JSX, ReactNode } from "react"
import CinematicTransitionOverlay, {
  type CinematicTransitionType,
} from "./CinematicTransitionOverlay"

export default function TransitionAwareEventShell({
  children,
  transitionActive,
  transitionType,
  headline,
  message,
}: {
  children: ReactNode
  transitionActive: boolean
  transitionType?: CinematicTransitionType | null
  headline?: string | null
  message?: string | null
}): JSX.Element {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div
        className={[
          "transition-all duration-300 ease-out",
          transitionActive
            ? "opacity-80 scale-[0.995] blur-[0.5px]"
            : "opacity-100 scale-100 blur-0",
        ].join(" ")}
        aria-hidden={transitionActive}
      >
        {children}
      </div>

      <div className="pointer-events-none absolute inset-0 z-[100]">
        <CinematicTransitionOverlay
          active={transitionActive}
          transitionType={transitionType}
          headline={headline}
          message={message}
        />
      </div>
    </div>
  )
}