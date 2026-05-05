"use client"

import { useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import {
  LiveKitRoom,
  ParticipantTile,
  RoomAudioRenderer,
  useLocalParticipant,
  useTracks,
} from "@livekit/components-react"
import { ParticipantEvent, Track } from "livekit-client"
function ProgramOnlyViewer({ programSource }: { programSource: ProgramSourceMessage | null }) {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: false },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: true }
  )

  const screenShareTrack = tracks.find(
    (trackRef) => trackRef.source === Track.Source.ScreenShare
  )
  const cameraTrack = tracks.find((trackRef) => trackRef.source === Track.Source.Camera)
  const requestedTrack = programSource
    ? tracks.find((trackRef) => {
        if (programSource.sourceType === "screen") {
          return (
            trackRef.source === Track.Source.ScreenShare &&
            trackRef.participant.identity === programSource.screenShareParticipantIdentity
          )
        }

        if (programSource.sourceType === "camera") {
          return (
            trackRef.source === Track.Source.Camera &&
            trackRef.participant.identity === programSource.participantIdentity
          )
        }

        return false
      })
    : null

  const primaryTrack = requestedTrack ?? cameraTrack ?? screenShareTrack
  const trackCount = tracks.length
  const selectedSource = primaryTrack?.source ?? programSource?.sourceType ?? "none"
  const sourceLabel =
    selectedSource === Track.Source.ScreenShare || selectedSource === "screen"
      ? "SCREEN"
      : selectedSource === Track.Source.Camera || selectedSource === "camera"
        ? "CAMERA"
        : "NO SOURCE"
  const modeLabel = (programSource?.mode ?? "auto").toUpperCase()

  const primaryTrackKey = primaryTrack
    ? `${primaryTrack.participant.identity}:${primaryTrack.publication?.trackSid ?? primaryTrack.source}`
    : "empty"

  const isCut = programSource?.mode === "cut"
  const transitionDuration = isCut ? 0.08 : 0.32
  const initialScale = isCut ? 1 : 0.985
  const exitScale = isCut ? 1 : 1.012

  const [showTakeFlash, setShowTakeFlash] = useState(false)

  useEffect(() => {
    if (!programSource) return
    setShowTakeFlash(true)
    const t = setTimeout(() => setShowTakeFlash(false), isCut ? 180 : 360)
    return () => clearTimeout(t)
  }, [isCut, programSource])

  if (!primaryTrack) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={primaryTrackKey}
          initial={{ opacity: 0, scale: initialScale }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: exitScale }}
          transition={{ duration: transitionDuration, ease: "easeOut" }}
          className="relative flex h-full w-full items-center justify-center bg-black text-center"
        >
          <>
            <AnimatePresence>
              {showTakeFlash ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, isCut ? 0.72 : 0.46, 0] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: isCut ? 0.18 : 0.36, ease: "easeOut" }}
                  className="pointer-events-none absolute inset-0 z-30 overflow-hidden bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.82),rgba(248,113,113,0.22)_38%,transparent_72%)]"
                >
                  <motion.div
                    initial={{ x: "-35%", opacity: 0.85 }}
                    animate={{ x: "135%", opacity: 0 }}
                    transition={{ duration: isCut ? 0.16 : 0.34, ease: "easeOut" }}
                    className="absolute inset-y-0 w-1/3 rotate-12 bg-white/60 blur-xl"
                  />
                </motion.div>
              ) : null}
            </AnimatePresence>
            <div>
              <div className="mx-auto mb-4 h-14 w-14 rounded-full border border-white/10 bg-white/[0.035] shadow-[0_0_36px_rgba(255,255,255,0.06)]" />
              <div className="text-sm font-semibold uppercase tracking-[0.2em] text-white/35">
                No program source
              </div>
              <div className="mt-2 text-xs text-white/25">
                Waiting for camera or screen share
              </div>
              <div className="mt-4 inline-flex rounded-full border border-white/10 bg-white/[0.035] px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white/35">
                PROGRAM · {sourceLabel} · {modeLabel}
              </div>
            </div>
          </>
        </motion.div>
      </AnimatePresence>
    )
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={primaryTrackKey}
        initial={{ opacity: 0, scale: initialScale }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: exitScale }}
        transition={{ duration: transitionDuration, ease: "easeOut" }}
        className="relative h-full w-full overflow-hidden bg-black [&_.lk-participant-tile]:h-full [&_.lk-participant-tile]:w-full [&_.lk-participant-tile]:border-0 [&_.lk-participant-tile]:bg-black [&_.lk-participant-tile]:p-0 [&_video]:h-full [&_video]:w-full [&_video]:object-contain"
      >
        <>
          <AnimatePresence>
            {showTakeFlash ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, isCut ? 0.72 : 0.46, 0] }}
                exit={{ opacity: 0 }}
                transition={{ duration: isCut ? 0.18 : 0.36, ease: "easeOut" }}
                className="pointer-events-none absolute inset-0 z-30 overflow-hidden bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.82),rgba(248,113,113,0.22)_38%,transparent_72%)]"
              >
                <motion.div
                  initial={{ x: "-35%", opacity: 0.85 }}
                  animate={{ x: "135%", opacity: 0 }}
                  transition={{ duration: isCut ? 0.16 : 0.34, ease: "easeOut" }}
                  className="absolute inset-y-0 w-1/3 rotate-12 bg-white/60 blur-xl"
                />
              </motion.div>
            ) : null}
          </AnimatePresence>
          <div className="pointer-events-none absolute right-3 top-3 z-20 rounded-full border border-white/10 bg-black/60 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white/55 shadow-[0_0_18px_rgba(0,0,0,0.28)] backdrop-blur">
            PROGRAM · {sourceLabel} · {modeLabel}
          </div>
          <ParticipantTile trackRef={primaryTrack} />
        </>
      </motion.div>
    </AnimatePresence>
  )
}

type TokenResponse = {
  token: string
  wsUrl: string
  roomName: string
}

type PresenterNextContentMessage = {
  type: "slide" | "screen" | "empty"
  title: string
  subtitle?: string
  mode?: "preview" | "program"
  updatedAt: number
}

type PresenterStatusMessage = {
  cameraEnabled: boolean
  micEnabled: boolean
  screenShareEnabled: boolean
  isReady: boolean
  isLive: boolean
  updatedAt: number
}

type ProgramSourceMessage = {
  mode: "cut" | "auto"
  sourceType: "camera" | "screen" | "empty"
  participantIdentity: string | null
  screenShareParticipantIdentity: string | null
  screenShareTrackId: string | null
  layout: string | null
  isLive: boolean
  updatedAt: number
}

export function PresenterNextContentPanel({
  channelKey,
}: {
  channelKey: string
}) {
  const [content, setContent] = useState<PresenterNextContentMessage | null>(null)

  useEffect(() => {
    function readStoredContent() {
      try {
        const raw = window.localStorage.getItem(channelKey)
        if (!raw) return
        const parsed = JSON.parse(raw) as PresenterNextContentMessage
        if (!parsed?.title || !parsed?.type) return
        setContent(parsed)
      } catch (_err) {
        // Ignore malformed local next-content cache.
      }
    }

    readStoredContent()

    const channel = new BroadcastChannel(channelKey)
    channel.onmessage = (event) => {
      const nextContent = event.data as PresenterNextContentMessage
      if (!nextContent?.title || !nextContent?.type) return
      setContent(nextContent)
    }

    function onStorage(event: StorageEvent) {
      if (event.key !== channelKey || !event.newValue) return
      try {
        setContent(JSON.parse(event.newValue) as PresenterNextContentMessage)
      } catch (_err) {
        // Ignore malformed storage events.
      }
    }

    window.addEventListener("storage", onStorage)
    return () => {
      channel.close()
      window.removeEventListener("storage", onStorage)
    }
  }, [channelKey])

  const isProgram = content?.mode === "program"
  const label = content?.type === "screen" ? "Screen Share" : content?.type === "slide" ? "Slide" : "Next Content"

  return (
    <div className="md:col-span-2 rounded-3xl border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.18em] text-amber-200/60">
        <span>Next Content</span>
        {content ? (
          <span
            className={[
              "rounded-full border px-2 py-0.5 text-[10px]",
              isProgram
                ? "border-red-300/25 bg-red-500/15 text-red-100"
                : "border-violet-300/25 bg-violet-500/15 text-violet-100",
            ].join(" ")}
          >
            {isProgram ? "Program" : "Preview"}
          </span>
        ) : null}
      </div>

      <div
        className={[
          "relative h-[220px] overflow-hidden rounded-2xl border flex items-center justify-center text-center transition",
          isProgram
            ? "border-red-300/25 bg-[radial-gradient(circle_at_top_right,rgba(239,68,68,0.18),transparent_36%),rgba(0,0,0,0.55)]"
            : content
              ? "border-amber-200/20 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.16),transparent_36%),rgba(0,0,0,0.5)]"
              : "border-white/10 bg-black/50",
        ].join(" ")}
      >
        <div className="px-6">
          <div className="text-xs uppercase tracking-[0.2em] text-white/35">
            {content ? label : "Waiting for producer"}
          </div>
          <div className="mt-3 text-2xl font-semibold text-white/85">
            {content?.title ?? "No next content selected"}
          </div>
          <div className="mt-2 text-sm text-white/45">
            {content?.subtitle ?? "Slides or screen share will appear here when the producer sends them."}
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/45" disabled>
          ◀ Prev
        </button>
        <button className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/45" disabled>
          ▶ Next
        </button>
        <button className="ml-auto rounded-lg border border-violet-300/30 bg-violet-500/10 px-4 py-2 text-sm text-violet-200 opacity-60" disabled>
          Send to Preview
        </button>
      </div>
    </div>
  )
}

export function PresenterStatusRail({
  channelKey,
}: {
  channelKey: string
}) {
  const [status, setStatus] = useState<PresenterStatusMessage | null>(null)
  const [showLiveFlash, setShowLiveFlash] = useState(false)

  useEffect(() => {
    function readStoredStatus() {
      try {
        const raw = window.localStorage.getItem(channelKey)
        if (!raw) return
        const parsed = JSON.parse(raw) as PresenterStatusMessage
        setStatus(parsed)
      } catch (_err) {
        // Ignore malformed local status cache.
      }
    }

    readStoredStatus()

    const channel = new BroadcastChannel(channelKey)
    channel.onmessage = (event) => {
      setStatus(event.data as PresenterStatusMessage)
    }

    function onStorage(event: StorageEvent) {
      if (event.key !== channelKey || !event.newValue) return
      try {
        setStatus(JSON.parse(event.newValue) as PresenterStatusMessage)
      } catch (_err) {
        // Ignore malformed storage events.
      }
    }

    window.addEventListener("storage", onStorage)
    return () => {
      channel.close()
      window.removeEventListener("storage", onStorage)
    }
  }, [channelKey])

  const isConnected = Boolean(status)
  const isReady = Boolean(status?.isReady)
  const isLive = Boolean(status?.isLive)

  useEffect(() => {
    if (!isLive) return

    setShowLiveFlash(true)
    const timeout = window.setTimeout(() => setShowLiveFlash(false), 1600)
    return () => window.clearTimeout(timeout)
  }, [isLive])

  return (
    <div className="relative overflow-hidden rounded-3xl">
      <AnimatePresence>
        {showLiveFlash ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-red-500/18 backdrop-blur-[1px]"
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
              className="rounded-full border border-red-200/30 bg-black/55 px-6 py-3 text-[11px] font-black uppercase tracking-[0.24em] text-red-50 shadow-[0_0_42px_rgba(248,113,113,0.35)]"
            >
              You are live
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div
        className={[
          "grid gap-3 rounded-3xl border p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition duration-300 md:grid-cols-3",
          isLive
            ? "border-red-300/20 bg-red-500/[0.045] shadow-[0_0_34px_rgba(248,113,113,0.12),inset_0_1px_0_rgba(255,255,255,0.04)]"
            : "border-white/10 bg-white/[0.025]",
        ].join(" ")}
      >
      <div className="rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-4 py-3">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-200/70">
          <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.7)]" />
          {isConnected ? "Connected" : "Connecting"}
        </div>
        <div className="mt-1 text-sm font-semibold text-emerald-50/85">
          {isConnected ? "Backstage link active" : "Joining backstage"}
        </div>
      </div>

      <div
        className={[
          "rounded-2xl border px-4 py-3",
          isReady
            ? "border-emerald-300/20 bg-emerald-400/10"
            : "border-amber-300/20 bg-amber-400/10",
        ].join(" ")}
      >
        <div
          className={[
            "flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em]",
            isReady ? "text-emerald-200/70" : "text-amber-100/70",
          ].join(" ")}
        >
          <span
            className={[
              "h-2 w-2 rounded-full shadow-[0_0_10px_currentColor]",
              isReady ? "bg-emerald-400" : "bg-amber-300",
            ].join(" ")}
          />
          {isReady ? "Ready" : "Standby"}
        </div>
        <div
          className={[
            "mt-1 text-sm font-semibold",
            isReady ? "text-emerald-50/85" : "text-amber-50/85",
          ].join(" ")}
        >
          {isReady ? "Camera and mic ready" : "Await camera and mic"}
        </div>
      </div>

      <div
        className={[
          "rounded-2xl border px-4 py-3",
          isLive
            ? "border-red-300/30 bg-red-500/15 shadow-[0_0_24px_rgba(248,113,113,0.12)]"
            : "border-red-300/20 bg-red-500/10",
        ].join(" ")}
      >
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-red-100/70">
          <span
            className={[
              "h-2 w-2 rounded-full bg-red-400 shadow-[0_0_10px_rgba(248,113,113,0.75)]",
              isLive ? "animate-pulse" : "",
            ].join(" ")}
          />
          {isLive ? "Live" : "Not Live"}
        </div>
        <div className="mt-1 text-sm font-semibold text-red-50/85">
          {isLive ? "Camera is in Program" : "Camera not in Program"}
        </div>
      </div>
      </div>
    </div>
  )
}

export function PresenterProgramMonitor({
  tokenEndpoint,
  programSourceChannelKey,
}: {
  tokenEndpoint: string
  programSourceChannelKey?: string
}) {
  const [serverUrl, setServerUrl] = useState<string | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [programSource, setProgramSource] = useState<ProgramSourceMessage | null>(null)
  useEffect(() => {
    if (!programSourceChannelKey) return

    function readStoredSource() {
      try {
        const raw = window.localStorage.getItem(programSourceChannelKey)
        if (!raw) return
        setProgramSource(JSON.parse(raw) as ProgramSourceMessage)
      } catch (_err) {
        // Ignore malformed local program source cache.
      }
    }

    readStoredSource()

    const channel = new BroadcastChannel(programSourceChannelKey)
    channel.onmessage = (event) => {
      setProgramSource(event.data as ProgramSourceMessage)
    }

    function onStorage(event: StorageEvent) {
      if (event.key !== programSourceChannelKey || !event.newValue) return
      try {
        setProgramSource(JSON.parse(event.newValue) as ProgramSourceMessage)
      } catch (_err) {
        // Ignore malformed storage events.
      }
    }

    window.addEventListener("storage", onStorage)
    return () => {
      channel.close()
      window.removeEventListener("storage", onStorage)
    }
  }, [programSourceChannelKey])

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
            (data && "error" in data && data.error) || "Failed to join program monitor"
          )
        }

        if (!data || !("token" in data) || !("wsUrl" in data)) {
          throw new Error("Invalid program token response")
        }

        if (cancelled) return

        setToken(data.token)
        setServerUrl(data.wsUrl)
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : "Failed to join program monitor")
      }
    }

    void loadToken()

    return () => {
      cancelled = true
    }
  }, [tokenEndpoint])

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-black text-center text-sm text-red-200/80">
        {error}
      </div>
    )
  }

  if (!token || !serverUrl) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-black text-center text-sm text-white/35">
        Connecting to Program Monitor…
      </div>
    )
  }

  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect
      video={false}
      audio
      className="h-full w-full"
    >
      <ProgramOnlyViewer programSource={programSource} />
      <RoomAudioRenderer />
    </LiveKitRoom>
  )
}

function PresenterControls({ statusChannelKey }: { statusChannelKey?: string }) {
  const { localParticipant } = useLocalParticipant()
  const [cameraEnabled, setCameraEnabled] = useState(false)
  const [micEnabled, setMicEnabled] = useState(false)
  const [screenShareEnabled, setScreenShareEnabled] = useState(false)
  const [mediaError, setMediaError] = useState<string | null>(null)
  const [metadataError, setMetadataError] = useState<string | null>(null)
  const isReady = cameraEnabled && micEnabled
  const [isLive, setIsLive] = useState(false)

  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([])
  const [mics, setMics] = useState<MediaDeviceInfo[]>([])
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null)
  const [selectedMicId, setSelectedMicId] = useState<string | null>(null)
  const [micLevel, setMicLevel] = useState(0)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)

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
    async function loadDevices() {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        const cams = devices.filter((d) => d.kind === "videoinput")
        const microphones = devices.filter((d) => d.kind === "audioinput")
        setCameras(cams)
        setMics(microphones)
        if (!selectedCameraId && cams[0]) setSelectedCameraId(cams[0].deviceId)
        if (!selectedMicId && microphones[0]) setSelectedMicId(microphones[0].deviceId)
      } catch (e) {
        console.error("Device enumeration failed", e)
      }
    }

    void loadDevices()
  }, [])

  useEffect(() => {
    let raf: number

    async function setupMeter() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const ctx = new AudioContext()
        const source = ctx.createMediaStreamSource(stream)
        const analyser = ctx.createAnalyser()
        analyser.fftSize = 256
        source.connect(analyser)

        analyserRef.current = analyser
        audioCtxRef.current = ctx

        const data = new Uint8Array(analyser.frequencyBinCount)

        const tick = () => {
          analyser.getByteFrequencyData(data)
          const avg = data.reduce((a, b) => a + b, 0) / data.length
          setMicLevel(avg / 255)
          raf = requestAnimationFrame(tick)
        }

        tick()
      } catch (e) {
        console.warn("Mic meter unavailable", e)
      }
    }

    void setupMeter()

    return () => cancelAnimationFrame(raf)
  }, [])

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

  useEffect(() => {
    if (!statusChannelKey) return

    const payload: PresenterStatusMessage = {
      cameraEnabled,
      micEnabled,
      screenShareEnabled,
      isReady,
      isLive,
      updatedAt: Date.now(),
    }

    try {
      window.localStorage.setItem(statusChannelKey, JSON.stringify(payload))
      const channel = new BroadcastChannel(statusChannelKey)
      channel.postMessage(payload)
      channel.close()
    } catch (_err) {
      // Presenter status rail sync is best-effort for local v1.
    }
  }, [cameraEnabled, isLive, isReady, micEnabled, screenShareEnabled, statusChannelKey])

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

  const changeCamera = async (deviceId: string) => {
    try {
      await localParticipant.setCameraEnabled(false)
      await localParticipant.setCameraEnabled(true, { deviceId })
      setSelectedCameraId(deviceId)
    } catch (e) {
      console.error("Camera switch failed", e)
    }
  }

  const changeMic = async (deviceId: string) => {
    try {
      await localParticipant.setMicrophoneEnabled(false)
      await localParticipant.setMicrophoneEnabled(true, { deviceId })
      setSelectedMicId(deviceId)
    } catch (e) {
      console.error("Mic switch failed", e)
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
            Presenter Confidence Panel
          </div>
          <h2 className="mt-2 text-2xl font-semibold">
            {isLive ? "You are live" : isReady ? "Ready backstage" : "You are backstage"}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/65">
            Check your camera, microphone, and screen share before the producer brings you into Program.
          </p>
        </div>

        <motion.div
          animate={
            isLive
              ? {
                  scale: [1, 1.035, 1],
                  boxShadow: [
                    "0 0 18px rgba(239,68,68,0.18)",
                    "0 0 34px rgba(239,68,68,0.42)",
                    "0 0 18px rgba(239,68,68,0.18)",
                  ],
                }
              : { scale: 1, boxShadow: "0 0 0 rgba(0,0,0,0)" }
          }
          transition={
            isLive
              ? { duration: 1.8, repeat: Infinity, ease: "easeInOut" }
              : { duration: 0.2 }
          }
          className={[
            "rounded-full border px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em]",
            isLive
              ? "border-red-300/40 bg-red-500/20 text-red-100"
              : "border-white/10 bg-black/25 text-white/55",
          ].join(" ")}
        >
          <span className="inline-flex items-center gap-2">
            {isLive ? (
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-400 shadow-[0_0_12px_rgba(248,113,113,0.95)]" />
              </span>
            ) : null}
            {isLive ? "Live" : "Not live"}
          </span>
        </motion.div>
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
            "min-w-[220px] text-sm font-medium md:ml-2",
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

      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/35">
              Devices
            </div>
            <div className="mt-1 text-sm font-semibold text-white/80">
              Camera & microphone check
            </div>
          </div>
          <div
            className={[
              "rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em]",
              isReady
                ? "border-emerald-300/25 bg-emerald-400/10 text-emerald-200"
                : "border-amber-300/20 bg-amber-400/10 text-amber-100/75",
            ].join(" ")}
          >
            {isReady ? "Ready" : "Check"}
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-white/45">
              Camera
            </label>
            <select
              value={selectedCameraId ?? ""}
              onChange={(e) => changeCamera(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-white/80 outline-none transition focus:border-violet-300/40"
            >
              {cameras.length === 0 ? <option>No camera detected</option> : null}
              {cameras.map((cam, index) => (
                <option key={cam.deviceId} value={cam.deviceId}>
                  {cam.label || `Camera ${index + 1}`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-white/45">
              Microphone
            </label>
            <select
              value={selectedMicId ?? ""}
              onChange={(e) => changeMic(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-white/80 outline-none transition focus:border-violet-300/40"
            >
              {mics.length === 0 ? <option>No microphone detected</option> : null}
              {mics.map((mic, index) => (
                <option key={mic.deviceId} value={mic.deviceId}>
                  {mic.label || `Microphone ${index + 1}`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.12em] text-white/45">
              <span>Mic Level</span>
              <span>{Math.round(Math.min(100, micLevel * 100))}%</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.45)] transition-all duration-75"
                style={{ width: `${Math.min(100, micLevel * 100)}%` }}
              />
            </div>
          </div>
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
          "mt-5 rounded-2xl border p-4 text-sm leading-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
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
  eventTitle,
  statusChannelKey,
}: {
  tokenEndpoint: string
  eventTitle?: string
  statusChannelKey?: string
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
      {eventTitle ? (
        <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-[11px] font-semibold uppercase leading-5 tracking-[0.2em] text-white/50">
          {eventTitle}
        </div>
      ) : roomName ? (
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
        <PresenterControls statusChannelKey={statusChannelKey} />
      </LiveKitRoom>
    </div>
  )
}