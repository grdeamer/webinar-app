import { useCallback, useState } from "react"
import type { PreviewBlock } from "./useProducerBlocks"
import type { StageState } from "./producerRoomTypes"

type TakeMode = "cut" | "auto"

type ProducerTransitionApi = {
  takeProgram: () => Promise<{ state?: StageState | null } | null | undefined>
  setEventTransition?: (payload: {
    active: boolean
    type?: "fade" | "warp" | "curtain" | "none"
    headline?: string
    message?: string
    durationMs?: number
  }) => Promise<unknown>
  clearEventTransition?: () => Promise<unknown>
}

export default function useProducerTransitions({
  api,
  programState,
  programBlocks,
  previewBlocks,
  setProgramState,
  setProgramBlocks,
  setError,
}: {
  api: ProducerTransitionApi
  programState: StageState | null
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

  const takeProgram = useCallback(async () => {
    const previousProgramState = programState ? { ...programState } : null
    const previousProgramBlocks = programBlocks.map((block) => ({ ...block }))

    const data = await api.takeProgram()

    setTransitionFromState(previousProgramState)
    setTransitionFromBlocks(previousProgramBlocks)
    setTransitionFadingOut(false)
    setIsTransitioning(true)

    setProgramState(data?.state ?? null)
    setProgramBlocks(previewBlocks.map((block) => ({ ...block })))

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
    }, 620)

    return data?.state ?? null
  }, [api, programState, programBlocks, previewBlocks, setProgramBlocks, setProgramState])

  const runTake = useCallback(
    async (mode: TakeMode = "cut") => {
      if (takeBusy) return

      try {
        setTakeBusy(true)
        setLastTakeMode(mode)
        setError(null)
        await api.setEventTransition?.({
          active: true,
          type: "fade",
          headline: "Stand by",
          message: "Preparing next live destination",
          durationMs: 1600,
        })
        await takeProgram()
        window.setTimeout(() => {
          void api.clearEventTransition?.()
        }, 1400)
      } catch (error: unknown) {
        setError(error instanceof Error ? error.message : "Unexpected error")
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