import { useCallback, useMemo, useState } from "react"

import type { PreviewBlock } from "./useProducerBlocks"
import type { SceneSummary, ScreenLayoutPreset } from "./assetDockTypes"
import type { SceneSnapshot, StageState } from "./producerRoomTypes"

type ProducerRoomApi = {
  saveScene: (name: string) => Promise<{
    scene?: {
      id?: string | number
    }
  }>
  applyScene: (sceneId: string) => Promise<{
    state: StageState | null
  }>
  loadScenes: () => Promise<{
    scenes?: unknown[]
  }>
}

type RawSceneSummary = {
  id: string | number
  name?: string | null
  title?: string | null
  screenLayoutPreset?: ScreenLayoutPreset | null
  previewBlocks?: PreviewBlock[] | null
  thumbnailUrl?: string | null
}

function normalizeSceneSummary(scene: RawSceneSummary): SceneSummary {
  return {
    id: String(scene.id),
    name: scene.name ?? scene.title ?? "Scene",
    screenLayoutPreset: scene.screenLayoutPreset ?? null,
    previewBlocks: scene.previewBlocks ?? null,
    thumbnailUrl: scene.thumbnailUrl ?? null,
  }
}

export default function useProducerScenes({
  api,
  stageState,
  previewBlocks,
  screenLayoutPreset,
  setStageState,
  setPreviewBlocks,
  setSelectedBlockId,
  refreshAll,
  captureSceneThumbnail,
}: {
  api: ProducerRoomApi
  stageState: StageState | null
  previewBlocks: PreviewBlock[]
  screenLayoutPreset: ScreenLayoutPreset
  setStageState: (state: StageState | null) => void
  setPreviewBlocks: React.Dispatch<React.SetStateAction<PreviewBlock[]>>
  setSelectedBlockId: (id: string | null) => void
  refreshAll: () => Promise<void>
  captureSceneThumbnail?: () => string | null
}) {
  const [scenes, setScenes] = useState<SceneSummary[]>([])
  const [sceneName, setSceneName] = useState("")
  const [sceneBusy, setSceneBusy] = useState(false)
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null)
  const [hotkeySceneId, setHotkeySceneId] = useState<string | null>(null)
  const [deletedSceneIds, setDeletedSceneIds] = useState<Set<string>>(() => new Set())
  const [localSceneSnapshots, setLocalSceneSnapshots] = useState<SceneSnapshot[]>([])

  const selectedSceneLabel = useMemo(() => {
    if (!selectedSceneId) return null

    const localScene = localSceneSnapshots.find(
      (scene) => String(scene.id) === String(selectedSceneId)
    )

    if (localScene?.name?.trim()) return localScene.name

    const serverScene = scenes.find((scene) => scene.id === selectedSceneId)

    if (serverScene?.name?.trim()) return serverScene.name

    return "Selected scene"
  }, [selectedSceneId, localSceneSnapshots, scenes])

  const hotkeySceneLabelText = useMemo(() => {
    if (!hotkeySceneId) return null

    const scene = scenes.find((item) => String(item.id) === String(hotkeySceneId))

    return scene?.name ?? "Memory Slot"
  }, [hotkeySceneId, scenes])

  const loadScenes = useCallback(async () => {
    const data = await api.loadScenes()

    const nextScenes: SceneSummary[] = Array.isArray(data?.scenes)
      ? data.scenes.map((scene) => normalizeSceneSummary(scene as RawSceneSummary))
      : []

    setScenes(nextScenes.filter((scene) => !deletedSceneIds.has(scene.id)))
  }, [api, deletedSceneIds])

  async function saveScene() {
    if (!sceneName.trim() && !selectedSceneId) {
      return
    }

    try {
      setSceneBusy(true)

      const targetId = selectedSceneId

      const data = await api.saveScene(sceneName || "Updated Scene")

      const savedSceneId = String(targetId ?? data?.scene?.id ?? crypto.randomUUID())
      const thumbnailUrl = captureSceneThumbnail?.() ?? null

      setLocalSceneSnapshots((prev) => {
        const next = prev.filter((s) => String(s.id) !== savedSceneId)

        next.push({
          id: savedSceneId,
          name: sceneName || prev.find((s) => String(s.id) === savedSceneId)?.name || "Scene",
          stageState: stageState ? { ...stageState } : null,
          previewBlocks: previewBlocks.map((b) => ({ ...b })),
          screenLayoutPreset,
        })

        return next
      })

      setScenes((prev) => {
        const existing = prev.find((scene) => String(scene.id) === savedSceneId)

        const next = prev.filter((scene) => String(scene.id) !== savedSceneId)

        next.push({
          id: savedSceneId,
          name: sceneName || existing?.name || "Scene",
          screenLayoutPreset,
          previewBlocks: previewBlocks.map((block) => ({ ...block })),
          thumbnailUrl,
        })

        return next
      })

      setSceneName("")
      setSelectedSceneId(null)

      await loadScenes()
    } finally {
      setSceneBusy(false)
    }
  }

  async function applyScene(sceneId: string) {
    try {
      setSelectedSceneId(String(sceneId))
      setSceneBusy(true)

      const data = await api.applyScene(sceneId)

      setStageState(data.state)

      await refreshAll()

      const localSnapshot = localSceneSnapshots.find(
        (s) => String(s.id) === String(sceneId)
      )

      if (localSnapshot) {
        const preset = localSnapshot.screenLayoutPreset ?? "classic"

        setPreviewBlocks(localSnapshot.previewBlocks.map((b) => ({ ...b })))

        window.setTimeout(() => {
          setSelectedBlockId(null)
        }, 100)

        window.setTimeout(() => {
          // restore preset after render
        }, 150)

        void preset
      }
    } finally {
      setSceneBusy(false)
    }
  }

  async function deleteScene(sceneId: string) {
    try {
      setSceneBusy(true)

      setDeletedSceneIds((prev) => {
        const next = new Set(prev)

        next.add(String(sceneId))

        return next
      })

      setLocalSceneSnapshots((prev) =>
        prev.filter((scene) => String(scene.id) !== String(sceneId))
      )

      setScenes((prev) =>
        prev.filter((scene) => String(scene.id) !== String(sceneId))
      )
    } finally {
      setSceneBusy(false)
    }
  }

  function startNewScene() {
    setSelectedSceneId(null)
    setSceneName("")
  }

  function flashSceneHotkey(sceneId: string) {
    setHotkeySceneId(sceneId)

    window.setTimeout(() => {
      setHotkeySceneId((current) =>
        current === sceneId ? null : current
      )
    }, 1600)
  }

  return {
    scenes,
    setScenes,
    sceneName,
    setSceneName,
    sceneBusy,
    selectedSceneId,
    setSelectedSceneId,
    hotkeySceneId,
    localSceneSnapshots,
    selectedSceneLabel,
    hotkeySceneLabelText,
    loadScenes,
    saveScene,
    applyScene,
    deleteScene,
    startNewScene,
    flashSceneHotkey,
  }
}