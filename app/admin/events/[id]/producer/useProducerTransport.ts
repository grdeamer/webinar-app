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
  setProgramSceneId: (value: string | null) => void
  setProgramSlideLabel: (value: string | null) => void
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
  setProgramSceneId,
  setProgramSlideLabel,
  runTake,
}: Params) {
  const [lastTransportActionAt, setLastTransportActionAt] = useState<number | null>(null)

  async function takeProgram(
    mode: "cut" | "auto",
    transitionType?: CinematicTransitionType,
    options?: {
      sceneId?: string | null
      slideLabel?: string | null
      transitionDurationMs?: number
    }
  ): Promise<void> {
    const durationMs =
      options?.transitionDurationMs ?? selectedTransitionDurationMs

    await runTake(mode, transitionType)

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
    setLastTransportActionAt(Date.now())
  }

  const transportState = useMemo(
    () => ({
      lastTransportActionAt,
    }),
    [lastTransportActionAt]
  )

  return {
    takeProgram,
    transportState,
  }
}
