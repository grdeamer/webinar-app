"use client"

import { useEffect, useMemo, useState } from "react"

type TransitionVariant = "general_session" | "session" | "breakout" | "off_air"
type TransitionType = "fade" | "wipe" | "zoom" | "dip_to_black"

export default function StageTransitionOverlay({
  active,
  variant = "general_session",
  transitionType = "fade",
  headline,
  message,
  holdMs = 1600,
}: {
  active: boolean
  variant?: TransitionVariant
  transitionType?: string
  headline?: string | null
  message?: string | null
  holdMs?: number
}) {
  const [visible, setVisible] = useState(false)
  const [phase, setPhase] = useState<"enter" | "hold" | "exit">("enter")

  const normalizedType: TransitionType =
    transitionType === "wipe" ||
    transitionType === "zoom" ||
    transitionType === "dip_to_black"
      ? transitionType
      : "fade"

  useEffect(() => {
    if (!active) {
      setVisible(false)
      setPhase("enter")
      return
    }

    setVisible(true)
    setPhase("enter")

    const enterTimer = window.setTimeout(() => {
      setPhase("hold")
    }, 120)

    const exitTimer = window.setTimeout(() => {
      setPhase("exit")
    }, Math.max(500, holdMs - 320))

    const doneTimer = window.setTimeout(() => {
      setVisible(false)
      setPhase("enter")
    }, holdMs)

    return () => {
      window.clearTimeout(enterTimer)
      window.clearTimeout(exitTimer)
      window.clearTimeout(doneTimer)
    }
  }, [active, holdMs])

  const content = useMemo(() => {
    return {
      title: headline?.trim() || defaultHeadline(variant),
      body: message?.trim() || defaultMessage(variant),
    }
  }, [headline, message, variant])

  if (!visible) return null

  const contentAnimationClass =
    normalizedType === "wipe"
      ? phase === "enter"
        ? "translate-x-8 opacity-0"
        : phase === "exit"
          ? "-translate-x-6 opacity-0"
          : "translate-x-0 opacity-100"
      : normalizedType === "zoom"
        ? phase === "enter"
          ? "scale-95 opacity-0"
          : phase === "exit"
            ? "scale-[1.03] opacity-0"
            : "scale-100 opacity-100"
        : phase === "enter"
          ? "translate-y-4 opacity-0"
          : phase === "exit"
            ? "-translate-y-2 opacity-0"
            : "translate-y-0 opacity-100"

  const overlayOpacityClass =
    phase === "exit" ? "opacity-0" : "opacity-100"

  const wipeClipPath =
    phase === "enter"
      ? "inset(0 100% 0 0)"
      : phase === "exit"
        ? "inset(0 0 0 100%)"
        : "inset(0 0 0 0)"

  return (
    <div
      className={`pointer-events-none fixed inset-0 z-[999] overflow-hidden transition-opacity duration-300 ${overlayOpacityClass}`}
    >
      {normalizedType === "wipe" ? (
        <div
          className="absolute inset-0 transition-[clip-path] duration-500"
          style={{
            clipPath: wipeClipPath,
            background:
              "radial-gradient(circle at center, rgba(37,99,235,0.22), rgba(2,6,23,0.95) 42%, rgba(0,0,0,1) 100%)",
          }}
        />
      ) : (
        <div
          className={`absolute inset-0 ${
            normalizedType === "dip_to_black"
              ? "bg-black"
              : "bg-[radial-gradient(circle_at_center,rgba(37,99,235,0.22),rgba(2,6,23,0.95)_42%,rgba(0,0,0,1)_100%)]"
          }`}
        />
      )}

      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),transparent_28%,transparent_72%,rgba(255,255,255,0.02))]" />

      <div
        className={`absolute left-1/2 top-1/2 h-[42rem] w-[42rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10 opacity-40 transition-all duration-500 ${
          normalizedType === "zoom" && phase === "hold" ? "scale-105" : "scale-100"
        }`}
      />
      <div
        className={`absolute left-1/2 top-1/2 h-[30rem] w-[30rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-sky-300/20 opacity-50 transition-all duration-500 ${
          normalizedType === "zoom" && phase === "hold" ? "scale-110" : "scale-100"
        }`}
      />
      <div
        className={`absolute left-1/2 top-1/2 h-[18rem] w-[18rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10 opacity-40 transition-all duration-500 ${
          normalizedType === "zoom" && phase === "hold" ? "scale-115" : "scale-100"
        }`}
      />

      <div className="absolute inset-0 flex items-center justify-center px-6">
        <div
          className={`w-full max-w-3xl text-center transition-all duration-500 ${contentAnimationClass}`}
        >
          <div className="mb-4 text-[11px] uppercase tracking-[0.38em] text-sky-200/70">
            Jupiter.events
          </div>

          <h2 className="text-4xl font-semibold tracking-tight text-white md:text-6xl">
            {content.title}
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-white/70 md:text-lg">
            {content.body}
          </p>

          <div className="mx-auto mt-8 h-px w-32 bg-gradient-to-r from-transparent via-sky-300/70 to-transparent" />
        </div>
      </div>
    </div>
  )
}

function defaultHeadline(variant: TransitionVariant) {
  switch (variant) {
    case "general_session":
      return "Now Entering General Session"
    case "session":
      return "Entering Session"
    case "breakout":
      return "Entering Breakout"
    case "off_air":
      return "We’ll Be Right Back"
  }
}

function defaultMessage(variant: TransitionVariant) {
  switch (variant) {
    case "general_session":
      return "The keynote is beginning now."
    case "session":
      return "Your next session is opening."
    case "breakout":
      return "We’re moving you into a breakout room."
    case "off_air":
      return "Returning to the event home page."
  }
}