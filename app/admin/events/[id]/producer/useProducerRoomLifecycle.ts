"use client"

import { useCallback, useEffect, useRef } from "react"
import { startVisibilityPoll } from "@/lib/browser/visibilityPoll"
import type { ProducerRoomApi } from "@/lib/producer/producerRoomApi"
import type { ProducerParticipant, StageState } from "./producerRoomTypes"
import type { PreviewBlock } from "./useProducerBlocks"
import { normalizeProducerBlocks } from "./producerAssetUrls"

type Params = {
  engineBacked?: boolean
  api: ProducerRoomApi
  eventId: string
  sessionId: string
  loadMediaDevices: () => Promise<void>
  setToken: (token: string | null) => void
  setServerUrl: (url: string | null) => void
  setRoomName: (roomName: string | null) => void
  setParticipants: (participants: ProducerParticipant[]) => void
  setParticipantsLoaded: (loaded: boolean) => void
  setStageState: (state: StageState | null) => void
  setProgramState: (state: StageState | null) => void
  setProgramBlocks: React.Dispatch<React.SetStateAction<PreviewBlock[]>>
  setLoadingText: (text: string) => void
  setError: (error: string | null) => void
  setSyncWarningText: (warning: string | null) => void
}

export default function useProducerRoomLifecycle({
  api,
  engineBacked = false,
  eventId,
  sessionId,
  loadMediaDevices,
  setToken,
  setServerUrl,
  setRoomName,
  setParticipants,
  setParticipantsLoaded,
  setStageState,
  setProgramState,
  setProgramBlocks,
  setLoadingText,
  setError,
  setSyncWarningText,
}: Params) {
  const loadToken = useCallback(async () => {
    const data = await api.loadToken()
    setToken(data.token)
    setServerUrl(process.env.NEXT_PUBLIC_LIVEKIT_URL || "")
    setRoomName(data.roomName ?? null)
  }, [api, setToken, setServerUrl, setRoomName])

  const loadParticipants = useCallback(async () => {
    const data = await api.loadParticipants()
    setParticipants(Array.isArray(data?.participants) ? data.participants : [])
    setParticipantsLoaded(true)
  }, [api, setParticipants, setParticipantsLoaded])

  const loadProgramState = useCallback(async () => {
    if (engineBacked) return
    const data = await api.loadProgramState()
    const state = data?.state ?? null
    setProgramState(state)
    if (Array.isArray(state?.program_blocks)) {
      setProgramBlocks(normalizeProducerBlocks(eventId, state.program_blocks))
    }
  }, [api, engineBacked, eventId, setProgramBlocks, setProgramState])

  const loadStageState = useCallback(async () => {
    const data = await api.loadStageState()
    setStageState(data?.state ?? null)
  }, [api, setStageState])

  const pendingRefresh = useRef<{api: ProducerRoomApi; request: Promise<void>} | null>(null)
  const refreshAll = useCallback((): Promise<void> => {
    if (pendingRefresh.current?.api === api) return pendingRefresh.current.request
    const request = (async () => {
    try {
      await Promise.all([
        loadParticipants(),
        loadStageState(),
        loadProgramState(),
      ])
      setSyncWarningText(null)
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Producer state synchronization failed"
      setSyncWarningText(`Live state is not synchronized: ${message}`)
      throw error
    }
    })()
    pendingRefresh.current = { api, request }
    void request.finally(() => { if (pendingRefresh.current?.request === request) pendingRefresh.current = null }).catch(() => {})
    return request
  }, [api, loadParticipants, loadStageState, loadProgramState, setSyncWarningText])

  useEffect(() => {
    let mounted = true

    async function boot() {
      try {
        setError(null)
        setLoadingText("Creating producer token...")

        await loadToken()
        if (!mounted) return

        await loadMediaDevices()
        if (!mounted) return

        setLoadingText("Loading room state...")
        await refreshAll()
      } catch (err: unknown) {
        if (!mounted) return

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load producer room"
        )
      }
    }

    void boot()

    return () => {
      mounted = false
    }
  }, [
    eventId,
    sessionId,
    loadMediaDevices,
    refreshAll,
    loadToken,
    setError,
    setLoadingText,
  ])

  useEffect(() => {
    const poll = startVisibilityPoll({run: refreshAll, intervalMs: 3000, initialDelayMs: 3000})
    return () => poll.stop()
  }, [refreshAll])

  return {
    refreshAll,
  }
}
