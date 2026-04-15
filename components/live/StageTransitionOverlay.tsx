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
  | "main_stage_arrival"

type OverlayTheme = {
  brandToneClass: string
  dividerClass: string
  bodyToneClass: string
  backgroundClass: string
  ringOuterClass: string
  ringMiddleClass: string
  ringInnerClass: string
}

export default function StageTransitionOverlay({
  active,
  variant = "general_session",
  transitionType = "fade",
  headline,
  message,
  holdMs = 1600,
  isPreview = false,
}: {
  active: boolean
  variant?: TransitionVariant
  transitionType?: string
  headline?: string | null
  message?: string | null
  holdMs?: number
  isPreview?: boolean
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
    transitionType === "dip_to_black" ||
    transitionType === "main_stage_arrival"
      ? transitionType
      : "fade"

  const isMainStageArrival = normalizedType === "main_stage_arrival"

  const effectiveType: Exclude<TransitionType, "main_stage_arrival"> =
    normalizedType === "main_stage_arrival" ? "zoom_in" : normalizedType

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

  const theme = useMemo<OverlayTheme>(() => {
    if (effectiveType === "dip_to_black") {
      return {
        brandToneClass: "text-white/50",
        dividerClass: "bg-gradient-to-r from-transparent via-white/30 to-transparent",
        bodyToneClass: "text-white/60",
        backgroundClass: "bg-black",
        ringOuterClass: "border-white/5",
        ringMiddleClass: "border-white/5",
        ringInnerClass: "border-white/5",
      }
    }

    if (isMainStageArrival) {
      return {
        brandToneClass: "text-indigo-200/80",
        dividerClass: "bg-gradient-to-r from-transparent via-indigo-300/70 to-transparent",
        bodyToneClass: "text-white/80",
        backgroundClass:
          "bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.35),rgba(2,6,23,0.95)_28%,rgba(0,0,0,1)_100%)]",
        ringOuterClass: "border-indigo-300/20",
        ringMiddleClass: "border-indigo-400/30",
        ringInnerClass: "border-white/10",
      }
    }

    if (variant === "general_session") {
      return {
        brandToneClass: "text-sky-200/75",
        dividerClass: "bg-gradient-to-r from-transparent via-sky-300/70 to-transparent",
        bodyToneClass: "text-white/75",
        backgroundClass:
          effectiveType === "zoom_in"
            ? "bg-[radial-gradient(circle_at_center,rgba(125,211,252,0.34),rgba(2,6,23,0.95)_28%,rgba(0,0,0,1)_100%)]"
            : effectiveType === "zoom_out"
              ? "bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.14),rgba(2,6,23,0.98)_40%,rgba(0,0,0,1)_100%)]"
              : effectiveType === "zoom"
                ? "bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.24),rgba(2,6,23,0.97)_36%,rgba(0,0,0,1)_100%)]"
                : "bg-[radial-gradient(circle_at_center,rgba(37,99,235,0.20),rgba(2,6,23,0.96)_42%,rgba(0,0,0,1)_100%)]",
        ringOuterClass: "border-white/10",
        ringMiddleClass: "border-sky-300/20",
        ringInnerClass: "border-white/10",
      }
    }

    if (variant === "breakout") {
      return {
        brandToneClass: "text-fuchsia-200/70",
        dividerClass: "bg-gradient-to-r from-transparent via-fuchsia-300/60 to-transparent",
        bodyToneClass: "text-white/72",
        backgroundClass:
          "bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.18),rgba(2,6,23,0.96)_40%,rgba(0,0,0,1)_100%)]",
        ringOuterClass: "border-white/10",
        ringMiddleClass: "border-fuchsia-300/20",
        ringInnerClass: "border-white/10",
      }
    }

    if (variant === "off_air") {
      return {
        brandToneClass: "text-amber-100/60",
        dividerClass: "bg-gradient-to-r from-transparent via-amber-100/40 to-transparent",
        bodyToneClass: "text-white/68",
        backgroundClass:
          "bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.06),rgba(2,6,23,0.97)_36%,rgba(0,0,0,1)_100%)]",
        ringOuterClass: "border-white/8",
        ringMiddleClass: "border-white/10",
        ringInnerClass: "border-white/8",
      }
    }

    return {
      brandToneClass: "text-sky-200/70",
      dividerClass: "bg-gradient-to-r from-transparent via-sky-300/70 to-transparent",
      bodyToneClass: "text-white/70",
      backgroundClass:
        "bg-[radial-gradient(circle_at_center,rgba(37,99,235,0.20),rgba(2,6,23,0.96)_42%,rgba(0,0,0,1)_100%)]",
      ringOuterClass: "border-white/10",
      ringMiddleClass: "border-sky-300/20",
      ringInnerClass: "border-white/10",
    }
  }, [effectiveType, isMainStageArrival, variant])

  if (!visible) return null

  const isWipe =
    effectiveType === "wipe" ||
    effectiveType === "wipe_left" ||
    effectiveType === "wipe_right"

  const isZoom =
    effectiveType === "zoom" ||
    effectiveType === "zoom_in" ||
    effectiveType === "zoom_out"

  const overlayOpacityClass =
    phase === "enter" ? "opacity-0" : phase === "exit" ? "opacity-0" : "opacity-100"

  const contentAnimationClass = isMainStageArrival
    ? phase === "enter"
      ? "scale-80 opacity-0"
      : phase === "exit"
        ? "scale-110 opacity-0"
        : "scale-100 opacity-100"
    : isWipe
      ? effectiveType === "wipe_right"
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
      : effectiveType === "zoom_in"
        ? phase === "enter"
          ? "scale-75 opacity-0"
          : phase === "exit"
            ? "scale-110 opacity-0"
            : "scale-100 opacity-100"
        : effectiveType === "zoom_out"
          ? phase === "enter"
            ? "scale-115 opacity-0"
            : phase === "exit"
              ? "scale-92 opacity-0"
              : "scale-100 opacity-100"
          : effectiveType === "zoom"
            ? phase === "enter"
              ? "scale-90 opacity-0"
              : phase === "exit"
                ? "scale-105 opacity-0"
                : "scale-100 opacity-100"
            : effectiveType === "dip_to_black"
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
    effectiveType === "wipe_right"
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

  const ringScaleClass = isMainStageArrival
    ? phase === "enter"
      ? "scale-60 opacity-0"
      : phase === "exit"
        ? "scale-150 opacity-0"
        : "scale-110 opacity-100"
    : effectiveType === "zoom_in"
      ? phase === "enter"
        ? "scale-75 opacity-0"
        : phase === "exit"
          ? "scale-135 opacity-0"
          : "scale-100 opacity-100"
      : effectiveType === "zoom_out"
        ? phase === "enter"
          ? "scale-125 opacity-0"
          : phase === "exit"
            ? "scale-85 opacity-0"
            : "scale-100 opacity-100"
        : effectiveType === "zoom"
          ? phase === "enter"
            ? "scale-90 opacity-0"
            : phase === "exit"
              ? "scale-125 opacity-0"
              : "scale-100 opacity-100"
          : effectiveType === "dip_to_black"
            ? "scale-100 opacity-10"
            : phase === "enter"
              ? "scale-95 opacity-0"
              : phase === "exit"
                ? "scale-110 opacity-0"
                : "scale-100 opacity-100"

  return (
    <div
      className={`pointer-events-none fixed inset-0 z-[999] overflow-hidden transition-opacity duration-500 ${overlayOpacityClass} ${
        isPreview ? "backdrop-saturate-75" : ""
      }`}
    >
      {isWipe ? (
        <>
          <div
            className="absolute inset-0 transition-[clip-path] duration-700 ease-out"
            style={{
              clipPath: wipeClipPath,
              background:
                effectiveType === "wipe_right"
                  ? "linear-gradient(270deg, rgba(2,6,23,0.98) 0%, rgba(3,7,18,0.98) 40%, rgba(15,23,42,0.96) 65%, rgba(37,99,235,0.18) 100%)"
                  : "linear-gradient(90deg, rgba(2,6,23,0.98) 0%, rgba(3,7,18,0.98) 40%, rgba(15,23,42,0.96) 65%, rgba(37,99,235,0.18) 100%)",
            }}
          />
          <div
            className="absolute inset-0 transition-[clip-path] duration-700 ease-out"
            style={{
              clipPath: wipeClipPath,
              background:
                effectiveType === "wipe_right"
                  ? "linear-gradient(270deg, transparent 0%, rgba(255,255,255,0.03) 48%, rgba(125,211,252,0.18) 52%, transparent 58%)"
                  : "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.03) 48%, rgba(125,211,252,0.18) 52%, transparent 58%)",
            }}
          />
        </>
      ) : (
        <div className={`absolute inset-0 transition-all duration-700 ${theme.backgroundClass}`} />
      )}

      {effectiveType !== "dip_to_black" ? (
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),transparent_24%,transparent_76%,rgba(255,255,255,0.02))]" />
      ) : null}

      <div className="absolute inset-0">
        <div
          className={`absolute left-1/2 top-1/2 h-[46rem] w-[46rem] -translate-x-1/2 -translate-y-1/2 rounded-full border transition-all duration-700 ${ringScaleClass} ${theme.ringOuterClass}`}
        />
        <div
          className={`absolute left-1/2 top-1/2 h-[32rem] w-[32rem] -translate-x-1/2 -translate-y-1/2 rounded-full border transition-all duration-700 delay-75 ${ringScaleClass} ${theme.ringMiddleClass}`}
        />
        <div
          className={`absolute left-1/2 top-1/2 h-[18rem] w-[18rem] -translate-x-1/2 -translate-y-1/2 rounded-full border transition-all duration-700 delay-100 ${ringScaleClass} ${theme.ringInnerClass}`}
        />
      </div>

      {isZoom ? (
        <div
          className={`absolute inset-0 transition-transform ${
            isMainStageArrival ? "duration-1000" : "duration-700"
          } ${
            isMainStageArrival
              ? phase === "hold"
                ? "scale-115"
                : phase === "exit"
                  ? "scale-125"
                  : "scale-80"
              : effectiveType === "zoom_in"
                ? phase === "hold"
                  ? "scale-110"
                  : phase === "exit"
                    ? "scale-120"
                    : "scale-85"
                : effectiveType === "zoom_out"
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
              isMainStageArrival
                ? "bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.18),transparent_52%)]"
                : effectiveType === "zoom_in"
                  ? "bg-[radial-gradient(circle_at_center,rgba(125,211,252,0.14),transparent_52%)]"
                  : effectiveType === "zoom_out"
                    ? "bg-[radial-gradient(circle_at_center,rgba(125,211,252,0.05),transparent_58%)]"
                    : "bg-[radial-gradient(circle_at_center,rgba(125,211,252,0.08),transparent_55%)]"
            }`}
          />
        </div>
      ) : null}

      <div className="absolute inset-0 flex items-center justify-center px-6">
        <div
          className={`w-full max-w-3xl text-center transition-all duration-700 ease-out ${
            isPreview ? "scale-[0.94]" : ""
          } ${contentAnimationClass}`}
        >
          <div className="mb-4 flex flex-col items-center gap-2">
            {isPreview ? (
              <div className="rounded-full border border-yellow-300/40 bg-yellow-300/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.32em] text-yellow-200">
                Preview
              </div>
            ) : null}

            <div
              className={`text-[11px] uppercase tracking-[0.38em] ${theme.brandToneClass}`}
            >
              Jupiter.events
            </div>
          </div>

          <h2 className="text-4xl font-semibold tracking-tight text-white md:text-6xl">
            {content.title}
          </h2>

          <p
            className={`mx-auto mt-5 max-w-2xl text-base leading-7 md:text-lg ${theme.bodyToneClass}`}
          >
            {content.body}
          </p>

          <div className={`mx-auto mt-8 h-px w-32 ${theme.dividerClass}`} />
        </div>
      </div>
    </div>
  )
}

function defaultHeadline(variant: TransitionVariant) {
  switch (variant) {
    case "general_session":
      return "Now Entering Main Stage"
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