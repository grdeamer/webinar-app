"use client"

import { useEffect, useMemo, useState } from "react"

type TransitionVariant = "general_session" | "session" | "breakout" | "off_air"
type TransitionType =
  | "fade"
  | "wipe"
  | "wipe_left"
  | "wipe_right"
  | "zoom"
  | "zoom_in"
  | "zoom_out"
  | "dip_to_black"

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
    transitionType === "fade" ||
    transitionType === "wipe" ||
    transitionType === "wipe_left" ||
    transitionType === "wipe_right" ||
    transitionType === "zoom" ||
    transitionType === "zoom_in" ||
    transitionType === "zoom_out" ||
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
    }, 140)

    const exitTimer = window.setTimeout(() => {
      setPhase("exit")
    }, Math.max(600, holdMs - 420))

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

  const isWipe =
    normalizedType === "wipe" ||
    normalizedType === "wipe_left" ||
    normalizedType === "wipe_right"

  const isZoom =
    normalizedType === "zoom" ||
    normalizedType === "zoom_in" ||
    normalizedType === "zoom_out"

  const overlayOpacityClass =
    phase === "enter"
      ? "opacity-0"
      : phase === "exit"
        ? "opacity-0"
        : "opacity-100"

  const contentAnimationClass = isWipe
    ? normalizedType === "wipe_right"
      ? phase === "enter"
        ? "-translate-x-20 opacity-0"
        : phase === "exit"
          ? "translate-x-16 opacity-0"
          : "translate-x-0 opacity-100"
      : phase === "enter"
        ? "translate-x-20 opacity-0"
        : phase === "exit"
          ? "-translate-x-16 opacity-0"
          : "translate-x-0 opacity-100"
    : normalizedType === "zoom_in"
      ? phase === "enter"
        ? "scale-75 opacity-0"
        : phase === "exit"
          ? "scale-110 opacity-0"
          : "scale-100 opacity-100"
      : normalizedType === "zoom_out"
        ? phase === "enter"
          ? "scale-115 opacity-0"
          : phase === "exit"
            ? "scale-92 opacity-0"
            : "scale-100 opacity-100"
        : normalizedType === "zoom"
          ? phase === "enter"
            ? "scale-90 opacity-0"
            : phase === "exit"
              ? "scale-105 opacity-0"
              : "scale-100 opacity-100"
          : normalizedType === "dip_to_black"
            ? phase === "enter"
              ? "translate-y-2 opacity-0"
              : phase === "exit"
                ? "-translate-y-1 opacity-0"
                : "translate-y-0 opacity-100"
            : phase === "enter"
              ? "translate-y-6 opacity-0"
              : phase === "exit"
                ? "-translate-y-3 opacity-0"
                : "translate-y-0 opacity-100"

  const wipeClipPath =
    normalizedType === "wipe_right"
      ? phase === "enter"
        ? "inset(0 0 0 100%)"
        : phase === "exit"
          ? "inset(0 100% 0 0)"
          : "inset(0 0 0 0)"
      : phase === "enter"
        ? "inset(0 100% 0 0)"
        : phase === "exit"
          ? "inset(0 0 0 100%)"
          : "inset(0 0 0 0)"

  const wipeSheenClipPath = wipeClipPath

  const ringScaleClass =
    normalizedType === "zoom_in"
      ? phase === "enter"
        ? "scale-75 opacity-0"
        : phase === "exit"
          ? "scale-135 opacity-0"
          : "scale-100 opacity-100"
      : normalizedType === "zoom_out"
        ? phase === "enter"
          ? "scale-125 opacity-0"
          : phase === "exit"
            ? "scale-85 opacity-0"
            : "scale-100 opacity-100"
        : normalizedType === "zoom"
          ? phase === "enter"
            ? "scale-90 opacity-0"
            : phase === "exit"
              ? "scale-125 opacity-0"
              : "scale-100 opacity-100"
          : normalizedType === "dip_to_black"
            ? "scale-100 opacity-10"
            : phase === "enter"
              ? "scale-95 opacity-0"
              : phase === "exit"
                ? "scale-110 opacity-0"
                : "scale-100 opacity-100"

  const brandToneClass =
    normalizedType === "dip_to_black" ? "text-white/50" : "text-sky-200/70"

  const dividerClass =
    normalizedType === "dip_to_black"
      ? "bg-gradient-to-r from-transparent via-white/30 to-transparent"
      : "bg-gradient-to-r from-transparent via-sky-300/70 to-transparent"

  const bodyToneClass =
    normalizedType === "dip_to_black" ? "text-white/60" : "text-white/70"

  const backgroundClass =
    normalizedType === "dip_to_black"
      ? "bg-black"
      : normalizedType === "zoom_in"
        ? "bg-[radial-gradient(circle_at_center,rgba(125,211,252,0.34),rgba(2,6,23,0.95)_28%,rgba(0,0,0,1)_100%)]"
        : normalizedType === "zoom_out"
          ? "bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.14),rgba(2,6,23,0.98)_40%,rgba(0,0,0,1)_100%)]"
          : isZoom
            ? "bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.24),rgba(2,6,23,0.97)_36%,rgba(0,0,0,1)_100%)]"
            : "bg-[radial-gradient(circle_at_center,rgba(37,99,235,0.20),rgba(2,6,23,0.96)_42%,rgba(0,0,0,1)_100%)]"

  return (
    <div
      className={`pointer-events-none fixed inset-0 z-[999] overflow-hidden transition-opacity duration-500 ${overlayOpacityClass}`}
    >
      {isWipe ? (
        <>
          <div
            className="absolute inset-0 transition-[clip-path] duration-700 ease-out"
            style={{
              clipPath: wipeClipPath,
              background:
                normalizedType === "wipe_right"
                  ? "linear-gradient(270deg, rgba(2,6,23,0.98) 0%, rgba(3,7,18,0.98) 40%, rgba(15,23,42,0.96) 65%, rgba(37,99,235,0.18) 100%)"
                  : "linear-gradient(90deg, rgba(2,6,23,0.98) 0%, rgba(3,7,18,0.98) 40%, rgba(15,23,42,0.96) 65%, rgba(37,99,235,0.18) 100%)",
            }}
          />
          <div
            className="absolute inset-0 transition-[clip-path] duration-700 ease-out"
            style={{
              clipPath: wipeSheenClipPath,
              background:
                normalizedType === "wipe_right"
                  ? "linear-gradient(270deg, transparent 0%, rgba(255,255,255,0.03) 48%, rgba(125,211,252,0.18) 52%, transparent 58%)"
                  : "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.03) 48%, rgba(125,211,252,0.18) 52%, transparent 58%)",
            }}
          />
        </>
      ) : (
        <div className={`absolute inset-0 transition-all duration-700 ${backgroundClass}`} />
      )}

      {normalizedType !== "dip_to_black" ? (
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),transparent_24%,transparent_76%,rgba(255,255,255,0.02))]" />
      ) : null}

      <div className="absolute inset-0">
        <div
          className={`absolute left-1/2 top-1/2 h-[46rem] w-[46rem] -translate-x-1/2 -translate-y-1/2 rounded-full border transition-all duration-700 ${ringScaleClass} ${
            normalizedType === "dip_to_black" ? "border-white/5" : "border-white/10"
          }`}
        />
        <div
          className={`absolute left-1/2 top-1/2 h-[32rem] w-[32rem] -translate-x-1/2 -translate-y-1/2 rounded-full border transition-all duration-700 delay-75 ${ringScaleClass} ${
            normalizedType === "dip_to_black" ? "border-white/5" : "border-sky-300/20"
          }`}
        />
        <div
          className={`absolute left-1/2 top-1/2 h-[18rem] w-[18rem] -translate-x-1/2 -translate-y-1/2 rounded-full border transition-all duration-700 delay-100 ${ringScaleClass} ${
            normalizedType === "dip_to_black" ? "border-white/5" : "border-white/10"
          }`}
        />
      </div>

      {isZoom ? (
        <div
          className={`absolute inset-0 transition-transform duration-700 ${
            normalizedType === "zoom_in"
              ? phase === "hold"
                ? "scale-110"
                : phase === "exit"
                  ? "scale-120"
                  : "scale-85"
              : normalizedType === "zoom_out"
                ? phase === "hold"
                  ? "scale-98"
                  : phase === "exit"
                    ? "scale-92"
                    : "scale-115"
                : phase === "hold"
                  ? "scale-105"
                  : phase === "exit"
                    ? "scale-110"
                    : "scale-95"
          }`}
        >
          <div
            className={`absolute inset-0 ${
              normalizedType === "zoom_in"
                ? "bg-[radial-gradient(circle_at_center,rgba(125,211,252,0.14),transparent_52%)]"
                : normalizedType === "zoom_out"
                  ? "bg-[radial-gradient(circle_at_center,rgba(125,211,252,0.05),transparent_58%)]"
                  : "bg-[radial-gradient(circle_at_center,rgba(125,211,252,0.08),transparent_55%)]"
            }`}
          />
        </div>
      ) : null}

      <div className="absolute inset-0 flex items-center justify-center px-6">
        <div
          className={`w-full max-w-3xl text-center transition-all duration-700 ease-out ${contentAnimationClass}`}
        >
          <div className={`mb-4 text-[11px] uppercase tracking-[0.38em] ${brandToneClass}`}>
            Jupiter.events
          </div>

          <h2 className="text-4xl font-semibold tracking-tight text-white md:text-6xl">
            {content.title}
          </h2>

          <p className={`mx-auto mt-5 max-w-2xl text-base leading-7 md:text-lg ${bodyToneClass}`}>
            {content.body}
          </p>

          <div className={`mx-auto mt-8 h-px w-32 ${dividerClass}`} />
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