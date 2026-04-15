"use client"

import * as React from "react"

type Props = {
  eventId: string
  userId: string
}

export default function AttendeePresenceHeartbeat({
  eventId,
  userId,
}: Props): React.JSX.Element | null {
  React.useEffect(() => {
    let stopped = false

    async function beat(): Promise<void> {
      try {
        await fetch("/api/presence/heartbeat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            event_id: eventId,
            user_id: userId,
          }),
        })
      } catch {
        // ignore errors (network, etc.)
      }
    }

    // fire immediately
    void beat()

    // then every 30s
    const id = window.setInterval(() => {
      if (!stopped) void beat()
    }, 30000)

    return () => {
      stopped = true
      window.clearInterval(id)
    }
  }, [eventId, userId])

  return null
}