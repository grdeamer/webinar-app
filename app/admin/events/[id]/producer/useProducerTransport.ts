import { useMemo, useState } from "react"

import type { PreviewBlock } from "./useProducerBlocks"
import type { StageState } from "./producerRoomTypes"
import type { CinematicTransitionType } from "./commandDeckTypes"
import { broadcastPresenterProgramSource } from "./programTransportUtils"

type Params = {
  sessionId: string
  selectedTransitionDurationMs: number
  selectedSceneId: string | null
  previewBlocks: PreviewBlock[]
  stageState: StageState | null
  commitPreviewToProgram?: () => void
  runTake: (
    mode: "cut" | "auto",
    transitionType?: CinematicTransitionType
  ) => Promise<void>
}

export default function useProducerTransport({
  sessionId,
  selectedTransitionDurationMs,
  selectedSceneId,
  previewBlocks,
  stageState,
  commitPreviewToProgram,
  runTake,
}: Params) {
  const [lastTransportActionAt, setLastTransportActionAt] = useState<number | null>(null)
  const [programSceneId, setProgramSceneId] = useState<string | null>(null)
  const [programSlideLabel, setProgramSlideLabel] = useState<string | null>(null)

  function takeProgram(
    mode: "cut" | "auto",
    transitionType?: CinematicTransitionType,
    options?: {
      sceneId?: string | null
      slideLabel?: string | null
      transitionDurationMs?: number
    }
  ) {
    const durationMs =
      options?.transitionDurationMs ?? selectedTransitionDurationMs

    setLastTransportActionAt(Date.now())
    commitPreviewToProgram?.()

    void runTake(mode, transitionType)

    broadcastPresenterProgramSource({
      mode,
      transitionType,
      transitionDurationMs: durationMs,
      sessionId,
      stageState,
      previewBlocks,
    })

    setProgramSceneId(options?.sceneId ?? selectedSceneId)
    setProgramSlideLabel(options?.slideLabel ?? null)
  }

  const transportState = useMemo(
    () => ({
      lastTransportActionAt,
      programSceneId,
      programSlideLabel,
    }),
    [lastTransportActionAt, programSceneId, programSlideLabel]
  )

  return {
    takeProgram,
    transportState,
  }
}