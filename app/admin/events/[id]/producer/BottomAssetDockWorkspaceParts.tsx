export type { PreviewBlock } from "./useProducerBlocks"
export type { ProducerWorkspaceMode } from "./ProducerModeBar"
export { buildProducerAssetUrl } from "./producerAssetUrls"
export type { DockAssetRecord, SceneSummary } from "./assetDockTypes"
export type { ProductionDrawerTab } from "./ProductionControlsDrawer"

export {
  AssetIntelligenceHeader,
  SourceConfidenceStrip,
  TakeSafetyMatrix,
  RouteMappingPanel,
  TransitionCompatibilityPanel,
  TimelineStatePill,
  ActiveTakeQueuePanel,
  ProductionIntentPanel,
  OperatorConfidencePanel,
} from "./BottomAssetDockOperations"

export { MediaRow, SourceLibraryCard } from "./BottomAssetDockMedia"
export type { MediaAssetEditDraft, MediaAssetRuntimeState, SourceLibraryView } from "./BottomAssetDockMedia"

export {
  CompactAudioMeter,
  AudioAssetRow,
  MixerStrip,
  ExpandedAudioMixerOverlay,
} from "./BottomAssetDockAudio"
export type { MixerChannelKey } from "./BottomAssetDockAudio"

export {
  CommRow,
  UtilityButton,
  UtilityOverlay,
  ExpandedRecordingOverlay,
  formatRecordingDuration,
} from "./BottomAssetDockRecording"
export type { RecordingSession, RecordingStatusRow, RecordingSourceOption, UtilityPanel } from "./BottomAssetDockRecording"
