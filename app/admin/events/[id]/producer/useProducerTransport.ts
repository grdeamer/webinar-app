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
  onCommitted?: (mode: "cut" | "auto") => void
  validateTake?: () => string | null
  onBlocked?: (reason: string) => void
  runTake: (
    mode: "cut" | "auto",
    transitionType?: CinematicTransitionType,
    transitionDurationMs?: number,
  ) => Promise<boolean>
}

export default function useProducerTransport({
  sessionId,
  selectedTransitionDurationMs,
  selectedSceneId,
  previewBlocks,
  stageState,
  setProgramSceneId,
  setProgramSlideLabel,
  onCommitted,
  validateTake,
  onBlocked,
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
  ): Promise<boolean> {
    const blockedReason = validateTake?.() ?? null
    if (blockedReason) {
      onBlocked?.(blockedReason)
      return false
    }

    const durationMs =
      options?.transitionDurationMs ?? selectedTransitionDurationMs

    const committed = await runTake(mode, transitionType, durationMs)

    if (!committed) return false

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
    onCommitted?.(mode)
    return true
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
