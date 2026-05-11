import { useCallback } from "react"

import type useProducerRoomApi from "./useProducerRoomApi"
import type { StageState } from "./producerRoomTypes"

type ProducerRoomApi = ReturnType<typeof useProducerRoomApi>

type Params = {
  api: ProducerRoomApi
  setStageState: (state: StageState) => void
}

export default function useProducerParticipantActions({
  api,
  setStageState,
}: Params) {
  const addToStage = useCallback(
    async (identity: string) => {
      const data = await api.addToStage(identity)
      setStageState(data.state)
    },
    [api, setStageState]
  )

  const removeFromStage = useCallback(
    async (identity: string) => {
      const data = await api.removeFromStage(identity)
      setStageState(data.state)
    },
    [api, setStageState]
  )

  const pinParticipant = useCallback(
    async (identity: string) => {
      const data = await api.pinParticipant(identity)
      setStageState(data.state)
    },
    [api, setStageState]
  )

  const unpinParticipant = useCallback(async () => {
    const data = await api.unpinParticipant()
    setStageState(data.state)
  }, [api, setStageState])

  const setPrimaryParticipant = useCallback(
    async (identity: string) => {
      const data = await api.setPrimaryParticipant(identity)
      setStageState(data.state)
    },
    [api, setStageState]
  )

  const clearPrimaryParticipant = useCallback(async () => {
    const data = await api.clearPrimaryParticipant()
    setStageState(data.state)
  }, [api, setStageState])

  return {
    addToStage,
    removeFromStage,
    pinParticipant,
    unpinParticipant,
    setPrimaryParticipant,
    clearPrimaryParticipant,
  }
}