import { useCallback, useEffect, useRef, useState } from "react"

export default function useProducerDevices() {
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([])
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedVideoDeviceId, setSelectedVideoDeviceId] = useState("")
  const [selectedAudioDeviceId, setSelectedAudioDeviceId] = useState("")
  const [deviceAccessReady, setDeviceAccessReady] = useState(false)
  const [localMicLevel, setLocalMicLevel] = useState(0)

  const localPreviewStreamRef = useRef<MediaStream | null>(null)

  const stopLocalPreviewStream = useCallback(() => {
    if (!localPreviewStreamRef.current) return

    localPreviewStreamRef.current.getTracks().forEach((track) => track.stop())
    localPreviewStreamRef.current = null
  }, [])

  const loadMediaDevices = useCallback(async () => {
    try {
      const tempStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      })

      const devices = await navigator.mediaDevices.enumerateDevices()

      tempStream.getTracks().forEach((track) => track.stop())

      const videos = devices.filter((device) => device.kind === "videoinput")
      const audios = devices.filter((device) => device.kind === "audioinput")

      setVideoDevices(videos)
      setAudioDevices(audios)

      setSelectedVideoDeviceId((prev) =>
        prev && videos.some((device) => device.deviceId === prev)
          ? prev
          : videos[0]?.deviceId || ""
      )

      setSelectedAudioDeviceId((prev) =>
        prev && audios.some((device) => device.deviceId === prev)
          ? prev
          : audios[0]?.deviceId || ""
      )

      setDeviceAccessReady(videos.length > 0 || audios.length > 0)
    } catch (error) {
      console.error("Failed to load media devices", error)
      setDeviceAccessReady(false)
      setVideoDevices([])
      setAudioDevices([])
      setSelectedVideoDeviceId("")
      setSelectedAudioDeviceId("")
    }
  }, [])

  useEffect(() => {
    if (!deviceAccessReady) return

    let cancelled = false

    async function start() {
      try {
        stopLocalPreviewStream()

        const videoExists =
          !selectedVideoDeviceId ||
          videoDevices.some((device) => device.deviceId === selectedVideoDeviceId)

        const audioExists =
          !selectedAudioDeviceId ||
          audioDevices.some((device) => device.deviceId === selectedAudioDeviceId)

        const stream = await navigator.mediaDevices.getUserMedia({
          video: videoExists
            ? selectedVideoDeviceId
              ? { deviceId: { exact: selectedVideoDeviceId } }
              : true
            : true,
          audio: audioExists
            ? selectedAudioDeviceId
              ? { deviceId: { exact: selectedAudioDeviceId } }
              : true
            : true,
        })

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }

        localPreviewStreamRef.current = stream
      } catch (error) {
        console.error("Preview start failed", error)
      }
    }

    void start()

    return () => {
      cancelled = true
      stopLocalPreviewStream()
    }
  }, [
    deviceAccessReady,
    selectedVideoDeviceId,
    selectedAudioDeviceId,
    videoDevices,
    audioDevices,
    stopLocalPreviewStream,
  ])

  useEffect(() => {
    if (!deviceAccessReady) return

    let cancelled = false
    let animationFrameId = 0
    let audioContext: AudioContext | null = null

    async function startMeter() {
      await new Promise((resolve) => window.setTimeout(resolve, 250))

      const stream = localPreviewStreamRef.current
      const audioTrack = stream?.getAudioTracks()[0]

      if (!stream || !audioTrack || cancelled) {
        setLocalMicLevel(0)
        return
      }

      audioContext = new AudioContext()
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256

      source.connect(analyser)

      const data = new Uint8Array(analyser.frequencyBinCount)

      function tick() {
        if (cancelled) return

        analyser.getByteTimeDomainData(data)

        let sum = 0
        for (const value of data) {
          const normalized = (value - 128) / 128
          sum += normalized * normalized
        }

        const rms = Math.sqrt(sum / data.length)
        const boosted = Math.min(1, rms * 9)

        setLocalMicLevel((previous) => {
          const attack = boosted > previous ? 0.35 : 0.12
          return previous + (boosted - previous) * attack
        })

        animationFrameId = window.requestAnimationFrame(tick)
      }

      tick()
    }

    void startMeter()

    return () => {
      cancelled = true
      window.cancelAnimationFrame(animationFrameId)
      void audioContext?.close().catch(() => {})
      setLocalMicLevel(0)
    }
  }, [deviceAccessReady, selectedAudioDeviceId])

  useEffect(() => {
    return () => {
      stopLocalPreviewStream()
    }
  }, [stopLocalPreviewStream])

  return {
    videoDevices,
    audioDevices,
    selectedVideoDeviceId,
    selectedAudioDeviceId,
    deviceAccessReady,
    localMicLevel,
    loadMediaDevices,
    stopLocalPreviewStream,
    setSelectedVideoDeviceId,
    setSelectedAudioDeviceId,
  }
}
