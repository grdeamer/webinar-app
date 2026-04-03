"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import StageTransitionOverlay from "@/components/live/StageTransitionOverlay"

type LiveStateResponse = {
  state?: {
    mode?: string | null
    destination_type?: string | null
    destination_session_id?: string | null
    force_redirect?: boolean | null
    headline?: string | null
    message?: string | null
  } | null
}

type TransitionVariant = "general_session" | "session" | "breakout" | "off_air"

export default function GeneralSessionStateWatcher({
  eventSlug,
}: {
  eventSlug: string
}) {
  const router = useRouter()

  const [transitionActive, setTransitionActive] = useState(false)
  const [transitionVariant, setTransitionVariant] =
    useState<TransitionVariant>("off_air")
  const [transitionHeadline, setTransitionHeadline] = useState<string | null>(null)
  const [transitionMessage, setTransitionMessage] = useState<string | null>(null)

  const redirectingRef = useRef(false)
  const timeoutRef = useRef<number | null>(null)

  useEffect(() => {
    let stopped = false

    async function checkState() {
      try {
        const res = await fetch(`/api/events/${eventSlug}/live/state`, {
          cache: "no-store",
        })

        const data = (await res.json().catch((): null => null)) as LiveStateResponse | null
        if (!res.ok || stopped) return

        const state = data?.state ?? null
        if (redirectingRef.current) return

        if (state?.mode === "off_air") {
          redirectingRef.current = true
          setTransitionVariant("off_air")
          setTransitionHeadline(state.headline ?? "We’ll Be Right Back")
          setTransitionMessage(state.message ?? "Returning to the event home page.")
          setTransitionActive(true)

          timeoutRef.current = window.setTimeout(() => {
            router.push(`/events/${eventSlug}`)
          }, 3000)

          return
        }

        if (
          state?.destination_type === "session" &&
          state?.destination_session_id &&
          state?.force_redirect
        ) {
          redirectingRef.current = true
          setTransitionVariant("session")
          setTransitionHeadline(state.headline ?? "Entering Session")
          setTransitionMessage(state.message ?? "Your next session is opening.")
          setTransitionActive(true)

          timeoutRef.current = window.setTimeout(() => {
            router.push(`/events/${eventSlug}/sessions/${state.destination_session_id}`)
          }, 1600)

          return
        }
      } catch {
        // ignore polling errors for now
      }
    }

    void checkState()

    const id = window.setInterval(() => {
      void checkState()
    }, 3000)

    return () => {
      stopped = true
      window.clearInterval(id)
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current)
      }
    }
  }, [eventSlug, router])

  return (
    <StageTransitionOverlay
      active={transitionActive}
      variant={transitionVariant}
      headline={transitionHeadline}
      message={transitionMessage}
      holdMs={1600}
    />
  )
}