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
    <div className="relative min-h-screen">
      {children}

      <CinematicTransitionOverlay
        active={transitionActive}
        transitionType={transitionType}
        headline={headline}
        message={message}
      />
    </div>
  )
}