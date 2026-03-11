"use client"

import * as React from "react"

export default function AttendeePresenceHeartbeat(): React.JSX.Element | null {
  React.useEffect(() => {
    let stopped = false

    async function beat(): Promise<void> {
      try {
        await fetch("/api/attendee/presence", {
          method: "POST",
          credentials: "include",
        })
      } catch {
        // ignore
      }
    }

    void beat()

    const id = window.setInterval(() => {
      if (!stopped) void beat()
    }, 30000)

    return () => {
      stopped = true
      window.clearInterval(id)
    }
  }, [])

  return null
}