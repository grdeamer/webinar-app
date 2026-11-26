"use client"

import { useEffect, useRef, useState } from "react"

const endpoint = "/api/admin/zoom-bridge/desktop-return"
const sampleRate = 24000
const bytesPerSecond = sampleRate * 2

type Room = { id: string; name: string; meetingNumber?: string }
type Playback = {
  room: Room
  context: AudioContext
  abort: AbortController
  timer?: ReturnType<typeof setTimeout>
  restoreAudioSession?: () => void
}

function selectPlaybackAudioSession() {
  const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession
  if (!session) return
  const previousType = session.type
  if (previousType === "playback") return
  try {
    session.type = "playback"
  } catch {
    // Browsers that do not support selecting the audio session still play normally.
    return
  }
  return () => {
    if (session.type === "playback") session.type = previousType
  }
}

function closePlayback(playback: Playback | null) {
  if (!playback) return
  playback.abort.abort()
  clearTimeout(playback.timer)
  void playback.context.close().catch(() => {})
  playback.restoreAudioSession?.()
}

export function useRoomAudio() {
  const current = useRef<Playback | null>(null)
  const [room, setRoom] = useState<Room | null>(null)
  const [message, setMessage] = useState("")

  useEffect(() => () => closePlayback(current.current), [])

  function stop() {
    closePlayback(current.current)
    current.current = null
    setRoom(null)
    setMessage("")
  }

  function toggle(next: Room) {
    const selected = current.current?.room.id === next.id
    stop()
    if (selected) return

    try {
      const context = new AudioContext()
      const playback: Playback = {
        room: next,
        context,
        abort: new AbortController(),
        restoreAudioSession: selectPlaybackAudioSession(),
      }
      current.current = playback
      setRoom(next)
      setMessage("Connecting audio…")
      void context.resume().then(() => play(playback)).catch(() => fail(playback, "Browser audio could not start. Click the room to retry."))
    } catch {
      setMessage("Browser audio is unavailable.")
    }
  }

  function fail(playback: Playback, reason: string) {
    if (current.current !== playback) return
    stop()
    setMessage(reason)
  }

  async function play(playback: Playback) {
    const { context, abort, room: selected } = playback
    const options = { cache: "no-store" as const, signal: abort.signal }
    let cursor = 0
    let startAt = 0
    let session: string
    try {
      const response = await fetch(endpoint, options)
      const status = await response.json()
      if (!response.ok || status.state !== "desktop_ready" || !status.audio || !status.sessionId ||
          (selected.meetingNumber && status.meetingId !== selected.meetingNumber)) {
        throw new Error("No matching room audio")
      }
      session = status.sessionId
    } catch {
      fail(playback, "Audio is unavailable for this room.")
      return
    }

    async function pull() {
      try {
        const response = await fetch(`${endpoint}?sessionId=${encodeURIComponent(session)}&after=${cursor}`, options)
        if (!response.ok) throw new Error("Audio unavailable")
        if (response.headers.get("content-type")?.startsWith("application/octet-stream")) {
          const sequence = Number(response.headers.get("x-audio-sequence"))
          const pcm = new DataView(await response.arrayBuffer())
          if (abort.signal.aborted) return
          if (!Number.isInteger(sequence) || sequence <= cursor || pcm.byteLength < bytesPerSecond ||
              pcm.byteLength > 4 * bytesPerSecond || pcm.byteLength % bytesPerSecond !== 0) throw new Error("Invalid audio")
          // Begin at the live edge, then play subsequent chunks in order.
          const offset = cursor === 0 ? pcm.byteLength - bytesPerSecond : 0
          const samples = context.createBuffer(1, (pcm.byteLength - offset) / 2, sampleRate)
          const channel = samples.getChannelData(0)
          for (let i = 0; i < channel.length; i++) channel[i] = pcm.getInt16(offset + i * 2, true) / 32768
          const source = context.createBufferSource()
          source.buffer = samples
          source.connect(context.destination)
          source.onended = () => source.disconnect()
          startAt = Math.max(startAt, context.currentTime + 0.75)
          source.start(startAt)
          startAt += samples.duration
          cursor = sequence
          setMessage("")
        } else {
          const status = await response.json()
          if (status.state !== "desktop_ready" || !status.audio) throw new Error("Audio ended")
        }
        if (!abort.signal.aborted) playback.timer = setTimeout(() => void pull(), 550)
      } catch {
        if (!abort.signal.aborted) fail(playback, "Room audio stopped. Click the room to reconnect.")
      }
    }

    if (!abort.signal.aborted) await pull()
  }

  return { room, message, toggle, stop }
}
