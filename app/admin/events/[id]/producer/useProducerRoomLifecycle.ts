

"use client"

import { useCallback, useEffect } from "react"
import type useProducerRoomApi from "./useProducerRoomApi"
import type { ProducerParticipant, StageState } from "./producerRoomTypes"

type Params = {
  api: ReturnType<typeof useProducerRoomApi>
  eventId: string
  sessionId: string
  loadMediaDevices: () => Promise<void>
  setToken: (token: string | null) => void
  setServerUrl: (url: string | null) => void
  setParticipants: (participants: ProducerParticipant[]) => void
  setStageState: (state: StageState | null) => void
  setProgramState: (state: StageState | null) => void
  setLoadingText: (text: string) => void
  setError: (error: string | null) => void
}

export default function useProducerRoomLifecycle({
  api,
  eventId,
  sessionId,
  loadMediaDevices,
  setToken,
  setServerUrl,
  setParticipants,
  setStageState,
  setProgramState,
  setLoadingText,
  setError,
}: Params) {
  const loadToken = useCallback(async () => {
    const data = await api.loadToken()
    setToken(data.token)
    setServerUrl(process.env.NEXT_PUBLIC_LIVEKIT_URL || "")
  }, [api, setToken, setServerUrl])

  const loadParticipants = useCallback(async () => {
    const data = await api.loadParticipants()
    setParticipants(Array.isArray(data?.participants) ? data.participants : [])
  }, [api, setParticipants])

  const loadProgramState = useCallback(async () => {
    const data = await api.loadProgramState()
    setProgramState(data?.state ?? null)
  }, [api, setProgramState])

  const loadStageState = useCallback(async () => {
    const data = await api.loadStageState()
    setStageState(data?.state ?? null)
  }, [api, setStageState])

  const refreshAll = useCallback(async () => {
    await Promise.all([
      loadParticipants(),
      loadStageState(),
      loadProgramState(),
    ])
  }, [loadParticipants, loadStageState, loadProgramState])

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
    const id = window.setInterval(() => {
      void refreshAll().catch(() => {})
    }, 3000)

    return () => window.clearInterval(id)
  }, [refreshAll])

  return {
    refreshAll,
  }
}