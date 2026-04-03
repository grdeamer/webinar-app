"use client"

import { useEffect, useState } from "react"
import { LiveKitRoom, VideoConference } from "@livekit/components-react"

type JoinResponse = {
  token?: string
  roomName?: string
  participantName?: string
  participantIdentity?: string
  provider?: string
  error?: string
}

export default function BackstageJoinClient({
  slug,
}: {
  slug: string
}) {
  const [token, setToken] = useState<string | null>(null)
  const [serverUrl, setServerUrl] = useState<string | null>(null)
  const [debug, setDebug] = useState<string>("Starting…")

  useEffect(() => {
    async function load() {
      try {
        setDebug("Requesting join token…")

        const res = await fetch(`/api/events/${slug}/live/join`, {
          method: "POST",
        })

        const data = (await res.json().catch((): null => null)) as JoinResponse | null

        if (!res.ok) {
          setDebug(`Join API failed: ${data?.error || `HTTP ${res.status}`}`)
          return
        }

        if (!data?.token) {
          setDebug("Join API returned no token")
          return
        }

        const publicUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || ""

        if (!publicUrl) {
          setDebug("Missing NEXT_PUBLIC_LIVEKIT_URL in browser")
          return
        }

        setToken(data.token)
        setServerUrl(publicUrl)
        setDebug(`Ready to connect to ${data.roomName || "room"}`)
      } catch (err: any) {
        setDebug(err?.message || "Unknown client error")
      }
    }

    load()
  }, [slug])

  if (!token || !serverUrl) {
    return (
      <div className="flex min-h-[60vh] w-full max-w-5xl items-center justify-center rounded-2xl border border-white/10 bg-white/5 p-8 text-white">
        <div className="text-center">
          <div className="text-lg font-semibold">Connecting...</div>
          <div className="mt-3 text-sm text-white/70">{debug}</div>
        </div>
      </div>
    )
  }

  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect
      video
      audio
      style={{ height: "80vh", width: "100%" }}
      onConnected={() => {
        console.log("CONNECTED")
        setDebug("Connected")
      }}
      onDisconnected={(reason) => {
        console.log("DISCONNECTED", reason)
        setDebug(`Disconnected: ${String(reason || "unknown reason")}`)
      }}
      onError={(err) => {
        console.error("LIVEKIT ERROR", err)
        setDebug(`LiveKit error: ${err.message}`)
      }}
    >
      <VideoConference />
    </LiveKitRoom>
  )
}