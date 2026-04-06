"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import StageTransitionOverlay from "@/components/live/StageTransitionOverlay"

type LiveStateResponse = {
  state?: {
    mode?: string | null
    destination_type?: string | null
    destination_session_id?: string | null
    force_redirect?: boolean | null
    headline?: string | null
    message?: string | null
    transition_type?: string | null
    transition_duration_ms?: number | null
    transition_active?: boolean | null
    transition_started_at?: string | null
  } | null
}

type TransitionVariant = "general_session" | "session" | "breakout" | "off_air"

const TRANSITION_LOCK_KEY = "jupiter.transition.lock"

const DEFAULT_REDIRECT_DELAY_MS = 3000
const OVERLAY_HOLD_BUFFER_MS = 600

function setTransitionLock(kind: string, ms: number) {
  try {
    window.sessionStorage.setItem(
      TRANSITION_LOCK_KEY,
      JSON.stringify({
        kind,
        until: Date.now() + ms,
      })
    )
  } catch {}
}

function hasActiveTransitionLock(kind: string) {
  try {
    const raw = window.sessionStorage.getItem(TRANSITION_LOCK_KEY)
    if (!raw) return false

    const parsed = JSON.parse(raw) as { kind?: string; until?: number }
    if (!parsed?.kind || !parsed?.until) return false

    if (Date.now() > parsed.until) {
      window.sessionStorage.removeItem(TRANSITION_LOCK_KEY)
      return false
    }

    return parsed.kind === kind
  } catch {
    return false
  }
}

function clampTransitionDuration(
  value: number | null | undefined,
  fallback = DEFAULT_REDIRECT_DELAY_MS
) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback
  return Math.max(800, Math.min(6000, Math.round(value)))
}

function isTransitionStillActive(
  startedAt: string | null | undefined,
  holdMs: number
) {
  if (!startedAt) return true

  const startedMs = new Date(startedAt).getTime()
  if (Number.isNaN(startedMs)) return true

  return Date.now() <= startedMs + holdMs
}

export default function EventLiveRedirectWatcher({ slug }: { slug: string }) {
  const router = useRouter()
  const pathname = usePathname()

  const [transitionActive, setTransitionActive] = useState(false)
  const [transitionVariant, setTransitionVariant] =
    useState<TransitionVariant>("general_session")
  const [transitionType, setTransitionType] = useState<string>("fade")
  const [transitionHeadline, setTransitionHeadline] = useState<string | null>(null)
  const [transitionMessage, setTransitionMessage] = useState<string | null>(null)
  const [transitionHoldMs, setTransitionHoldMs] = useState(DEFAULT_REDIRECT_DELAY_MS)

  const redirectingRef = useRef(false)
  const timeoutRef = useRef<number | null>(null)

  useEffect(() => {
    let stopped = false

    async function checkState() {
      try {
        const res = await fetch(`/api/events/${slug}/live/state`, {
          cache: "no-store",
        })

        const data = (await res.json().catch((): null => null)) as LiveStateResponse | null
        if (!res.ok || stopped) return

        const state = data?.state ?? null
        if (!state || redirectingRef.current) return

        const durationMs = clampTransitionDuration(state.transition_duration_ms)
        const holdMs = durationMs + OVERLAY_HOLD_BUFFER_MS

        if (state.transition_active === false) return
        if (!isTransitionStillActive(state.transition_started_at, holdMs)) return

        if (state.mode === "off_air" && pathname !== `/events/${slug}`) {
          if (hasActiveTransitionLock("off_air")) return

          redirectingRef.current = true
          setTransitionLock("off_air", holdMs)

          setTransitionVariant("off_air")
          setTransitionType(state.transition_type ?? "dip_to_black")
          setTransitionHeadline(state.headline ?? "We’ll Be Right Back")
          setTransitionMessage(state.message ?? "Returning to the event home page.")
          setTransitionHoldMs(holdMs)
          setTransitionActive(true)

          timeoutRef.current = window.setTimeout(() => {
            router.push(`/events/${slug}`)
          }, durationMs)

          return
        }

        if (!state.force_redirect) return

        if (
          state.destination_type === "session" &&
          state.destination_session_id &&
          pathname !== `/events/${slug}/sessions/${state.destination_session_id}`
        ) {
          redirectingRef.current = true

          const variant: TransitionVariant =
            state.mode === "breakout"
              ? "breakout"
              : state.mode === "general_session"
                ? "general_session"
                : "session"

          setTransitionVariant(variant)
          setTransitionType(
            state.transition_type ??
              (variant === "breakout"
                ? "wipe_right"
                : variant === "general_session"
                  ? "zoom"
                  : "wipe_left")
          )
          setTransitionHeadline(
            state.headline ??
              (variant === "breakout"
                ? "Entering Breakout"
                : variant === "general_session"
                  ? "Now Entering General Session"
                  : "Entering Session")
          )
          setTransitionMessage(
            state.message ??
              (variant === "breakout"
                ? "We’re moving you into a breakout room."
                : variant === "general_session"
                  ? "The keynote is beginning now."
                  : "Your next session is opening.")
          )
          setTransitionHoldMs(holdMs)
          setTransitionActive(true)

          timeoutRef.current = window.setTimeout(() => {
            router.push(`/events/${slug}/sessions/${state.destination_session_id}`)
          }, durationMs)

          return
        }

        if (
          state.mode === "general_session" &&
          !state.destination_session_id &&
          pathname !== "/general-session"
        ) {
          redirectingRef.current = true

          setTransitionVariant("general_session")
          setTransitionType(state.transition_type ?? "zoom")
          setTransitionHeadline(state.headline ?? "Now Entering General Session")
          setTransitionMessage(state.message ?? "The keynote is beginning now.")
          setTransitionHoldMs(holdMs)
          setTransitionActive(true)

          timeoutRef.current = window.setTimeout(() => {
            router.push("/general-session")
          }, durationMs)
        }
      } catch {
        // ignore
      }
    }

    void checkState()

    const id = window.setInterval(() => {
      void checkState()
    }, 3000)

    return () => {
      stopped = true
      window.clearInterval(id)
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current)
    }
  }, [slug, pathname, router])

  return (
    <StageTransitionOverlay
      active={transitionActive}
      variant={transitionVariant}
      transitionType={transitionType}
      headline={transitionHeadline}
      message={transitionMessage}
      holdMs={transitionHoldMs}
    />
  )
}