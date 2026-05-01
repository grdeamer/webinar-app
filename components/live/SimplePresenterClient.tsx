"use client"

import { useEffect, useState } from "react"
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useLocalParticipant,
} from "@livekit/components-react"
import { ParticipantEvent } from "livekit-client"

type TokenResponse = {
  token: string
  wsUrl: string
  roomName: string
}

function PresenterControls() {
  const { localParticipant } = useLocalParticipant()
  const [cameraEnabled, setCameraEnabled] = useState(false)
  const [micEnabled, setMicEnabled] = useState(false)
  const [screenShareEnabled, setScreenShareEnabled] = useState(false)
  const [mediaError, setMediaError] = useState<string | null>(null)
  const [metadataError, setMetadataError] = useState<string | null>(null)
  const isReady = cameraEnabled && micEnabled
  const [isLive, setIsLive] = useState(false)

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
        if (!cancelled) {
          setMediaError("Camera or microphone is unavailable. Check browser permissions or LiveKit connection.")
        }
      }
    }

    void enableMedia()

    return () => {
      cancelled = true
    }
  }, [localParticipant])

  useEffect(() => {
    function updateFromMetadata(raw: string | undefined) {
      try {
        const metadata = raw ? JSON.parse(raw) : null
        setIsLive(metadata?.onStage === true)
        setMetadataError(null)
      } catch {
        setIsLive(false)
        setMetadataError("Unable to read live status from production metadata.")
      }
    }

    // initial state
    updateFromMetadata(localParticipant.metadata)

    // subscribe to changes
    const handler = () => updateFromMetadata(localParticipant.metadata)
    localParticipant.on(ParticipantEvent.ParticipantMetadataChanged, handler)

    return () => {
      localParticipant.off(ParticipantEvent.ParticipantMetadataChanged, handler)
    }
  }, [localParticipant])

  const toggleCamera = async () => {
    try {
      const next = !cameraEnabled
      await localParticipant.setCameraEnabled(next)
      setCameraEnabled(next)
      setMediaError(null)
    } catch (err) {
      console.error("Failed toggling camera", err)
      setMediaError("Camera toggle failed. Check browser permissions or LiveKit connection.")
    }
  }

  const toggleMic = async () => {
    try {
      const next = !micEnabled
      await localParticipant.setMicrophoneEnabled(next)
      setMicEnabled(next)
      setMediaError(null)
    } catch (err) {
      console.error("Failed toggling mic", err)
      setMediaError("Microphone toggle failed. Check browser permissions or LiveKit connection.")
    }
  }

  const toggleScreenShare = async () => {
    try {
      const next = !screenShareEnabled
      await localParticipant.setScreenShareEnabled(next)
      setScreenShareEnabled(next)
      setMediaError(null)
    } catch (err) {
      console.error("Failed toggling screen share", err)
      setMediaError("Screen share failed. Your browser may have blocked screen sharing or the LiveKit connection may be unavailable.")
    }
  }

  return (
    <div
      className={[
        "relative overflow-hidden rounded-3xl border p-6 text-white transition-all duration-300",
        isLive
          ? "border-red-300/30 bg-[radial-gradient(circle_at_top_right,rgba(239,68,68,0.22),transparent_38%),rgba(127,29,29,0.22)] shadow-[0_0_44px_rgba(239,68,68,0.18)]"
          : "border-white/10 bg-white/5",
      ].join(" ")}
    >
      {isLive ? (
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-red-400 shadow-[0_0_24px_rgba(248,113,113,0.95)]" />
      ) : null}
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-violet-200/45">
            Presenter Console
          </div>
          <h2 className="mt-2 text-2xl font-semibold">
            {isLive ? "You are live" : isReady ? "Ready backstage" : "You are backstage"}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/65">
            Your camera and microphone are connected to production. You are not live to the audience until the producer brings you on stage.
          </p>
        </div>

        <div
          className={[
            "rounded-full border px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em]",
            isLive
              ? "animate-pulse border-red-300/40 bg-red-500/20 text-red-100 shadow-[0_0_26px_rgba(239,68,68,0.35)]"
              : "border-white/10 bg-black/25 text-white/55",
          ].join(" ")}
        >
          {isLive ? "● Live" : "Not live"}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3 text-sm">
        <button
          onClick={toggleCamera}
          className={[
            "rounded-full px-4 py-2 transition border",
            cameraEnabled
              ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-200"
              : "border-white/10 bg-black/20 text-white/60 hover:bg-white/10",
          ].join(" ")}
        >
          {cameraEnabled ? "Camera On" : "Start Camera"}
        </button>

        <button
          onClick={toggleMic}
          className={[
            "rounded-full px-4 py-2 transition border",
            micEnabled
              ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-200"
              : "border-white/10 bg-black/20 text-white/60 hover:bg-white/10",
          ].join(" ")}
        >
          {micEnabled ? "Mic On" : "Unmute Mic"}
        </button>

        <button
          onClick={toggleScreenShare}
          className={[
            "rounded-full px-4 py-2 transition border",
            screenShareEnabled
              ? "border-violet-300/30 bg-violet-400/15 text-violet-100"
              : "border-white/10 bg-black/20 text-white/60 hover:bg-white/10",
          ].join(" ")}
        >
          {screenShareEnabled ? "Screen Sharing" : "Share Screen"}
        </button>

        <div
          className={[
            "ml-2 text-sm font-medium",
            isLive ? "text-red-200" : "text-white/40",
          ].join(" ")}
        >
          {isLive
            ? "You are live to the audience — stay with the producer"
            : screenShareEnabled
              ? "Screen share is connected to production"
              : isReady
                ? "Ready for producer cue"
                : "Waiting for camera and microphone"}
        </div>
      </div>

      {(mediaError || metadataError) && (
        <div className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-400/10 p-4 text-sm leading-6 text-amber-100/85">
          <div className="font-semibold text-amber-100">Connection check</div>
          {mediaError ? <div className="mt-1">{mediaError}</div> : null}
          {metadataError ? <div className="mt-1">{metadataError}</div> : null}
        </div>
      )}

      <div
        className={[
          "mt-5 rounded-2xl border p-4 text-sm leading-6",
          isLive
            ? "border-red-300/30 bg-red-500/15 text-red-50 shadow-[0_0_28px_rgba(239,68,68,0.12)]"
            : "border-violet-300/15 bg-violet-500/10 text-violet-100/75",
        ].join(" ")}
      >
        {isLive
          ? "You are live now. Stay focused, keep your eyes near camera, and follow producer direction. Do not close this page."
          : isReady
            ? "You are ready backstage. Keep this page open and wait for the producer cue."
            : "Turn on your camera and microphone, then stay backstage until the producer brings you into the live program."}
      </div>
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
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "disconnected">("connecting")

  useEffect(() => {
    let cancelled = false

    async function loadToken() {
      try {
        setError(null)
        setConnectionStatus("connecting")

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
        Connecting to presenter room…
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

      <div
        className={[
          "rounded-2xl border px-4 py-3 text-sm",
          connectionStatus === "connected"
            ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-100/80"
            : connectionStatus === "disconnected"
              ? "border-amber-300/20 bg-amber-400/10 text-amber-100/80"
              : "border-white/10 bg-white/5 text-white/55",
        ].join(" ")}
      >
        LiveKit connection: {connectionStatus}
      </div>

      <LiveKitRoom
        token={token}
        serverUrl={serverUrl}
        connect
        audio
        video
        className="contents"
        onConnected={() => setConnectionStatus("connected")}
        onDisconnected={() => setConnectionStatus("disconnected")}
        onError={(err) => {
          console.error("LiveKit room error", err)
          setConnectionStatus("disconnected")
          setError(err instanceof Error ? err.message : "LiveKit connection failed")
        }}
      >
        <RoomAudioRenderer />
        <PresenterControls />
      </LiveKitRoom>
    </div>
  )
}