"use client"

import { useCallback, useEffect } from "react"
import type useProducerRoomApi from "./useProducerRoomApi"
import type { ProducerParticipant, StageState } from "./producerRoomTypes"
import type { PreviewBlock } from "./useProducerBlocks"

type Params = {
  api: ReturnType<typeof useProducerRoomApi>
  eventId: string
  sessionId: string
  loadMediaDevices: () => Promise<void>
  setToken: (token: string | null) => void
  setServerUrl: (url: string | null) => void
  setRoomName: (roomName: string | null) => void
  setParticipants: (participants: ProducerParticipant[]) => void
  setStageState: (state: StageState | null) => void
  setProgramState: (state: StageState | null) => void
  setProgramBlocks: React.Dispatch<React.SetStateAction<PreviewBlock[]>>
  setLoadingText: (text: string) => void
  setError: (error: string | null) => void
  setSyncWarningText: (warning: string | null) => void
}

export default function useProducerRoomLifecycle({
  api,
  eventId,
  sessionId,
  loadMediaDevices,
  setToken,
  setServerUrl,
  setRoomName,
  setParticipants,
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
  }, [api, setParticipants])

  const loadProgramState = useCallback(async () => {
    const data = await api.loadProgramState()
    const state = data?.state ?? null
    setProgramState(state)
    if (Array.isArray(state?.program_blocks)) {
      setProgramBlocks(state.program_blocks)
    }
  }, [api, setProgramBlocks, setProgramState])

  const loadStageState = useCallback(async () => {
    const data = await api.loadStageState()
    setStageState(data?.state ?? null)
  }, [api, setStageState])

  const refreshAll = useCallback(async () => {
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
  }, [loadParticipants, loadStageState, loadProgramState, setSyncWarningText])

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
    let cancelled = false
    let timeoutId: number | null = null

    async function poll(): Promise<void> {
      if (cancelled) return
      if (document.visibilityState === "visible") {
        await refreshAll().catch(() => {
          // refreshAll exposes a persistent warning until a later sync succeeds.
        })
      }
      if (!cancelled) timeoutId = window.setTimeout((): void => {
        void poll()
      }, 3000)
    }

    timeoutId = window.setTimeout((): void => {
      void poll()
    }, 3000)
    return () => {
      cancelled = true
      if (timeoutId !== null) window.clearTimeout(timeoutId)
    }
  }, [refreshAll])

  return {
    refreshAll,
  }
}
