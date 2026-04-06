"use client"

import { useEffect, useState } from "react"
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useLocalParticipant,
} from "@livekit/components-react"

type PresenterTokenResponse = {
  token: string
  wsUrl: string
  roomName?: string
}

function PresenterInner() {
  const { localParticipant } = useLocalParticipant()

  return (
    <div className="mx-auto max-w-4xl p-8 text-white">
      <div className="text-xs uppercase tracking-[0.18em] text-white/40">
        Presenter Test
      </div>

      <h1 className="mt-2 text-3xl font-semibold">Presenter joined</h1>

      <p className="mt-3 text-sm text-white/60">
        This page is publishing your camera and microphone into the LiveKit room.
      </p>

      <div className="mt-5 flex gap-3">
        <div className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm">
          Camera: {localParticipant.isCameraEnabled ? "On" : "Off"}
        </div>
        <div className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm">
          Mic: {localParticipant.isMicrophoneEnabled ? "On" : "Off"}
        </div>
      </div>

      <div className="mt-4 text-sm text-white/45">
        Keep this page open. Your attendee session page should now show your video.
      </div>
    </div>
  )
}

export default function PresenterClient({
  slug,
  id,
}: {
  slug: string
  id: string
}) {
  const [token, setToken] = useState<string | null>(null)
  const [serverUrl, setServerUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadPresenterToken() {
      try {
        setError(null)

        const res = await fetch(
          `/api/events/${slug}/sessions/${id}/live/presenter-token`,
          {
            method: "POST",
            cache: "no-store",
          }
        )

        const data = (await res.json().catch((): null => null)) as
          | PresenterTokenResponse
          | { error?: string }
          | null

        if (!res.ok) {
          throw new Error(
            (data && "error" in data && data.error) || "Failed to get presenter token"
          )
        }

        if (!data || !("token" in data) || !("wsUrl" in data)) {
          throw new Error("Invalid presenter token response")
        }

        if (cancelled) return

        setToken(data.token)
        setServerUrl(data.wsUrl)
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : "Failed to get presenter token")
      }
    }

    void loadPresenterToken()

    return () => {
      cancelled = true
    }
  }, [slug, id])

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-sm text-red-300">
        {error}
      </div>
    )
  }

  if (!token || !serverUrl) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-sm text-white/70">
        Connecting to LiveKit...
      </div>
    )
  }

  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect
      audio
      video
      className="min-h-screen bg-slate-950"
    >
      <RoomAudioRenderer />
      <PresenterInner />
    </LiveKitRoom>
  )
}