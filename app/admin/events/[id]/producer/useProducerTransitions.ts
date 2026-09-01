import { useCallback, useState } from "react"
import type { PreviewBlock } from "./useProducerBlocks"
import type { StageState } from "./producerRoomTypes"
import type { CinematicTransitionType } from "./commandDeckTypes"

type TakeMode = "cut" | "auto"


type ProducerTransitionApi = {
  takeProgram: (input: {
    expectedPreviewVersion: number | null
    programBlocks: PreviewBlock[]
    transition: Record<string, unknown>
  }) => Promise<{ state?: StageState | null } | null | undefined>
  setEventTransition?: (payload: {
    active: boolean
    type?: "fade" | "warp" | "curtain" | "none"
    headline?: string
    message?: string
    durationMs?: number
  }) => Promise<unknown>
  clearEventTransition?: () => Promise<unknown>
}

function prepareBlocksForTakeAnimation(blocks: PreviewBlock[]): PreviewBlock[] {
  return blocks.map((block) => ({
    ...block,
    animationProgress:
      block.animationType && block.animationType !== "none" ? 0 : block.animationProgress ?? 1,
  }))
}

function completeBlocksForTakeAnimation(blocks: PreviewBlock[]): PreviewBlock[] {
  return blocks.map((block) => ({
    ...block,
    animationProgress: 1,
  }))
}

export default function useProducerTransitions({
  api,
  programState,
  previewState,
  programBlocks,
  previewBlocks,
  setProgramState,
  setProgramBlocks,
  setError,
}: {
  api: ProducerTransitionApi
  programState: StageState | null
  previewState: StageState | null
  programBlocks: PreviewBlock[]
  previewBlocks: PreviewBlock[]
  setProgramState: React.Dispatch<React.SetStateAction<StageState | null>>
  setProgramBlocks: React.Dispatch<React.SetStateAction<PreviewBlock[]>>
  setError: React.Dispatch<React.SetStateAction<string | null>>
}) {
  const [takeBusy, setTakeBusy] = useState(false)
  const [lastTakeMode, setLastTakeMode] = useState<TakeMode>("cut")
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [transitionFromState, setTransitionFromState] = useState<StageState | null>(null)
  const [transitionFromBlocks, setTransitionFromBlocks] = useState<PreviewBlock[]>([])
  const [transitionFadingOut, setTransitionFadingOut] = useState(false)

  const takeProgram = useCallback(async (
    mode: TakeMode,
    transitionType?: CinematicTransitionType,
    transitionDurationMs = 620,
  ) => {
    const resolvedDurationMs = mode === "cut"
      ? 0
      : Math.max(200, Math.min(2500, transitionDurationMs))
    const previousProgramState = programState ? { ...programState } : null
    const previousProgramBlocks = programBlocks.map((block) => ({ ...block }))

    const data = await api.takeProgram({
      expectedPreviewVersion: previewState?.scene_version ?? null,
      programBlocks: previewBlocks,
      transition: {
        type: mode === "cut" ? "none" : transitionType ?? "fade",
        durationMs: resolvedDurationMs,
      },
    })

    setTransitionFromState(previousProgramState)
    setTransitionFromBlocks(previousProgramBlocks)
    setTransitionFadingOut(false)
    setIsTransitioning(true)

    setProgramState(data?.state ?? null)
    setProgramBlocks(prepareBlocksForTakeAnimation(previewBlocks))

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        setProgramBlocks((current) => completeBlocksForTakeAnimation(current))
      })
    })

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        setTransitionFadingOut(true)
      })
    })

    window.setTimeout(() => {
      setIsTransitioning(false)
      setTransitionFromState(null)
      setTransitionFromBlocks([])
      setTransitionFadingOut(false)
    }, Math.max(80, resolvedDurationMs))

    return data?.state ?? null
  }, [api, previewState?.scene_version, programState, programBlocks, previewBlocks, setProgramBlocks, setProgramState])

  const runTake = useCallback(
    async (
      mode: TakeMode = "cut",
      transitionType?: CinematicTransitionType,
      transitionDurationMs = 620,
    ) => {
      if (takeBusy) return false

      const resolvedDurationMs = mode === "cut"
        ? 0
        : Math.max(200, Math.min(2500, transitionDurationMs))

      try {
        setTakeBusy(true)
        setLastTakeMode(mode)
        setError(null)

        // A hard cut must commit Program directly. Coupling CUT to the
        // audience-transition overlay made the switch dependent on a second
        // request that is only needed for animated AUTO transitions.
        if (mode === "auto") {
          await api.setEventTransition?.({
            active: true,
            type: transitionType ?? "fade",
            headline: "Stand by",
            message: "Preparing next live destination",
            durationMs: resolvedDurationMs,
          })
        }

        await takeProgram(mode, transitionType, resolvedDurationMs)

        if (mode === "auto") {
          window.setTimeout(() => {
            void api.clearEventTransition?.()
          }, Math.max(120, resolvedDurationMs + 80))
        }

        return true
      } catch (error: unknown) {
        setError(error instanceof Error ? error.message : "Unexpected error")
        return false
      } finally {
        setTakeBusy(false)
      }
    },
    [api, takeBusy, setError, takeProgram]
  )

  return {
    takeBusy,
    lastTakeMode,
    isTransitioning,
    transitionFromState,
    transitionFromBlocks,
    transitionFadingOut,
    runTake,
  }
}
