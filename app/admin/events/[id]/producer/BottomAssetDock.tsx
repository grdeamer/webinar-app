import {
  MediaOverviewWorkspace,
  MediaAssetsWorkspace,
  MediaTakeWorkspace,
  MediaRoutingWorkspace
} from "./BottomAssetDockWorkspaces"
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type JSX
} from "react"
import {
  createClient
} from "@/lib/supabase/client"
type MediaOrchestratorTab = "overview" | "assets" | "routing" | "take"
import {
  type DockAssetRecord,
  type SceneSummary
} from "./assetDockTypes"
import {
  type BroadcastAssetTelemetry,
  type BroadcastAssetType,
  type BroadcastAssetState,
  ConsolePanel,
  PreparedSourceImage
} from "./BottomAssetDockAssetRenderers"
export type RecordingStatus = "idle" | "armed" | "starting" | "recording" | "stopped"
import {
  CircleDot,
  Image,
  Layers3,
  LayoutGrid,
  List,
  Music2,
  Radio,
  Trash2,
  Video,
  Volume2
} from "lucide-react"
import type { ProducerWorkspaceMode } from "./ProducerModeBar"
import type { PreviewBlock } from "./useProducerBlocks"
import {
  buildProducerAssetUrl
} from "./producerAssetUrls"
import {
  type MediaAssetEditDraft,
  type MediaAssetRuntimeState,
  type RecordingSession,
  type RecordingStatusRow,
  type SourceLibraryView,
  type UtilityPanel,
  type ProductionDrawerTab,
  type MixerChannelKey,
  SourceLibraryCard,
  CompactAudioMeter,
  UtilityButton,
  UtilityOverlay,
  formatRecordingDuration
} from "./BottomAssetDockWorkspaceParts"
import ProductionControlsDrawer from "./ProductionControlsDrawer"
import BroadcastDestinationsPanel from "./BroadcastDestinationsPanel"
function formatFileSize(bytes: number): string {
  if (bytes <= 0) return "0 KB"
  const units = ["B", "KB", "MB", "GB"]
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  )
  const value = bytes / 1024 ** index
  return `${value >= 10 || index === 0 ? Math.round(value) : value.toFixed(1)} ${units[index]}`
}
function parseRuntimeDurationSeconds(duration: string): number | null {
  if (!duration || duration === "—" || duration === "LIVE" || duration === "PDF") return null
  const parts = duration.split(":").map((part) => Number(part))
  if (parts.some((part) => Number.isNaN(part))) return null
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  return null
}
function formatRuntimeClock(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds))
  const minutes = Math.floor(safeSeconds / 60)
  const remainingSeconds = safeSeconds % 60
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`
}
function blockToBroadcastAsset(item: DockAssetRecord, fallbackLabel: string, index: number): BroadcastAssetTelemetry {
  const sourceType = "type" in item && typeof item.type === "string" ? item.type : "video"
  const type: BroadcastAssetType =
    sourceType === "image" || sourceType === "pdf"
      ? "graphic"
      : sourceType === "audio"
        ? "audio"
        : "video"
  const state: BroadcastAssetState = index === 0 ? "CUED" : index === 1 ? "READY" : index === 2 ? "SAFE" : "STANDBY"
  return {
    label: item.label || fallbackLabel,
    type,
    state,
    duration: type === "graphic" ? "16:9" : index === 0 ? "00:45" : index === 1 ? "01:12" : "—",
    meta: type === "graphic" ? "Graphic · 1920×1080" : type === "audio" ? "Audio · Stereo" : "Video · 1080p",
    route: index === 0 ? "PVW" : index === 1 ? "PGM Safe" : "Standby",
    lastPlayed: index === 0 ? "Not played" : index === 1 ? "12m ago" : "—",
    linkedScene: index === 0 ? "Linked Scene" : index === 1 ? "Keynote" : "No link",
    imageUrl: "src" in item && typeof item.src === "string" ? item.src : null,
    audioEmbedded: type === "video",
    programSafe: index <= 2,
    destination: index === 0 ? "PREVIEW" : index === 1 ? "PROGRAM" : "STANDBY",
    takeSafe: index <= 2,
    cueOrder: index + 1,
    progress: index === 1 ? 72 : index === 0 ? 24 : 0,
    scheduledIn: index === 0 ? "Next" : index === 1 ? "On air" : index === 2 ? "In 12m" : "Unscheduled",
    resetBehavior: index === 1 ? "Auto Reset" : "Manual",
    cacheState: index === 0 ? "HOT" : index === 1 ? "WARM" : "COLD",
    codecState: sourceType === "live" ? "LIVE" : index === 2 ? "CHECK" : "OK",
    routeLock: index <= 1,
    hoverHint: index === 0 ? "Ready for preview scrub" : index === 1 ? "Route locked to program" : "Manual verification advised",
    takeCompatibility: index === 2 ? "Needs Check" : "Clean",
    segment: index === 0 ? "Open" : index === 1 ? "Keynote" : index === 2 ? "Break" : "Manual",
    trigger: index === 0 ? "Next TAKE" : index === 1 ? "Scene Link" : "Operator",
  }
}
export default function BottomAssetDock({
  workspaceMode,
  scenes,
  selectedSceneId,
  programSceneId,
  hotkeySceneId,
  previewBlocks,
  localMicLevel,
  eventId,
  recordingRoomName,
  onAddScene,
  onSaveScene,
  onAddMediaAssetToPreview,
  onUploadPdf,
  onSendSlideToPreview,
  onTakeSlide,
  onApplyScene,
  onDoubleClickScene,
  onDeleteScene,
  onRenameScene,
  previewProgramDifferent,
  takeBusy,
  onTakeProgram,
  onRecordingHealthChange,
}: {
  workspaceMode: ProducerWorkspaceMode
  scenes: SceneSummary[]
  selectedSceneId: string | null
  programSceneId: string | null
  programSlideLabel: string | null
  hotkeySceneId: string | null
  previewBlocks: PreviewBlock[]
  localMicLevel?: number
  eventId: string
  recordingRoomName: string
  slideDeckName?: string | null
  slideCount?: number
  onAddScene?: () => void
  onSaveScene?: () => void
  onAddMediaAssetToPreview?: (block: PreviewBlock) => void
  onUploadPdf?: () => void
  onSendSlideToPreview?: (slideIndex: number) => void
  onTakeSlide?: (slideIndex: number) => void
  onApplyScene?: (sceneId: string) => void
  onDoubleClickScene?: (sceneId: string) => void
  onDeleteScene?: (sceneId: string) => void
  onRenameScene?: (sceneId: string, nextName: string) => void
  previewProgramDifferent: boolean
  takeBusy: boolean
  onTakeProgram?: (mode: "cut" | "auto") => Promise<boolean>
  onRecordingHealthChange?: (status: RecordingStatus, error: string | null) => void
}): JSX.Element {
  const [activeUtilityPanel, setActiveUtilityPanel] = useState<UtilityPanel | null>(null)
  const [productionDrawerTab, setProductionDrawerTab] = useState<ProductionDrawerTab | null>(null)
  const [expandedMediaOpen, setExpandedMediaOpen] = useState(false)
  const [sourceLibraryView, setSourceLibraryView] = useState<SourceLibraryView>("blocks")
  const mediaImportInputRef = useRef<HTMLInputElement | null>(null)
  const [importedMediaAssets, setImportedMediaAssets] = useState<BroadcastAssetTelemetry[]>([])
  const [mediaImportBusy, setMediaImportBusy] = useState(false)
  const [mediaImportError, setMediaImportError] = useState<string | null>(null)
  const [deletingMediaAssetId, setDeletingMediaAssetId] = useState<string | null>(null)
  const [activeMediaOrchestratorTab, setActiveMediaOrchestratorTab] = useState<MediaOrchestratorTab>("overview")
  const [selectedMediaAssetLabel, setSelectedMediaAssetLabel] = useState<string | null>(null)
  const [editingSceneId, setEditingSceneId] = useState<string | null>(null)
  const [sceneNameDraft, setSceneNameDraft] = useState("")
  const [previewMediaAssetLabel, setPreviewMediaAssetLabel] = useState<string | null>(null)
  const [programMediaAssetLabel, setProgramMediaAssetLabel] = useState<string | null>(null)
  const [takeFlashAssetLabel, setTakeFlashAssetLabel] = useState<string | null>(null)
  const [takeFlashProgramLabel, setTakeFlashProgramLabel] = useState<string | null>(null)
  const [mediaRuntimeByLabel, setMediaRuntimeByLabel] = useState<Record<string, MediaAssetRuntimeState>>({})
  const [runtimePaused, setRuntimePaused] = useState(false)
  const [mediaRuntimeNowMs, setMediaRuntimeNowMs] = useState(Date.now())
  useEffect(() => {
    const savedView = window.localStorage.getItem("jupiter:producer-source-library-view")
    if (savedView === "icons" || savedView === "list" || savedView === "blocks") {
      setSourceLibraryView(savedView)
    }
  }, [])
  const updateSourceLibraryView = useCallback((view: SourceLibraryView) => {
    setSourceLibraryView(view)
    window.localStorage.setItem("jupiter:producer-source-library-view", view)
  }, [])
  useEffect(() => {
    let cancelled = false
    async function loadSavedAssets(): Promise<void> {
      const response = await fetch(`/api/admin/events/${eventId}/live/assets/commit`, {
        cache: "no-store",
      })
      const payload = await response.json().catch((): null => null)
      if (!response.ok || cancelled) return
      const savedAssets: BroadcastAssetTelemetry[] = (payload?.assets ?? []).map(
        (asset: {
          id: string
          asset_type: "image" | "video" | "pdf"
          label: string
          storage_path: string
          signed_url?: string | null
          public_url?: string | null
          mime_type?: string | null
          byte_size?: number | null
        }, index: number) => ({
          id: String(asset.id),
          label: asset.label || `Saved source ${index + 1}`,
          type: asset.asset_type === "video" ? "video" : "graphic",
          state: "PRELOADED",
          duration: asset.asset_type === "pdf" ? "PDF" : asset.asset_type === "image" ? "16:9" : "—",
          meta: formatFileSize(Number(asset.byte_size || 0)),
          route: "Saved",
          lastPlayed: "Not Played",
          linkedScene: "Unassigned",
          imageUrl: asset.mime_type?.startsWith("image/")
            ? buildProducerAssetUrl(eventId, asset.storage_path)
            : null,
          storagePath: asset.storage_path,
          audioEmbedded: asset.asset_type === "video",
          destination: "STANDBY",
          takeSafe: true,
          cueOrder: index + 1,
          progress: 0,
          scheduledIn: "Saved",
          resetBehavior: "Manual",
          cacheState: "HOT",
          codecState: "OK",
          routeLock: false,
          hoverHint: "Saved to the event source library",
          takeCompatibility: "Clean",
          segment: "Imported",
          trigger: "Manual",
        }),
      )
      setImportedMediaAssets((current) => {
        const currentIds = new Set(current.map((asset) => asset.id).filter(Boolean))
        return [...current, ...savedAssets.filter((asset) => !currentIds.has(asset.id))]
      })
    }
    void loadSavedAssets()
    return () => {
      cancelled = true
    }
  }, [eventId])
useEffect(() => {
  if (!programMediaAssetLabel) return
  const interval = window.setInterval(() => {
    setMediaRuntimeNowMs(Date.now())
  }, 500)
  return () => window.clearInterval(interval)
}, [programMediaAssetLabel])
  const [editingMediaAssetLabel, setEditingMediaAssetLabel] = useState<string | null>(null)
const [mediaAssetEditDraft, setMediaAssetEditDraft] = useState<MediaAssetEditDraft>({
  label: "",
  linkedScene: "",
  segment: "",
  trigger: "",
})
  const [takeFlashActive, setTakeFlashActive] = useState(false)
  const [dockTakeBusy, setDockTakeBusy] = useState(false)
function handleSendSelectedMediaAssetToPreview(): void {
  const targetLabel =
    selectedMediaAsset?.label ??
    selectedMediaAssetLabel ??
    orchestratedMediaRows[0]?.label ??
    mediaRows[0]?.label ??
    null
  if (!targetLabel) return
  setSelectedMediaAssetLabel(targetLabel)
  handleSelectMediaAssetForPreview(targetLabel)
}
async function handleTakeAsset(): Promise<void> {
  if (!previewProgramDifferent || takeBusy || dockTakeBusy) return
  const nextProgramLabel = previewMediaAssetLabel
  setDockTakeBusy(true)
  try {
    await onTakeProgram?.("auto")
    if (!nextProgramLabel) return
setTakeFlashAssetLabel(nextProgramLabel)
setTakeFlashProgramLabel(nextProgramLabel)
window.setTimeout(() => {
  setTakeFlashAssetLabel(null)
}, 320)
window.setTimeout(() => {
  setTakeFlashProgramLabel(null)
}, 650)
  setProgramMediaAssetLabel(nextProgramLabel)
  setPreviewMediaAssetLabel(null)
  setRuntimePaused(false)
  setMediaRuntimeByLabel((current) => ({
    ...current,
    [nextProgramLabel]: {
      isPlaying: true,
      startedAtMs: Date.now(),
      elapsedSeconds: current[nextProgramLabel]?.elapsedSeconds ?? 0,
    },
  }))
  } finally {
    setDockTakeBusy(false)
  }
}
function handleResetProgramRuntime(): void {
  if (!programMediaAssetLabel) return
  const targetLabel = programMediaAssetLabel
  setRuntimePaused(false)
  setMediaRuntimeByLabel((current) => ({
    ...current,
    [targetLabel]: {
      isPlaying: false,
      startedAtMs: null,
      elapsedSeconds: 0,
    },
  }))
}
function handleSelectMediaAssetForPreview(label: string): void {
  const targetAsset =
    orchestratedMediaRows.find((asset) => asset.label === label) ??
    mediaRows.find((asset) => asset.label === label) ??
    null
  setPreviewMediaAssetLabel(label)
  if (programMediaAssetLabel === label) {
    setProgramMediaAssetLabel(null)
  }
  if (targetAsset && onAddMediaAssetToPreview) {
    const nextZIndex =
      previewBlocks.reduce((highest, block) => Math.max(highest, block.zIndex ?? 0), 0) + 1
    const blockType: PreviewBlock["type"] =
      targetAsset.type === "video" ? "video" : "image"
    onAddMediaAssetToPreview({
      id: `media-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: blockType,
      label: targetAsset.label,
      src: targetAsset.imageUrl ?? "",
      assetId: targetAsset.id ?? null,
      storagePath: targetAsset.storagePath ?? null,
      x: 12,
      y: 12,
      width: 76,
      height: 42.75,
      opacity: 1,
      zIndex: nextZIndex,
      groupId: "source-route",
    })
  }
  setRuntimePaused(false)
}
  const [preloadedAssetLabels, setPreloadedAssetLabels] = useState<string[]>([])
  function handlePreloadAsset(): void {
    if (!selectedMediaAssetLabel) return
    setPreloadedAssetLabels((current) => {
      if (current.includes(selectedMediaAssetLabel)) {
        return current
      }
      return [...current, selectedMediaAssetLabel]
    })
  }
  function handleLockRoute(): void {
    if (!selectedMediaAssetLabel) return
    setPreviewMediaAssetLabel(selectedMediaAssetLabel)
  }
  function handleRehearseAsset(): void {
  if (!selectedMediaAssetLabel) return
  setPreviewMediaAssetLabel(selectedMediaAssetLabel)
  setPreloadedAssetLabels((current) => {
    if (current.includes(selectedMediaAssetLabel)) {
      return current
    }
    return [...current, selectedMediaAssetLabel]
  })
}
function handleResetMediaOrchestration(): void {
  setSelectedMediaAssetLabel(null)
  setPreviewMediaAssetLabel(null)
  setProgramMediaAssetLabel(null)
  setPreloadedAssetLabels([])
  setTakeFlashActive(false)
  setMediaRuntimeByLabel({})
  setMediaRuntimeByLabel({})
setRuntimePaused(false)
}
function createImportedMediaAsset(
  file: File,
  index: number,
  persisted?: { id: string; url: string; path: string },
): BroadcastAssetTelemetry {
  const importedAt = new Date().toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  })
  const isImage = file.type.startsWith("image/")
  const isAudio = file.type.startsWith("audio/")
  const isVideo = file.type.startsWith("video/")
  const isPdf =
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf")
  const type: BroadcastAssetType = isAudio
    ? "audio"
    : isImage || isPdf
      ? "graphic"
      : isVideo
        ? "video"
        : "graphic"
  return {
    id: persisted?.id,
    label:
      file.name.replace(/\.[^/.]+$/, "") ||
      `Imported Asset ${index + 1}`,
    type,
    state: "PRELOADED",
    duration: type === "graphic" ? (isPdf ? "PDF" : "16:9") : "—",
    meta: `${formatFileSize(file.size)}`,
    route: "Imported",
    lastPlayed: "Not Played",
    linkedScene: "Unassigned",
    imageUrl: isImage ? persisted?.url ?? URL.createObjectURL(file) : null,
    storagePath: persisted?.path ?? null,
    audioEmbedded: type === "video",
    destination: "STANDBY",
    takeSafe: true,
    cueOrder: index + 1,
    progress: 0,
    scheduledIn: "Imported",
    resetBehavior: "Manual",
    cacheState: "HOT",
    codecState: "OK",
    routeLock: false,
    hoverHint: `Imported at ${importedAt}`,
    takeCompatibility: "Clean",
    segment: "Imported",
    trigger: "Manual",
  }
}
async function handleImportMediaFiles(
  event: ChangeEvent<HTMLInputElement>,
): Promise<void> {
  const files = Array.from(event.target.files ?? [])
  if (!files.length) return
  event.target.value = ""
  setMediaImportBusy(true)
  setMediaImportError(null)
  setActiveMediaOrchestratorTab("assets")
  setExpandedMediaOpen(true)
  try {
    const supabase = createClient()
    const persistedAssets: BroadcastAssetTelemetry[] = []
    for (const [index, file] of files.entries()) {
      const assetType = file.type.startsWith("video/")
        ? "video"
        : file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
          ? "pdf"
          : "image"
      const prepareRes = await fetch(`/api/admin/events/${eventId}/live/assets/prepare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, mimeType: file.type, byteSize: file.size }),
      })
      const prepared = await prepareRes.json().catch((): null => null)
      if (!prepareRes.ok) throw new Error(prepared?.error || `Could not prepare ${file.name}`)
      const { error: uploadError } = await supabase.storage
        .from(prepared.bucket)
        .uploadToSignedUrl(prepared.path, prepared.token, file, { contentType: file.type })
      if (uploadError) throw uploadError
      const label = file.name.replace(/\.[^/.]+$/, "") || `Imported Asset ${index + 1}`
      const commitRes = await fetch(`/api/admin/events/${eventId}/live/assets/commit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: prepared.path,
          label,
          mimeType: file.type,
          byteSize: file.size,
          assetType,
        }),
      })
      const committed = await commitRes.json().catch((): null => null)
      if (!commitRes.ok) throw new Error(committed?.error || `Could not save ${file.name}`)
      persistedAssets.push(createImportedMediaAsset(file, index, {
        id: String(committed.asset.id),
        url: buildProducerAssetUrl(eventId, String(committed.asset.storage_path)),
        path: String(committed.asset.storage_path),
      }))
    }
    setImportedMediaAssets((current) => [...persistedAssets, ...current])
  } catch (error) {
    setMediaImportError(error instanceof Error ? error.message : "The source could not be imported")
  } finally {
    setMediaImportBusy(false)
  }
}
async function handleDeleteImportedAsset(label: string): Promise<void> {
  const removedAsset = importedMediaAssets.find((asset) => asset.label === label)
  if (!removedAsset) return
  const confirmed = window.confirm(
    `Delete “${label}” permanently from this event's source library? This cannot be undone.`,
  )
  if (!confirmed) return
  setMediaImportError(null)
  setDeletingMediaAssetId(removedAsset.id ?? label)
  try {
    if (removedAsset.id) {
      const response = await fetch(`/api/admin/events/${eventId}/live/assets/commit`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ assetId: removedAsset.id }),
      })
      const payload = await response.json().catch((): null => null)
      if (!response.ok) {
        throw new Error(payload?.error || "The source could not be deleted")
      }
    }
  setImportedMediaAssets((current) => {
    if (removedAsset?.imageUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(removedAsset.imageUrl)
    }
    return current.filter((asset) => asset.label !== label)
  })
  setPreloadedAssetLabels((current) =>
    current.filter((assetLabel) => assetLabel !== label)
  )
  if (selectedMediaAssetLabel === label) setSelectedMediaAssetLabel(null)
  if (previewMediaAssetLabel === label) setPreviewMediaAssetLabel(null)
  if (programMediaAssetLabel === label) setProgramMediaAssetLabel(null)
  } catch (error) {
    setMediaImportError(error instanceof Error ? error.message : "The source could not be deleted")
  } finally {
    setDeletingMediaAssetId(null)
  }
}
function handleRenameImportedAsset(oldLabel: string, requestedLabel: string): void {
  const baseLabel = requestedLabel.trim()
  if (!baseLabel || baseLabel === oldLabel) return
  let nextLabel = baseLabel
  let copyIndex = 2
  while (
    mediaRows.some(
      (asset) => asset.label === nextLabel && asset.label !== oldLabel,
    )
  ) {
    nextLabel = `${baseLabel} ${copyIndex}`
    copyIndex += 1
  }
  setImportedMediaAssets((current) =>
    current.map((asset) =>
      asset.label === oldLabel
        ? {
            ...asset,
            label: nextLabel,
            hoverHint: `Imported asset renamed from ${oldLabel}`,
          }
        : asset,
    ),
  )
  setPreloadedAssetLabels((current) =>
    current.map((label) => (label === oldLabel ? nextLabel : label)),
  )
  if (selectedMediaAssetLabel === oldLabel) setSelectedMediaAssetLabel(nextLabel)
  if (previewMediaAssetLabel === oldLabel) setPreviewMediaAssetLabel(nextLabel)
  if (programMediaAssetLabel === oldLabel) setProgramMediaAssetLabel(nextLabel)
}
function handleClearImportedAssets(): void {
  importedMediaAssets.forEach((asset) => {
    if (asset.imageUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(asset.imageUrl)
    }
  })
  const importedLabels = new Set(importedMediaAssets.map((asset) => asset.label))
  setImportedMediaAssets([])
  setPreloadedAssetLabels((current) =>
    current.filter((assetLabel) => !importedLabels.has(assetLabel))
  )
  if (selectedMediaAssetLabel && importedLabels.has(selectedMediaAssetLabel)) {
    setSelectedMediaAssetLabel(null)
  }
  if (previewMediaAssetLabel && importedLabels.has(previewMediaAssetLabel)) {
    setPreviewMediaAssetLabel(null)
  }
  if (programMediaAssetLabel && importedLabels.has(programMediaAssetLabel)) {
    setProgramMediaAssetLabel(null)
  }
}
  const [soloChannel, setSoloChannel] = useState<MixerChannelKey | null>(null)
  const [mutedChannels, setMutedChannels] = useState<Record<MixerChannelKey, boolean>>({
    Program: false,
    Stage: false,
    Music: false,
    Mics: false,
    SFX: false,
    Audience: false,
  })
  const [recordingStatus, setRecordingStatus] = useState<RecordingStatus>("idle")
  const [recordingStartedAt, setRecordingStartedAt] = useState<number | null>(null)
  const [recordingNow, setRecordingNow] = useState(Date.now())
  const [recordings, setRecordings] = useState<RecordingSession[]>([])
  const [recordingSource, setRecordingSource] = useState("Program Feed")
  const [recordingDestination, setRecordingDestination] = useState("Jupiter Cloud")
  const [recordingQuality, setRecordingQuality] = useState("1080p Standard")
  const [activeEgressId, setActiveEgressId] = useState<string | null>(null)
  const [recordingError, setRecordingError] = useState<string | null>(null)
  useEffect(() => {
    onRecordingHealthChange?.(recordingStatus, recordingError)
  }, [onRecordingHealthChange, recordingError, recordingStatus])
  useEffect(() => {
    let cancelled = false
    async function restoreRecordingState(): Promise<void> {
      try {
        const response = await fetch("/api/livekit/recording/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventId }),
        })
        const data = await response.json().catch((): null => null)
        if (!response.ok || !data?.ok) {
          throw new Error(data?.error || "Recording state could not be restored")
        }
        if (cancelled) return
        const history: RecordingStatusRow[] = Array.isArray(data.recordings)
          ? data.recordings
          : []
        setRecordings(history.map((recording, index): RecordingSession => {
          const startedAt = String(recording.started_at || new Date().toISOString())
          const endedAt = recording.ended_at ? String(recording.ended_at) : null
          const durationSeconds = endedAt
            ? Math.max(0, Math.floor((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000))
            : 0
          const status = String(recording.status || "")
          return {
            id: String(recording.id),
            label: `Program Recording ${history.length - index}`,
            startedAt,
            endedAt,
            durationSeconds,
            source: String(recording.source || "Program Feed"),
            destination: String(recording.destination || "Jupiter Cloud"),
            quality: String(recording.quality || "1080p Standard"),
            egressId: recording.egress_id ? String(recording.egress_id) : null,
            file: recording.file_name ? String(recording.file_name) : null,
            location: recording.file_location ? String(recording.file_location) : null,
            size: recording.file_size == null ? null : String(recording.file_size),
            status: status === "complete"
              ? "ready"
              : status === "starting" || status === "active" || status === "ending"
                ? "recording"
                : "failed",
          }
        }))
        if (data.active && data.egressId) {
          const active = history.find((recording) => recording.egress_id === data.egressId)
          const startedAt = active?.started_at
            ? new Date(active.started_at).getTime()
            : Date.now()
          setActiveEgressId(String(data.egressId))
          setRecordingStartedAt(startedAt)
          setRecordingNow(Date.now())
          setRecordingStatus("recording")
        }
      } catch (error) {
        if (!cancelled) {
          setRecordingError(error instanceof Error ? error.message : "Recording state could not be restored")
        }
      }
    }
    void restoreRecordingState()
    return () => {
      cancelled = true
    }
  }, [eventId])
  function isImportedMediaAsset(label: string): boolean {
  return importedMediaAssets.some((asset) => asset.label === label)
}
function handleOpenMediaAssetEdit(label: string): void {
  const asset = importedMediaAssets.find((item) => item.label === label)
  if (!asset) return
  setEditingMediaAssetLabel(label)
  setMediaAssetEditDraft({
    label: asset.label,
    linkedScene: asset.linkedScene,
    segment: asset.segment ?? "Imported",
    trigger: asset.trigger ?? "Manual",
  })
}
function handleCloseMediaAssetEdit(): void {
  setEditingMediaAssetLabel(null)
  setMediaAssetEditDraft({
    label: "",
    linkedScene: "",
    segment: "",
    trigger: "",
  })
}
function handleSaveMediaAssetEdit(): void {
  if (!editingMediaAssetLabel) return
  const baseLabel = mediaAssetEditDraft.label.trim() || editingMediaAssetLabel
  let nextLabel = baseLabel
  let copyIndex = 2
  while (
    mediaRows.some(
      (asset) =>
        asset.label === nextLabel &&
        asset.label !== editingMediaAssetLabel
    )
  ) {
    nextLabel = `${baseLabel} ${copyIndex}`
    copyIndex += 1
  }
  setImportedMediaAssets((current) =>
    current.map((asset) =>
      asset.label === editingMediaAssetLabel
        ? {
            ...asset,
            label: nextLabel,
            linkedScene: mediaAssetEditDraft.linkedScene.trim() || "Unassigned",
            segment: mediaAssetEditDraft.segment.trim() || "Imported",
            trigger: mediaAssetEditDraft.trigger.trim() || "Manual",
            hoverHint: `Imported asset updated for ${mediaAssetEditDraft.trigger.trim() || "manual"} playback`,
          }
        : asset
    )
  )
  setPreloadedAssetLabels((current) =>
    current.map((label) => (label === editingMediaAssetLabel ? nextLabel : label))
  )
  if (selectedMediaAssetLabel === editingMediaAssetLabel) setSelectedMediaAssetLabel(nextLabel)
  if (previewMediaAssetLabel === editingMediaAssetLabel) setPreviewMediaAssetLabel(nextLabel)
  if (programMediaAssetLabel === editingMediaAssetLabel) setProgramMediaAssetLabel(nextLabel)
  handleCloseMediaAssetEdit()
}
function handleDeleteMediaAssetFromEdit(): void {
  if (!editingMediaAssetLabel) return
  handleDeleteImportedAsset(editingMediaAssetLabel)
  handleCloseMediaAssetEdit()
}
  function toggleSoloChannel(channel: MixerChannelKey): void {
    setSoloChannel((current) => (current === channel ? null : channel))
  }
  function toggleMutedChannel(channel: MixerChannelKey): void {
    setMutedChannels((current) => ({
      ...current,
      [channel]: !current[channel],
    }))
  }
  useEffect(() => {
    if (recordingStatus !== "recording") return
    const id = window.setInterval(() => {
      setRecordingNow(Date.now())
    }, 1000)
    return () => window.clearInterval(id)
  }, [recordingStatus])
  const recordingElapsedSeconds = recordingStartedAt
    ? Math.floor((recordingNow - recordingStartedAt) / 1000)
    : 0
  function armRecording(): void {
    if (recordingStatus === "recording" || recordingStatus === "starting") return
    setRecordingStatus("armed")
    setRecordingStartedAt(null)
  }
  async function startRecording(): Promise<void> {
    if (recordingStatus !== "armed") return
    setRecordingError(null)
    setRecordingStatus("starting")
    try {
      const response = await fetch("/api/livekit/recording/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          eventId,
          roomName: recordingRoomName,
          source: recordingSource,
          destination: recordingDestination,
          quality: recordingQuality,
        }),
      })
      const data = await response.json()
      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Failed to start recording")
      }
      const startedAt = Date.now()
      setActiveEgressId(data.egressId ?? null)
      setRecordingStartedAt(startedAt)
      setRecordingNow(startedAt)
      setRecordingStatus("recording")
      setRecordings((current) => [
        {
          id: `active-${startedAt}`,
          label: `Program Recording ${current.length + 1}`,
          startedAt: new Date(startedAt).toISOString(),
          endedAt: null,
          durationSeconds: 0,
          source: recordingSource,
          destination: recordingDestination,
          quality: recordingQuality,
          egressId: data.egressId ?? null,
          file: data.file ?? null,
          location: null,
          size: null,
          status: "recording",
        },
        ...current,
      ])
    } catch (error) {
      setRecordingError(error instanceof Error ? error.message : "Unknown recording start error")
      setRecordingStatus("idle")
    }
  }
  async function pollRecordingStatus(egressId: string): Promise<void> {
    const maxAttempts = 20
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      await new Promise((resolve) => window.setTimeout(resolve, 2000))
      const response = await fetch("/api/livekit/recording/status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ eventId, egressId }),
      })
      const data = await response.json()
      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Failed to check recording status")
      }
      if (!data.terminal) continue
      const finalStatus = Number(data.status)
      const ready = finalStatus === 3 && data.size !== "0"
      setRecordings((current) =>
        current.map((recording) => {
          if (recording.egressId !== egressId) return recording
          return {
            ...recording,
            file: data.file ?? recording.file ?? null,
            location: data.location ?? null,
            size: data.size ?? null,
            status: ready ? "ready" : "failed",
          }
        })
      )
      if (!ready) {
        setRecordingError(data.error ?? "Recording finalized without a usable file")
      }
      return
    }
    setRecordingError("Recording is still finalizing. Check S3 or LiveKit egress status again shortly.")
  }
  async function stopRecording(): Promise<void> {
    if (recordingStatus !== "recording" || !recordingStartedAt) return
    if (!window.confirm("Stop the active recording? Jupiter will finalize and upload the captured file.")) return
    setRecordingError(null)
    try {
      const stoppedEgressId = activeEgressId
      if (stoppedEgressId) {
        const response = await fetch("/api/livekit/recording/stop", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            eventId,
            egressId: stoppedEgressId,
          }),
        })
        const data = await response.json()
        if (!response.ok || !data.ok) {
          throw new Error(data.error ?? "Failed to stop recording")
        }
      }
      const endedAt = Date.now()
      const durationSeconds = Math.max(1, Math.floor((endedAt - recordingStartedAt) / 1000))
      setRecordings((current) =>
        current.map((recording) => {
          if (recording.status !== "recording") return recording
          return {
            ...recording,
            endedAt: new Date(endedAt).toISOString(),
            durationSeconds,
            status: "processing",
          }
        })
      )
      setRecordingStatus("stopped")
      setRecordingStartedAt(null)
      setActiveEgressId(null)
      if (stoppedEgressId) {
        void pollRecordingStatus(stoppedEgressId).catch((error) => {
          setRecordingError(error instanceof Error ? error.message : "Unknown recording finalization error")
        })
      }
    } catch (error) {
      setRecordingError(error instanceof Error ? error.message : "Unknown recording stop error")
    }
  }
  const [smoothedMicLevel, setSmoothedMicLevel] = useState(0)
  const rawMicLevel = localMicLevel ?? 0
  const normalizedMicLevel = rawMicLevel <= 1 ? rawMicLevel * 100 : rawMicLevel
  const incomingMicLevel = Math.max(0, Math.min(100, normalizedMicLevel))
  useEffect(() => {
    setSmoothedMicLevel((current) => {
      const next = incomingMicLevel > current
        ? current + (incomingMicLevel - current) * 0.72
        : current + (incomingMicLevel - current) * 0.28
      return Math.abs(next - current) < 0.4 ? incomingMicLevel : next
    })
  }, [incomingMicLevel])
  const micLevelPercent = Math.round(smoothedMicLevel)
  const programLevel = Math.max(2, Math.min(96, Math.round(micLevelPercent * 0.92 + 4)))
  const stageLevel = Math.max(2, Math.min(92, Math.round(micLevelPercent * 0.78 + 3)))
  const musicLevel = Math.max(2, Math.min(84, Math.round(micLevelPercent * 0.46)))
  const sfxLevel = Math.max(2, Math.min(72, Math.round(micLevelPercent * 0.34)))
  const audienceLevel = Math.max(2, Math.min(62, Math.round(micLevelPercent * 0.24)))
  const media = previewBlocks.filter(
    (block) => block.type === "video" || block.type === "image" || block.type === "pdf"
  )
const mediaItems: DockAssetRecord[] = media.map((block) => ({ ...block, category: "media" }))
  const activeSceneIds = new Set([selectedSceneId, programSceneId, hotkeySceneId].filter(Boolean))
const sceneList = scenes.slice(0, 8)
  const mediaRows: BroadcastAssetTelemetry[] = importedMediaAssets.length
  ? importedMediaAssets
  : mediaItems.map((item, index) =>
      blockToBroadcastAsset(item, item.label || `Media Asset ${index + 1}`, index),
    )
  const selectedMediaAsset =
  mediaRows.find((asset) => asset.label === selectedMediaAssetLabel) ?? mediaRows[0] ?? null
const orchestratedMediaRows: BroadcastAssetTelemetry[] = mediaRows.map((asset) => {
  const isPreloaded = preloadedAssetLabels.includes(asset.label)
  const isProgram = asset.label === programMediaAssetLabel
  const isPreview = asset.label === previewMediaAssetLabel
  const runtime = mediaRuntimeByLabel[asset.label]
const runtimeElapsedSeconds =
  runtime?.isPlaying && runtime.startedAtMs
    ? runtime.elapsedSeconds +
      (runtimePaused
        ? 0
        : Math.floor((mediaRuntimeNowMs - runtime.startedAtMs) / 1000))
    : runtime?.elapsedSeconds ?? 0
    ? runtime.elapsedSeconds +
      Math.floor((mediaRuntimeNowMs - runtime.startedAtMs) / 1000)
    : runtime?.elapsedSeconds ?? 0
const runtimeDurationSeconds = parseRuntimeDurationSeconds(asset.duration)
const runtimeProgress = runtimeDurationSeconds
  ? Math.min(
      100,
      Math.round((runtimeElapsedSeconds / runtimeDurationSeconds) * 100),
    )
  : asset.type === "live"
    ? 100
    : asset.progress ?? 0
  if (isProgram) {
    return {
      ...asset,
      destination: "PROGRAM" as const,
      state: "LIVE" as BroadcastAssetState,
      route: "PGM",
    progress: runtimeProgress,
scheduledIn:
  asset.type === "live"
    ? "Live now"
    : `${formatRuntimeClock(runtimeElapsedSeconds)} elapsed`,
    lastPlayed:
  runtimeElapsedSeconds > 0
    ? formatRuntimeClock(runtimeElapsedSeconds)
    : "Starting",
      routeLock: true,
      cueOrder: 1,
    }
  }
  if (isPreview) {
    return {
      ...asset,
      destination: "PREVIEW" as const,
      state: "CUED" as BroadcastAssetState,
      route: "PVW",
      scheduledIn: "Next TAKE",
      progress: 0,
      routeLock: true,
      cueOrder: 2,
    }
  }
  return {
    ...asset,
    destination: "STANDBY" as const,
    state: isPreloaded
  ? "PRELOADED"
  : asset.state === "LIVE"
    ? "READY"
    : asset.state,
    route: "Standby",
    cueOrder: 3,
    cacheState: isPreloaded ? "HOT" : asset.cacheState,
  }
}).sort((a, b) => (a.cueOrder ?? 99) - (b.cueOrder ?? 99))
const previewMediaAsset =
  orchestratedMediaRows.find((asset) => asset.label === previewMediaAssetLabel) ?? null
  const assetTabStats = [
    ["All", mediaRows.length],
    ["Graphics", mediaRows.filter((asset) => asset.type === "graphic").length],
    ["Videos", mediaRows.filter((asset) => asset.type === "video").length],
    ["Audio", mediaRows.filter((asset) => asset.type === "audio").length],
  ] as const
  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-[linear-gradient(180deg,rgba(7,12,22,0.96),rgba(3,6,12,1))] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.026)]">
      <div className="pointer-events-none absolute inset-0 opacity-[0.010] bg-[repeating-linear-gradient(to_right,rgba(255,255,255,0.020)_0px,rgba(255,255,255,0.020)_1px,transparent_1px,transparent_28px)]" />
      {activeUtilityPanel === "stream" ? (
        <BroadcastDestinationsPanel
          eventId={eventId}
          onClose={() => setActiveUtilityPanel(null)}
        />
      ) : activeUtilityPanel ? (
        <UtilityOverlay
          activePanel={activeUtilityPanel}
          recordingStatus={recordingStatus}
          recordingElapsedSeconds={recordingElapsedSeconds}
          recordings={recordings}
          onArmRecording={armRecording}
          onStartRecording={startRecording}
          onStopRecording={stopRecording}
          onClose={() => setActiveUtilityPanel(null)}
        />
      ) : null}
      {productionDrawerTab ? (
        <ProductionControlsDrawer
          activeTab={productionDrawerTab}
          onTabChange={setProductionDrawerTab}
          onClose={() => setProductionDrawerTab(null)}
          audioChannels={[
            ["Program", programLevel],
            ["Stage", stageLevel],
            ["Music", musicLevel],
            ["Mics", micLevelPercent],
            ["SFX", sfxLevel],
            ["Audience", audienceLevel],
          ].map(([id, level]) => ({
            id: String(id),
            label: String(id),
            level: Number(level),
            muted: mutedChannels[id as MixerChannelKey],
            solo: soloChannel === id,
          }))}
          onToggleMute={(channel) => toggleMutedChannel(channel as MixerChannelKey)}
          onToggleSolo={(channel) => toggleSoloChannel(channel as MixerChannelKey)}
          recordingStatus={recordingStatus}
          recordingElapsedSeconds={recordingElapsedSeconds}
          recordings={recordings}
          recordingError={recordingError}
          recordingSource={recordingSource}
          recordingDestination={recordingDestination}
          recordingQuality={recordingQuality}
          onRecordingSourceChange={setRecordingSource}
          onRecordingDestinationChange={setRecordingDestination}
          onRecordingQualityChange={setRecordingQuality}
          onArmRecording={armRecording}
          onStartRecording={startRecording}
          onStopRecording={stopRecording}
        />
      ) : null}
      {expandedMediaOpen ? (
        <div className="fixed bottom-5 left-3 right-3 z-[999] flex h-[430px] max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-[18px] border border-white/[0.12] bg-[#050914]/[0.99] shadow-[0_28px_90px_rgba(0,0,0,0.68)] backdrop-blur-2xl lg:left-[84px] lg:right-5 lg:max-w-[calc(100vw-104px)]">
          <header className="flex h-[62px] shrink-0 items-center justify-between border-b border-white/[0.07] px-5">
            <div>
              <div className="text-[8px] font-semibold uppercase tracking-[0.18em] text-sky-200/55">
                Source preparation
              </div>
              <h2 className="mt-1 text-[17px] font-semibold tracking-[-0.035em] text-white/92">
                Choose a source, prepare it, then send it to Preview.
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => mediaImportInputRef.current?.click()}
                disabled={mediaImportBusy}
                className="h-9 rounded-[10px] border border-white/[0.10] bg-white/[0.045] px-4 text-[10px] font-semibold text-white/74 transition hover:bg-white/[0.08] hover:text-white"
              >
                {mediaImportBusy ? "Importing…" : "Import source"}
              </button>
              <button
                type="button"
                onClick={() => setExpandedMediaOpen(false)}
                className="h-9 rounded-[10px] border border-white/[0.08] px-4 text-[10px] font-semibold text-white/48 transition hover:bg-white/[0.05] hover:text-white/80"
              >
                Close
              </button>
            </div>
          </header>
          {mediaImportError ? (
            <div className="border-b border-red-300/10 bg-red-400/[0.08] px-5 py-2 text-[10px] font-medium text-red-100/80">
              {mediaImportError}
            </div>
          ) : null}
          <div className="grid min-h-0 min-w-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.65fr)]">
            <section className="min-h-0 overflow-y-auto border-r border-white/[0.07] p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-[12px] font-semibold text-white/78">Source library</h3>
                  <p className="mt-0.5 text-[9px] text-white/34">
                    {orchestratedMediaRows.length} available · select one to inspect
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center rounded-[9px] border border-white/[0.08] bg-black/20 p-0.5" aria-label="Source library layout">
                    {([
                      ["icons", LayoutGrid, "Icon view"],
                      ["list", List, "List view"],
                      ["blocks", Layers3, "Block view"],
                    ] as const).map(([view, Icon, label]) => (
                      <button
                        key={view}
                        type="button"
                        onClick={() => updateSourceLibraryView(view)}
                        className={`grid h-7 w-8 place-items-center rounded-[7px] transition ${sourceLibraryView === view ? "bg-sky-400/15 text-sky-100 shadow-[inset_0_0_0_1px_rgba(125,211,252,0.18)]" : "text-white/34 hover:bg-white/[0.06] hover:text-white/68"}`}
                        title={label}
                        aria-label={label}
                        aria-pressed={sourceLibraryView === view}
                      >
                        <Icon size={13} aria-hidden="true" />
                      </button>
                    ))}
                  </div>
                  <div className="hidden items-center gap-3 text-[8px] font-medium text-white/32 xl:flex">
                    <span>1 · Choose</span>
                    <span>2 · Prepare</span>
                    <span className="text-sky-200/65">3 · Preview</span>
                  </div>
                </div>
              </div>
              {orchestratedMediaRows.length ? (
                <div className={`grid gap-2 ${sourceLibraryView === "icons" ? "grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5" : sourceLibraryView === "list" ? "grid-cols-1" : "sm:grid-cols-2 2xl:grid-cols-3"}`}>
                  {orchestratedMediaRows.map((asset) => (
                    <SourceLibraryCard
                      key={`${asset.label}-${asset.type}`}
                      asset={asset}
                      selected={selectedMediaAsset?.label === asset.label}
                      inPreview={previewMediaAssetLabel === asset.label}
                      onSelect={() => setSelectedMediaAssetLabel(asset.label)}
                      onSendToPreview={() => handleSelectMediaAssetForPreview(asset.label)}
                      onDelete={
                        isImportedMediaAsset(asset.label)
                          ? () => void handleDeleteImportedAsset(asset.label)
                          : undefined
                      }
                      deleting={deletingMediaAssetId === (asset.id ?? asset.label)}
                      viewMode={sourceLibraryView}
                    />
                  ))}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => mediaImportInputRef.current?.click()}
                  className="flex h-[220px] w-full items-center justify-center rounded-[14px] border border-dashed border-white/[0.12] text-[11px] font-medium text-white/40 transition hover:border-sky-300/30 hover:bg-sky-400/[0.025] hover:text-white/68"
                >
                  Import your first video, image, audio file, or PDF
                </button>
              )}
            </section>
            <aside className="flex min-h-0 flex-col p-4">
              <div className="text-[8px] font-semibold uppercase tracking-[0.16em] text-white/32">
                Prepared source
              </div>
              {selectedMediaAsset ? (
                <>
                  <div className="mt-3 flex h-[118px] w-full items-center justify-center overflow-hidden rounded-[12px] border border-white/[0.08] bg-[#08101d] p-2 text-white/24 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]">
                    {selectedMediaAsset.imageUrl ? (
                      <div className="flex h-full max-w-[190px] items-center justify-center overflow-hidden rounded-[8px] border border-white/[0.06] bg-black/25 px-1.5">
                        <PreparedSourceImage
                          src={selectedMediaAsset.imageUrl}
                          label={selectedMediaAsset.label}
                        />
                      </div>
                    ) : selectedMediaAsset.type === "video" ? (
                      <Video size={28} />
                    ) : selectedMediaAsset.type === "audio" ? (
                      <Music2 size={28} />
                    ) : (
                      <Image size={28} />
                    )}
                  </div>
                  <h3 className="mt-3 truncate text-[15px] font-semibold tracking-[-0.025em] text-white/88">
                    {selectedMediaAsset.label}
                  </h3>
                  <p className="mt-1 text-[9px] leading-relaxed text-white/38">
                    {selectedMediaAsset.type} · {selectedMediaAsset.duration} · {selectedMediaAsset.meta}
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2 border-y border-white/[0.06] py-3 text-[9px]">
                    <div>
                      <div className="text-white/28">Scene</div>
                      <div className="mt-1 truncate text-white/62">{selectedMediaAsset.linkedScene}</div>
                    </div>
                    <div>
                      <div className="text-white/28">Status</div>
                      <div className="mt-1 text-white/62">
                        {previewMediaAssetLabel === selectedMediaAsset.label ? "In Preview" : "Ready"}
                      </div>
                    </div>
                  </div>
                  <div className="mt-auto space-y-2 pt-4">
                    <button
                      type="button"
                      onClick={handleSendSelectedMediaAssetToPreview}
                      className="flex h-11 w-full items-center justify-center rounded-[11px] border border-sky-300/28 bg-sky-400/[0.13] text-[11px] font-semibold text-sky-50 transition hover:bg-sky-400/[0.20]"
                    >
                      {previewMediaAssetLabel === selectedMediaAsset.label
                        ? "Refresh in Preview"
                        : "Send to Preview"}
                    </button>
                    {isImportedMediaAsset(selectedMediaAsset.label) ? (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenMediaAssetEdit(selectedMediaAsset.label)}
                          className="h-8 rounded-[9px] border border-white/[0.08] text-[9px] font-medium text-white/45 hover:bg-white/[0.04] hover:text-white/72"
                        >
                          Edit details
                        </button>
                        <button
                          type="button"
                          disabled={deletingMediaAssetId === (selectedMediaAsset.id ?? selectedMediaAsset.label)}
                          onClick={() => void handleDeleteImportedAsset(selectedMediaAsset.label)}
                          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-[9px] border border-red-300/[0.14] bg-red-400/[0.035] text-[9px] font-medium text-red-100/52 hover:bg-red-400/[0.08] hover:text-red-100/82 disabled:cursor-wait disabled:opacity-45"
                        >
                          <Trash2 size={11} aria-hidden="true" />
                          {deletingMediaAssetId === (selectedMediaAsset.id ?? selectedMediaAsset.label)
                            ? "Deleting…"
                            : "Delete from library"}
                        </button>
                      </div>
                    ) : null}
                  </div>
                </>
              ) : (
                <div className="flex flex-1 items-center justify-center text-center text-[10px] leading-relaxed text-white/32">
                  Select a source from the library to prepare it.
                </div>
              )}
            </aside>
          </div>
        </div>
      ) : null}
      
      <div className="relative z-10 grid min-h-0 flex-1 gap-2 overflow-hidden pb-2 xl:grid-cols-[0.72fr_3.9fr]">
<ConsolePanel
  title="Scene presets"
  action={
    <button
      type="button"
      onClick={onAddScene}
      disabled={!onAddScene}
      className="rounded-[8px] border border-white/[0.08] bg-white/[0.025] px-2.5 py-1 text-[8px] font-semibold text-white/52 transition hover:bg-white/[0.05] hover:text-white/78 disabled:cursor-not-allowed disabled:opacity-35"
    >
      New scene
    </button>
  }
>
  <div className="grid min-h-0 gap-2">
    {sceneList.length ? (
      <div className="grid gap-1">
        {sceneList.map((scene, index) => {
  const active = activeSceneIds.has(scene.id)
  return (
            <button
              key={scene.id}
              type="button"
              onClick={() => onApplyScene?.(scene.id)}
              onDoubleClick={() => onDoubleClickScene?.(scene.id)}
              className={`grid grid-cols-[minmax(0,1fr)_auto_20px] items-center gap-2 rounded-[10px] border px-2 py-1.5 text-left transition ${
                active
                  ? "border-sky-300/24 bg-sky-400/[0.095] text-white shadow-[0_0_18px_rgba(56,189,248,0.10)]"
                  : "border-white/[0.045] bg-white/[0.014] text-white/62 hover:border-white/[0.075] hover:bg-white/[0.026]"
              }`}
            >
<div className="min-w-0 flex-1 overflow-hidden pr-2">
  {editingSceneId === scene.id ? (
    <input
      autoFocus
      value={sceneNameDraft}
      onClick={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
      onChange={(event) => setSceneNameDraft(event.target.value)}
      onBlur={() => {
        const trimmed = sceneNameDraft.trim()
        if (trimmed) {
          onRenameScene?.(scene.id, trimmed)
        }
        setEditingSceneId(null)
        setSceneNameDraft("")
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault()
          event.stopPropagation()
          setEditingSceneId(null)
          setSceneNameDraft("")
        }
        if (event.key === "Enter") {
          event.preventDefault()
          event.stopPropagation()
          const trimmed = sceneNameDraft.trim()
          if (trimmed) {
            onRenameScene?.(scene.id, trimmed)
          }
          setEditingSceneId(null)
          setSceneNameDraft("")
        }
      }}
      className="w-full min-w-0 text-left rounded-[6px] border border-sky-300/18 bg-black/28 px-1.5 py-1 text-[10px] font-semibold tracking-[-0.02em] text-white/88 outline-none"
    />
  ) : (
    <span
      role="button"
      tabIndex={0}
      onDoubleClick={(event) => {
        event.stopPropagation()
        setEditingSceneId(scene.id)
        setSceneNameDraft(scene.name || "Untitled Scene")
      }}
      className="block w-full min-w-0 truncate text-left rounded-[6px] -mx-1 px-1 text-[10px] font-semibold tracking-[-0.02em] text-white/74 transition hover:bg-sky-300/[0.08] hover:text-white/92"
      title="Double-click to rename scene"
    >
      {scene.name || "Untitled Scene"}
    </span>
  )}
</div>
              {programSceneId === scene.id ? (
                <span className="rounded-full border border-red-300/14 bg-red-400/[0.070] px-1.5 py-0.5 text-[6px] font-black uppercase tracking-[0.08em] text-red-100/58">
                  PGM
                </span>
              ) : selectedSceneId === scene.id ? (
                <span className="rounded-full border border-sky-300/14 bg-sky-400/[0.070] px-1.5 py-0.5 text-[6px] font-black uppercase tracking-[0.08em] text-sky-100/58">
                  PVW
                </span>
              ) : null}
              <span
  role="button"
  tabIndex={0}
  aria-label={`Delete scene ${scene.name}`}
  onClick={(event) => {
    event.stopPropagation()
    onDeleteScene?.(scene.id)
  }}
  onKeyDown={(event) => {
    if (event.key !== "Enter" && event.key !== " ") return
    event.preventDefault()
    event.stopPropagation()
    onDeleteScene?.(scene.id)
  }}
  className="flex h-5 w-5 items-center justify-center rounded-full border border-red-300/12 bg-red-400/[0.045] text-[11px] font-black leading-none text-red-100/42 opacity-55 transition hover:border-red-300/24 hover:bg-red-400/[0.10] hover:text-red-50 hover:opacity-100"
>
  ×
</span>
            </button>
          )
        })}
      </div>
    ) : (
      <div className="rounded-[12px] border border-white/[0.045] bg-white/[0.014] p-3 text-[10px] leading-relaxed text-white/42">
        No saved scenes yet. Build the preview canvas, then press{" "}
        <span className="font-black text-emerald-100/60">Save</span>.
      </div>
    )}
    <div>
      <button
        type="button"
        onClick={onSaveScene}
        disabled={!onSaveScene}
        className="w-full rounded-[9px] border border-sky-300/18 bg-sky-400/[0.075] px-2 py-2 text-[9px] font-semibold text-sky-100/72 transition hover:bg-sky-400/[0.12] disabled:cursor-not-allowed disabled:opacity-35"
      >
        Save current Preview as a scene
      </button>
    </div>
  </div>
</ConsolePanel>
<ConsolePanel
  title="Sources"
  action={
    <div className="flex items-center gap-1">
      <input
        ref={mediaImportInputRef}
        type="file"
        multiple
        accept="video/*,image/*,audio/*,application/pdf"
        className="hidden"
        onChange={handleImportMediaFiles}
      />
      <button
        type="button"
        onClick={() => mediaImportInputRef.current?.click()}
        className="rounded-[8px] border border-white/[0.08] bg-white/[0.025] px-2.5 py-1 text-[8px] font-semibold text-white/52 transition hover:bg-white/[0.05] hover:text-white/78"
      >
        Import
      </button>
      <button
        type="button"
        onClick={() => setExpandedMediaOpen(true)}
        className="rounded-[8px] border border-sky-300/16 bg-sky-400/[0.06] px-2.5 py-1 text-[8px] font-semibold text-sky-100/64 transition hover:bg-sky-400/[0.11] hover:text-sky-50"
      >
        Open library
      </button>
    </div>
  }
>
          <div className="flex h-full min-h-0 flex-col">
            <div className="mb-1.5 flex items-center justify-between border-b border-white/[0.065] pb-1.5">
              <p className="text-[9px] font-medium text-white/48">Choose a source, then send it to Preview</p>
              <span className="text-[8px] font-medium tabular-nums text-white/38">
                {mediaRows.length} available
              </span>
            </div>
            {mediaRows.length ? (
              <div className="grid min-h-[148px] grid-flow-col auto-cols-[220px] content-start justify-start gap-2 overflow-x-auto pb-1 pr-1 [scrollbar-width:thin] [scrollbar-color:rgba(125,211,252,0.22)_transparent] 2xl:auto-cols-[240px]">
                {mediaRows.slice(0, 6).map((asset) => (
                  <SourceLibraryCard
                    key={`${asset.label}-${asset.type}`}
                    asset={asset}
                    selected={selectedMediaAsset?.label === asset.label}
                    inPreview={previewMediaAssetLabel === asset.label}
                    onSelect={() => setSelectedMediaAssetLabel(asset.label)}
                    onSendToPreview={() => handleSelectMediaAssetForPreview(asset.label)}
                    onDelete={
                      isImportedMediaAsset(asset.label)
                        ? () => void handleDeleteImportedAsset(asset.label)
                        : undefined
                    }
                    deleting={deletingMediaAssetId === (asset.id ?? asset.label)}
                  />
                ))}
              </div>
            ) : (
              <div className="grid min-h-[126px] grid-cols-5 gap-2">
                {["Camera", "Slides", "Video", "Holding", "Screen"].map((label, index) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => mediaImportInputRef.current?.click()}
                    className="group relative flex min-w-0 flex-col overflow-hidden rounded-[10px] border border-dashed border-white/[0.10] bg-[#080d16] text-left transition hover:border-sky-300/28 hover:bg-[#0b1421]"
                  >
                    <div className="flex aspect-video w-full items-center justify-center border-b border-white/[0.05] bg-[radial-gradient(circle_at_50%_35%,rgba(59,130,246,0.08),transparent_58%),#060b13] text-[18px] font-light text-white/18">
                      {index + 1}
                    </div>
                    <div className="px-2.5 py-2">
                      <div className="truncate text-[9px] font-semibold text-white/50">{label}</div>
                      <div className="mt-0.5 text-[7px] uppercase tracking-[0.08em] text-white/24">Awaiting source</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
            <div className="mt-auto grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 pt-1.5">
              <div className="min-w-0">
                <div className="truncate text-[10px] font-semibold text-white/68">
                  {selectedMediaAsset?.label ?? "No source selected"}
                </div>
                <div className="mt-0.5 text-[8px] text-white/30">
                  {selectedMediaAsset
                    ? previewMediaAssetLabel === selectedMediaAsset.label
                      ? "Currently in Preview"
                      : "Ready to prepare"
                    : "Open the library to browse all sources"}
                </div>
              </div>
              <button
                type="button"
                disabled={!selectedMediaAsset}
                onClick={handleSendSelectedMediaAssetToPreview}
                className="h-9 rounded-[9px] border border-sky-300/24 bg-sky-400/[0.10] px-4 text-[9px] font-semibold text-sky-50/80 transition hover:bg-sky-400/[0.16] disabled:cursor-not-allowed disabled:opacity-30"
              >
                Send to Preview
              </button>
              <button
                type="button"
                disabled={!previewProgramDifferent || takeBusy || dockTakeBusy}
                onClick={() => void handleTakeAsset()}
                className="h-9 min-w-[76px] rounded-[9px] border border-red-300/28 bg-red-500/[0.11] px-4 text-[9px] font-bold tracking-[0.04em] text-red-50/88 transition hover:bg-red-500/[0.18] disabled:cursor-not-allowed disabled:border-white/[0.08] disabled:bg-white/[0.025] disabled:text-white/28"
              >
                {dockTakeBusy || takeBusy ? "TAKING" : "TAKE"}
              </button>
            </div>
          </div>
        </ConsolePanel>
      </div>
      {workspaceMode === "show" || workspaceMode === "advanced" ? (
      <div className="relative z-20 mt-1.5 grid shrink-0 gap-1.5 border-t border-white/[0.06] pt-1.5 xl:grid-cols-[minmax(0,1fr)_minmax(330px,0.62fr)]">
        <div className="grid grid-cols-4 gap-1.5">
          <CompactAudioMeter label="Program" level={programLevel} />
          <CompactAudioMeter label="Stage" level={stageLevel} />
          <CompactAudioMeter label="Mics" level={micLevelPercent} />
          <CompactAudioMeter label="Playback" level={musicLevel} />
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          <UtilityButton
            icon={<CircleDot size={15} />}
            label={recordingStatus === "recording" ? "Recording" : "Record"}
            meta={recordingStatus === "recording" ? formatRecordingDuration(recordingElapsedSeconds) : recordingStatus === "armed" ? "Armed" : "Off"}
            danger={recordingStatus === "recording" || recordingStatus === "starting"}
            onClick={() => setProductionDrawerTab("recording")}
          />
          <UtilityButton icon={<Radio size={16} />} label="Stream" meta="Setup" onClick={() => setActiveUtilityPanel("stream")} />
          <UtilityButton icon={<Layers3 size={16} />} label="Media" meta="Manage" onClick={() => setExpandedMediaOpen(true)} />
          <UtilityButton icon={<Volume2 size={16} />} label="Mixer" meta="Open" onClick={() => setProductionDrawerTab("audio")} />
        </div>
      </div>
      ) : null}
    </div>
  )
}
<style jsx global>{`
  @keyframes takeSweep {
    0% {
      transform: translateX(0%);
      opacity: 0;
    }
    15% {
      opacity: 1;
    }
    100% {
      transform: translateX(340%);
      opacity: 0;
    }
  }
`}</style>
export { MediaOverviewWorkspace, MediaAssetsWorkspace, MediaTakeWorkspace, MediaRoutingWorkspace }
