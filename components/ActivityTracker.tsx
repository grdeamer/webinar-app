"use client"

import React from "react"
import { usePathname } from "next/navigation"

function getSessionId(): string | null {
  const key = "attendee_session_id"

  if (typeof window === "undefined") return null

  let v = localStorage.getItem(key)

  if (!v) {
    v = crypto.randomUUID()
    localStorage.setItem(key, v)
  }

  return v
}

export default function ActivityTracker({
  roomKey = "general",
}: {
  roomKey?: string
}): React.JSX.Element | null {
  const pathname = usePathname()
  const [sessionId, setSessionId] = React.useState<string | null>(null)

  React.useEffect(() => {
    const id = getSessionId()
    setSessionId(id)
  }, [])

  React.useEffect(() => {
    if (!sessionId) return

    let stop = false

    async function ping(): Promise<void> {
      try {
        await fetch("/api/activity/heartbeat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            room_key: roomKey,
            session_id: sessionId,
            current_path: pathname,
          }),
        })
      } catch {
        // ignore
      }
    }

    ping()

    const id = setInterval(() => {
      if (!stop) void ping()
    }, 15000)

    return () => {
      stop = true
      clearInterval(id)
    }
  }, [pathname, roomKey, sessionId])

  return null
}