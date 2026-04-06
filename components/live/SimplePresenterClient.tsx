"use client"

import { useEffect, useState } from "react"
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useLocalParticipant,
} from "@livekit/components-react"

type TokenResponse = {
  token: string
  wsUrl: string
  roomName: string
}

function PresenterControls() {
  const { localParticipant } = useLocalParticipant()
  const [cameraEnabled, setCameraEnabled] = useState(false)
  const [micEnabled, setMicEnabled] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function enableMedia() {
      try {
        await localParticipant.setCameraEnabled(true)
        await localParticipant.setMicrophoneEnabled(true)
        if (!cancelled) {
          setCameraEnabled(true)
          setMicEnabled(true)
        }
      } catch (error) {
        console.error("Failed enabling local media", error)
      }
    }

    void enableMedia()

    return () => {
      cancelled = true
    }
  }, [localParticipant])

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white">
      <h2 className="text-2xl font-semibold">Presenter joined</h2>

      <p className="mt-3 text-sm text-white/65">
        This page is publishing your camera and microphone into the LiveKit room.
      </p>

      <div className="mt-5 flex flex-wrap gap-3 text-sm">
        <div className="rounded-full border border-white/10 bg-black/20 px-3 py-2">
          Camera: {cameraEnabled ? "On" : "Off"}
        </div>
        <div className="rounded-full border border-white/10 bg-black/20 px-3 py-2">
          Mic: {micEnabled ? "On" : "Off"}
        </div>
      </div>

      <p className="mt-5 text-sm text-white/45">
        Keep this page open. Your attendee session page should now show your video.
      </p>
    </div>
  )
}

export default function SimplePresenterClient({
  tokenEndpoint,
}: {
  tokenEndpoint: string
}) {
  const [serverUrl, setServerUrl] = useState<string | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [roomName, setRoomName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadToken() {
      try {
        setError(null)

        const res = await fetch(tokenEndpoint, {
          method: "POST",
          cache: "no-store",
        })

        const data = (await res.json().catch((): null => null)) as
          | TokenResponse
          | { error?: string }
          | null

        if (!res.ok) {
          throw new Error(
            (data && "error" in data && data.error) || "Failed to join presenter room"
          )
        }

        if (!data || !("token" in data) || !("wsUrl" in data)) {
          throw new Error("Invalid presenter token response")
        }

        if (cancelled) return

        setToken(data.token)
        setServerUrl(data.wsUrl)
        setRoomName(data.roomName)
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : "Failed to join presenter room")
      }
    }

    void loadToken()

    return () => {
      cancelled = true
    }
  }, [tokenEndpoint])

  if (error) {
    return (
      <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-6 text-sm text-red-200">
        {error}
      </div>
    )
  }

  if (!token || !serverUrl) {
    return (
      <div className="rounded-3xl border border-white/10 bg-black/30 p-6 text-white">
        Loading presenter room…
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {roomName ? (
        <div className="text-xs uppercase tracking-[0.18em] text-white/40">
          Live room: {roomName}
        </div>
      ) : null}

      <LiveKitRoom
        token={token}
        serverUrl={serverUrl}
        connect
        audio
        video
        className="contents"
      >
        <RoomAudioRenderer />
        <PresenterControls />
      </LiveKitRoom>
    </div>
  )
}