"use client"

import { useCallback, useEffect, useRef } from "react"
import type useProducerRoomApi from "./useProducerRoomApi"
import type { PreviewBlock } from "./useProducerBlocks"
import type { StageState } from "./producerRoomTypes"

export default function useProducerCompositionSync({
  api,
  stageState,
  previewBlocks,
  setPreviewBlocks,
  setStageState,
  setSyncWarningText,
}: {
  api: ReturnType<typeof useProducerRoomApi>
  stageState: StageState | null
  previewBlocks: PreviewBlock[]
  setPreviewBlocks: React.Dispatch<React.SetStateAction<PreviewBlock[]>>
  setStageState: (state: StageState) => void
  setSyncWarningText: (message: string | null) => void
}) {
  const hydrated = useRef(false)
  const lastSavedJson = useRef("[]")
  const localBlocksRef = useRef(previewBlocks)
  const stageStateRef = useRef(stageState)
  const saveInFlight = useRef(false)

  useEffect(() => {
    localBlocksRef.current = previewBlocks
  }, [previewBlocks])

  useEffect(() => {
    stageStateRef.current = stageState
  }, [stageState])

  useEffect(() => {
    if (!stageState) return
    const serverBlocks = Array.isArray(stageState.preview_blocks)
      ? stageState.preview_blocks
      : []
    const serverJson = JSON.stringify(serverBlocks)

    if (!hydrated.current) {
      hydrated.current = true
      lastSavedJson.current = serverJson
      setPreviewBlocks(serverBlocks)
      return
    }

    const localJson = JSON.stringify(localBlocksRef.current)
    if (serverJson !== lastSavedJson.current && localJson === lastSavedJson.current) {
      lastSavedJson.current = serverJson
      setPreviewBlocks(serverBlocks)
    }
  }, [setPreviewBlocks, stageState])

  const flushComposition = useCallback(async (): Promise<void> => {
    const currentState = stageStateRef.current
    if (!hydrated.current || !currentState || saveInFlight.current) return

    const blocksToSave = localBlocksRef.current
    const jsonToSave = JSON.stringify(blocksToSave)
    if (jsonToSave === lastSavedJson.current) return

    saveInFlight.current = true
    let saved = false
    try {
      const data = await api.savePreviewComposition(
        blocksToSave,
        currentState.scene_version
      )
      saved = true
      lastSavedJson.current = jsonToSave
      stageStateRef.current = data.state
      setStageState(data.state)
      setSyncWarningText(null)
    } catch (error: unknown) {
      setSyncWarningText(
        error instanceof Error
          ? error.message
          : "Preview could not be synchronized."
      )
    } finally {
      saveInFlight.current = false
      if (saved && JSON.stringify(localBlocksRef.current) !== lastSavedJson.current) {
        window.setTimeout((): void => {
          void flushComposition()
        }, 0)
      }
    }
  }, [api, setStageState, setSyncWarningText])

  useEffect(() => {
    if (!hydrated.current || !stageState) return
    if (JSON.stringify(previewBlocks) === lastSavedJson.current) return
    const timeout = window.setTimeout((): void => {
      void flushComposition()
    }, 650)
    return () => window.clearTimeout(timeout)
  }, [flushComposition, previewBlocks, stageState])
}
