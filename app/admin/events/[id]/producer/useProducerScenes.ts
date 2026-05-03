import { useCallback } from "react"
import type { Dispatch, SetStateAction } from "react"
import type { SceneSummary, ScreenLayoutPreset } from "./assetDockTypes"
import type { SceneSnapshot, StageState } from "./producerRoomTypes"
import type { PreviewBlock } from "./useProducerBlocks"

export function useProducerScenes({
  scenes,
  setScenes,
  localSceneSnapshots,
  setLocalSceneSnapshots,
  deletedSceneIds,
  setDeletedSceneIds,
  selectedSceneId,
  setSelectedSceneId,
  screenLayoutPreset,
  stageState,
  previewBlocks,
  setStageState,
  setPreviewBlocks,
  setScreenLayoutPreset,
  api,
}: {
  scenes: SceneSummary[]
  setScenes: Dispatch<SetStateAction<SceneSummary[]>>
  localSceneSnapshots: SceneSnapshot[]
  setLocalSceneSnapshots: Dispatch<SetStateAction<SceneSnapshot[]>>
  deletedSceneIds: Set<string>
  setDeletedSceneIds: Dispatch<SetStateAction<Set<string>>>
  selectedSceneId: string | null
  setSelectedSceneId: (id: string | null) => void
  screenLayoutPreset: ScreenLayoutPreset
  stageState: StageState | null
  previewBlocks: PreviewBlock[]
  setStageState: (state: StageState | null) => void
  setPreviewBlocks: (blocks: PreviewBlock[]) => void
  setScreenLayoutPreset: (preset: ScreenLayoutPreset) => void
  api: {
    saveScene: (payload: any) => Promise<{ sceneId: string } | null>
    deleteScene: (sceneId: string) => Promise<void>
  }
}) {
  const saveScene = useCallback(
    async (sceneName: string) => {
      const payload = {
        id: selectedSceneId ?? undefined,
        name: sceneName || "Scene",
        stageState,
        previewBlocks,
        screenLayoutPreset,
      }

      const res = await api.saveScene(payload)
      if (!res?.sceneId) return

      const savedSceneId = String(res.sceneId)

      setLocalSceneSnapshots((prev) => {
        const next = prev.filter((s) => String(s.id) !== savedSceneId)
        next.push({
          id: savedSceneId,
          name: sceneName || "Scene",
          stageState: stageState ? { ...stageState } : null,
          previewBlocks: previewBlocks.map((b) => ({ ...b })),
          screenLayoutPreset,
        })
        return next
      })

      setScenes((prev) => {
        const next = prev.filter((s) => s.id !== savedSceneId)
        next.push({
          id: savedSceneId,
          name: sceneName || "Scene",
          screenLayoutPreset,
        })
        return next
      })

      setSelectedSceneId(savedSceneId)
    },
    [
      api,
      previewBlocks,
      screenLayoutPreset,
      selectedSceneId,
      setLocalSceneSnapshots,
      setScenes,
      setSelectedSceneId,
      stageState,
    ]
  )

  const applyScene = useCallback(
    (sceneId: string) => {
      setSelectedSceneId(sceneId)

      const local = localSceneSnapshots.find(
        (s) => String(s.id) === String(sceneId)
      )

      if (local) {
        if (local.stageState) {
          setStageState({ ...local.stageState })
        }

        if (local.previewBlocks) {
          setPreviewBlocks(local.previewBlocks.map((b) => ({ ...b })))
        }

        if (local.screenLayoutPreset) {
          setScreenLayoutPreset(local.screenLayoutPreset)
        }

        return
      }
    },
    [
      localSceneSnapshots,
      setPreviewBlocks,
      setScreenLayoutPreset,
      setSelectedSceneId,
      setStageState,
    ]
  )

  const deleteScene = useCallback(
    async (sceneId: string) => {
      await api.deleteScene(sceneId)

      setDeletedSceneIds((prev) => {
        const next = new Set(prev)
        next.add(sceneId)
        return next
      })

      setScenes((prev) => prev.filter((s) => s.id !== sceneId))

      if (selectedSceneId === sceneId) {
        setSelectedSceneId(null)
      }
    },
    [api, selectedSceneId, setDeletedSceneIds, setScenes, setSelectedSceneId]
  )

  return {
    saveScene,
    applyScene,
    deleteScene,
  }
}