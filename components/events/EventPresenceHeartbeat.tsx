"use client"

import { useEffect } from "react"

export default function EventPresenceHeartbeat({
  eventId,
  userId,
}: {
  eventId: string
  userId: string
}): null {
  useEffect(() => {
    let cancelled = false

    async function pingPresence() {
      try {
        await fetch("/api/presence", {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            event_id: eventId,
            user_id: userId,
          }),
        })
      } catch {
        // ignore heartbeat errors on client
      }
    }

    void pingPresence()

    const intervalId = window.setInterval(() => {
      if (!cancelled) {
        void pingPresence()
      }
    }, 10000)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [eventId, userId])

  return null
}