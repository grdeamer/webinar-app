"use client"

import { useEffect, useRef, useState } from "react"

const endpoint = "/api/admin/zoom-bridge/desktop-return"
export type ReceiverStatus = {
  configured?: boolean
  reusable?: boolean
  state?: string
  audio?: boolean
  sessionId?: string
  meetingId?: string
  error?: string
}

export function activeReceiver(status: ReceiverStatus | null) {
  return Boolean(status?.sessionId && status.meetingId && ["starting", "desktop_ready"].includes(status.state ?? ""))
}

async function readStatus(signal?: AbortSignal): Promise<ReceiverStatus> {
  const response = await fetch(endpoint, { cache: "no-store", signal })
  if (!response.ok) throw new Error("Room receiver is unavailable. Check the shared server and receiver.")
  return response.json()
}

export function useRoomReceiver() {
  const [status, setStatus] = useState<ReceiverStatus | null>(null)
  const [picture, setPicture] = useState<{ sessionId: string; url: string } | null>(null)
  const [error, setError] = useState("")
  const revision = useRef(0)
  const changing = useRef(false)

  useEffect(() => {
    const abort = new AbortController()
    let timer: ReturnType<typeof setTimeout>
    async function poll() {
      const version = revision.current
      if (!changing.current) {
        try {
          const current = await readStatus(abort.signal)
          if (!abort.signal.aborted && version === revision.current) {
            setStatus(current)
            setError("")
          }
        } catch {
          if (!abort.signal.aborted && version === revision.current) {
            setStatus(null)
            setError("Room receiver unavailable")
          }
        }
      }
      if (!abort.signal.aborted) timer = setTimeout(poll, 3000)
    }
    void poll()
    return () => { abort.abort(); clearTimeout(timer) }
  }, [])

  const sessionId = activeReceiver(status) ? status?.sessionId : undefined
  useEffect(() => {
    if (!sessionId) return
    const id = sessionId
    const abort = new AbortController()
    let timer: ReturnType<typeof setTimeout>
    let url: string | undefined
    async function frame() {
      try {
        const response = await fetch(`${endpoint}?sessionId=${encodeURIComponent(id)}`, { cache: "no-store", signal: abort.signal })
        if (!response.ok || !response.headers.get("content-type")?.startsWith("image/jpeg")) throw new Error("No picture")
        const blob = await response.blob()
        if (abort.signal.aborted) return
        if (url) URL.revokeObjectURL(url)
        url = URL.createObjectURL(blob)
        setPicture({ sessionId: id, url })
      } catch {
        if (abort.signal.aborted) return
        if (url) URL.revokeObjectURL(url)
        url = undefined
        setPicture(null)
      }
      timer = setTimeout(frame, 1000)
    }
    void frame()
    return () => { abort.abort(); clearTimeout(timer); if (url) URL.revokeObjectURL(url) }
  }, [sessionId])

  async function command(action: "connect" | "reconnect" | "disconnect", meetingNumber: string, nextMeetingNumber = meetingNumber) {
    if (changing.current) throw new Error("Wait for the current room operation to finish.")
    changing.current = true
    revision.current += 1
    try {
      const current = await readStatus()
      setStatus(current)
      if (!current.configured) throw new Error("The room receiver is not configured.")
      if (activeReceiver(current) && current.meetingId !== meetingNumber) {
        throw new Error("The pilot receiver is busy with another room. Disconnect that room first.")
      }
      const connected = activeReceiver(current)
      if (action === "connect" && connected) return
      if (action === "disconnect" && !connected) return
      if (action === "reconnect" && connected && !current.reusable) {
        throw new Error("This receiver needs the room-controls update before it can reconnect an active room.")
      }
      const id = crypto.randomUUID()
      const joinUrl = `https://zoom.us/j/${nextMeetingNumber}`
      const body = action === "disconnect"
        ? { action: current.reusable ? "disconnect" : "stop", sessionId: current.sessionId }
        : connected
          ? { action: "replace", sessionId: current.sessionId, nextSessionId: id, joinUrl }
          : { action: "start", sessionId: id, joinUrl }
      const response = await fetch(endpoint, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      })
      const result: ReceiverStatus = await response.json()
      if (!response.ok || result.error) throw new Error(result.error || "Room operation was not confirmed. Check the receiver and retry.")
      setStatus({ configured: true, ...result })
    } finally {
      changing.current = false
      revision.current += 1
    }
  }

  return { status, picture: picture?.sessionId === sessionId ? picture?.url : undefined, error, command }
}
