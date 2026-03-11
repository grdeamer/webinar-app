"use client"

import React from "react"
import { usePathname } from "next/navigation"

function getSessionId() {
  const key = "attendee_session_id"

  if (typeof window === "undefined") return null

  let v = localStorage.getItem(key)

  if (!v) {
    v = crypto.randomUUID()
    localStorage.setItem(key, v)
  }

  return v
}

export default function ActivityTracker({ roomKey = "general" }: { roomKey?: string }) {
  const pathname = usePathname()
  const [sessionId, setSessionId] = React.useState<string | null>(null)

  // Create session ID safely in browser
  React.useEffect(() => {
    const id = getSessionId()
    setSessionId(id)
  }, [])

  React.useEffect(() => {
    if (!sessionId) return

    let stop = false

    async function ping() {
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

    // ping immediately on route change
    ping()

    // keep alive every 15s
    const id = setInterval(() => {
      if (!stop) ping()
    }, 15000)

    return () => {
      stop = true
      clearInterval(id)
    }
  }, [pathname, roomKey, sessionId])

  return null
}