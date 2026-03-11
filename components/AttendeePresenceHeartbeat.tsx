"use client"

import * as React from "react"

export default function AttendeePresenceHeartbeat() {
  React.useEffect(() => {
    let stopped = false

    async function ping() {
      try {
        await fetch("/api/presence/heartbeat", { method: "POST", cache: "no-store" })
      } catch {
        // ignore
      }
    }

    ping()
    const t = setInterval(() => {
      if (!stopped) ping()
    }, 20_000)

    return () => {
      stopped = true
      clearInterval(t)
    }
  }, [])

  return null
}
