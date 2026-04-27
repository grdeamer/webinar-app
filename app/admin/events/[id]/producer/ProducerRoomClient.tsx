// Apply-patch test: oboe editing is connected
"use client"

import { useEffect, useMemo, useRef, useState, useCallback, type ReactNode } from "react"
import type { JSX } from "react"
import { LiveKitRoom, RoomAudioRenderer } from "@livekit/components-react"
import AudienceOriginCue from "@/components/live/AudienceOriginCue"
import StageVideoPreview from "./StageVideoPreview"

import useProducerRoomApi from "./useProducerRoomApi"
import useProducerBlocks, { type PreviewBlock } from "./useProducerBlocks"
import RightInspectorRail from "./RightInspectorRail"




type ProducerParticipant = {
  identity: string
  name: string
  joinedAt: string | null
  state: string | number | null
  isPublisher: boolean
  metadata?: Record<string, unknown>
  cameraEnabled: boolean
  micEnabled: boolean
  screenShareEnabled: boolean
  tracks: Array<{
    sid: string
    name: string
    source: string | number
    muted?: boolean
  }>

}

function ControlStackPanel({
  takeBusy,
  previewProgramDifferent,
  onTake,
  onGoLive,
  onGoOffAir,
  layout,
  onSetLayout,
  autoDirectorEnabled,
  onToggleAutoDirector,
}: {
  takeBusy: boolean
  previewProgramDifferent: boolean
  onTake: () => void
  onGoLive: () => void
  onGoOffAir: () => void
  layout: StageState["layout"] | null | undefined
  onSetLayout: (layout: StageState["layout"]) => void
  autoDirectorEnabled: boolean
  onToggleAutoDirector: () => void
}): JSX.Element {
  return (
    <>
      <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-3.5">
        <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
          Control Stack
        </div>

        <div className="space-y-3">
          <button
            onClick={onTake}
            disabled={takeBusy}
            className={`w-full rounded-xl px-4 py-3 text-sm font-bold text-slate-950 transition disabled:opacity-60 ${
              previewProgramDifferent
                ? "bg-amber-400 hover:bg-amber-300"
                : "bg-sky-400 hover:bg-sky-300"
            }`}
          >
            {takeBusy ? "Taking..." : "TAKE"}
          </button>

          <button
            onClick={onGoLive}
            className="w-full rounded-xl bg-red-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-400"
          >
            Go Live
          </button>

          <button
            onClick={onGoOffAir}
            className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Off Air
          </button>
        </div>
      </div>

      <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
        <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
          Layout Modes
        </div>

        <div className="space-y-2">
          <button
            onClick={() => onSetLayout("solo")}
            className={`w-full rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
              layout === "solo"
                ? "bg-white text-black"
                : "border border-white/15 bg-white/5 text-white hover:bg-white/10"
            }`}
          >
            Solo
          </button>

          <button
            onClick={() => onSetLayout("grid")}
            className={`w-full rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
              layout === "grid"
                ? "bg-white text-black"
                : "border border-white/15 bg-white/5 text-white hover:bg-white/10"
            }`}
          >
            Grid
          </button>

          <button
            onClick={() => onSetLayout("screen_speaker")}
            className={`w-full rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
              layout === "screen_speaker"
                ? "bg-white text-black"
                : "border border-white/15 bg-white/5 text-white hover:bg-white/10"
            }`}
          >
            Speaker + Screen
          </button>

          <button
            onClick={onToggleAutoDirector}
            className={`w-full rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
              autoDirectorEnabled
                ? "bg-emerald-400 text-slate-950"
                : "border border-white/15 bg-white/5 text-white"
            }`}
          >
            {autoDirectorEnabled ? "Auto Director On" : "Auto Director Off"}
          </button>
        </div>
      </div>
    </>
  )
}

function renderBlockContent(block: PreviewBlock): JSX.Element | null {
  if (block.type === "text") {
    return <div className="p-2 text-sm">{block.content}</div>
  }

  if (block.type === "video" && block.src) {
    return <video src={block.src} controls className="h-full w-full object-cover" />
  }

  if (block.type === "image" && block.src) {
    return (
      <img
        src={block.src}
        className="h-full w-full object-contain"
        alt={block.label || "Image"}
      />
    )
  }

  if (block.type === "pdf" && block.src) {
    return (
      <iframe
        src={block.src}
        className="h-full w-full bg-white"
        title={block.label || "PDF"}
      />
    )
  }

  return null
}

function renderPlacedBlocks({
  blocks,
  opts,
  selectedBlockId,
  setSelectedBlockId,
  startDraggingBlock,
  startResizingBlock,
}: {
  blocks: PreviewBlock[]
  opts?: {
    selectable?: boolean
    showChrome?: boolean
    selectedBlockId?: string | null
  }
  selectedBlockId: string | null
  setSelectedBlockId: (value: string | null) => void
  startDraggingBlock: (e: React.MouseEvent<HTMLDivElement>, blockId: string) => void
  startResizingBlock: (e: React.MouseEvent<HTMLDivElement>, blockId: string) => void
}): JSX.Element[] {
  return blocks
    .filter((block) => !block.hidden)
    .map((block) => (
      <div
        key={block.id}
        onClick={
          opts?.selectable
            ? (e) => {
                e.stopPropagation()
                setSelectedBlockId(block.id)
              }
            : undefined
        }
        className={`absolute overflow-hidden rounded-lg ${
          opts?.selectable
            ? selectedBlockId === block.id
              ? "border-2 border-sky-400 bg-white/10 shadow-[0_0_0_1px_rgba(56,189,248,0.35)]"
              : "border border-white/20 bg-white/10"
            : "border border-white/10 bg-white/10"
        }`}
        style={{
          left: block.x,
          top: block.y,
          width: block.width,
          height: block.height,
          zIndex: block.zIndex,
          opacity: block.opacity ?? 1,
        }}
      >
        {opts?.showChrome ? (
          <div
            onMouseDown={
              opts?.selectable
                ? (e) => {
                    e.stopPropagation()
                    setSelectedBlockId(block.id)
                    startDraggingBlock(e, block.id)
                  }
                : undefined
            }
            className={`flex items-center justify-between rounded-t-lg border-b border-white/10 bg-black/40 px-2 py-1 text-[11px] font-semibold text-white/70 ${
              opts?.selectable ? "cursor-move" : "pointer-events-none"
            }`}
          >
            <span>{block.label || block.type}</span>
            <span className="text-white/35">{opts?.selectable ? "Drag" : "Live"}</span>
          </div>
        ) : null}

        <div
          className={
            opts?.showChrome
              ? "h-[calc(100%-28px)] overflow-hidden rounded-b-lg"
              : "h-full w-full overflow-hidden"
          }
        >
          {renderBlockContent(block)}
        </div>

        {opts?.selectable && opts?.showChrome ? (
          <div
            onMouseDown={(e) => startResizingBlock(e, block.id)}
            className="absolute bottom-1 right-1 h-3 w-3 cursor-se-resize rounded-sm bg-white/70"
            title="Resize block"
          />
        ) : null}
      </div>
    ))
}
type StageState = {
  event_id: string
  room_id: string | null
  is_live: boolean
  auto_director_enabled: boolean
  layout: "solo" | "grid" | "screen_speaker"
  stage_participant_ids: string[]
  primary_participant_id: string | null
  pinned_participant_id: string | null
  screen_share_participant_id: string | null
  screen_share_track_id: string | null
  scene_version: number
  headline: string | null
  message: string | null
  updated_by: string | null
  updated_at: string
}
type SceneSnapshot = {
  id: string
  name: string
  stageState: StageState | null
  previewBlocks: PreviewBlock[]
}

function LiveBadge({ live }: { live: boolean }): JSX.Element {
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] transition ${
        live
          ? "border-red-400/25 bg-red-500/15 text-red-200 shadow-[0_0_24px_rgba(239,68,68,0.18)]"
          : "border-white/10 bg-white/5 text-white/55"
      }`}
    >
      <span
        className={`h-2.5 w-2.5 rounded-full ${
          live ? "animate-pulse bg-red-400" : "bg-white/30"
        }`}
      />
      {live ? "Live" : "Off Air"}
    </div>
  )
}

function MonitorHeader({
  title,
  subtitle,
  badge,
  tone = "neutral",
}: {
  title: string
  subtitle: string
  badge?: ReactNode
  tone?: "neutral" | "preview" | "program"
}): JSX.Element {
  const toneClass =
    tone === "program"
      ? "text-red-200/80"
      : tone === "preview"
        ? "text-sky-200/80"
        : "text-white/40"

  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <div>
        <div className={`text-xs uppercase tracking-[0.2em] ${toneClass}`}>{title}</div>
        <div className="text-sm text-white/55">{subtitle}</div>
      </div>
      {badge ? <div className="shrink-0">{badge}</div> : null}
    </div>
  )
}

function DeviceSelectorPanel({
  deviceAccessReady,
  videoDevices,
  audioDevices,
  selectedVideoDeviceId,
  selectedAudioDeviceId,
  onSelectVideoDevice,
  onSelectAudioDevice,
}: {
  deviceAccessReady: boolean
  videoDevices: MediaDeviceInfo[]
  audioDevices: MediaDeviceInfo[]
  selectedVideoDeviceId: string
  selectedAudioDeviceId: string
  onSelectVideoDevice: (value: string) => void
  onSelectAudioDevice: (value: string) => void
}): JSX.Element {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
            Producer Devices
          </div>
          <div className="text-sm text-white/55">
            Choose the camera and microphone for this workstation.
          </div>
        </div>

        <span
          className={`rounded-full border px-3 py-1 text-xs ${
            deviceAccessReady
              ? "border-emerald-300/30 bg-emerald-400/10 text-emerald-200"
              : "border-amber-300/30 bg-amber-400/10 text-amber-200"
          }`}
        >
          {deviceAccessReady ? "Ready" : "Permission needed"}
        </span>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-white/40">
            Camera
          </label>
          <select
            value={selectedVideoDeviceId}
            onChange={(e) => onSelectVideoDevice(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
          >
            {videoDevices.length === 0 ? (
              <option value="">No cameras found</option>
            ) : (
              videoDevices.map((device, index) => (
                <option key={device.deviceId || `video-${index}`} value={device.deviceId}>
                  {device.label || `Camera ${index + 1}`}
                </option>
              ))
            )}
          </select>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-white/40">
            Microphone
          </label>
          <select
            value={selectedAudioDeviceId}
            onChange={(e) => onSelectAudioDevice(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
          >
            {audioDevices.length === 0 ? (
              <option value="">No microphones found</option>
            ) : (
              audioDevices.map((device, index) => (
                <option key={device.deviceId || `audio-${index}`} value={device.deviceId}>
                  {device.label || `Microphone ${index + 1}`}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/45">
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
          Cameras: {videoDevices.length}
        </span>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
          Mics: {audioDevices.length}
        </span>
      </div>
    </div>
  )
}

function AudienceOriginTestPanel({
  onTriggerCue,
  onHideCue,
}: {
  onTriggerCue: (options: {
    region?: string
    moonMode?: boolean
    questionLabel?: string
    durationMs?: number
  }) => void
  onHideCue: () => void
}): JSX.Element {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
        Audience Origin Test
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() =>
            onTriggerCue({
              region: "Europe",
              moonMode: false,
              questionLabel: "How are outcomes differing across regions?",
            })
          }
          className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
        >
          Trigger Europe Cue
        </button>

        <button
          onClick={() =>
            onTriggerCue({
              region: "North America",
              moonMode: false,
              questionLabel: "What trends are you seeing in North America?",
            })
          }
          className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
        >
          Trigger North America Cue
        </button>

        <button
          onClick={() =>
            onTriggerCue({
              region: "Mare Tranquillitatis",
              moonMode: true,
              questionLabel: "Moon base check-in: how is the signal holding?",
            })
          }
          className="rounded-xl border border-violet-400/20 bg-violet-500/10 px-4 py-2 text-sm font-semibold text-violet-100 transition hover:bg-violet-500/15"
        >
          Trigger Moon Cue
        </button>

        <button
          onClick={onHideCue}
          className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-100 transition hover:bg-red-500/15"
        >
          Hide Cue
        </button>
      </div>
    </div>
  )
}
function MediaBlocksPanel({
  previewBlocksCount,
  onAddText,
  onAddVideo,
  onAddPdf,
  onAddImage,
  onUploadPdf,
  onUploadVideo,
  onUploadImage,
  onDuplicate,
  onBringToFront,
  onDelete,
  hasSelectedBlock,
}: {
  previewBlocksCount: number
  onAddText: () => void
  onAddVideo: () => void
  onAddPdf: () => void
  onAddImage: () => void
  onUploadPdf: () => void
  onUploadVideo: () => void
  onUploadImage: () => void
  onDuplicate: () => void
  onBringToFront: () => void
  onDelete: () => void
  hasSelectedBlock: boolean
}): JSX.Element {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
        Add Blocks / Upload Media
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={onAddText}
          className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
        >
          Add Text
        </button>

        <button
          onClick={onAddVideo}
          className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
        >
          Add Video
        </button>

        <button
          onClick={onAddPdf}
          className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
        >
          Add PDF
        </button>

        <button
          onClick={onAddImage}
          className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
        >
          Add Image
        </button>

        <button
          onClick={onUploadPdf}
          className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-white/90"
        >
          Upload PDF
        </button>

        <button
          onClick={onUploadVideo}
          className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-white/90"
        >
          Upload Video
        </button>

        <button
          onClick={onUploadImage}
          className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-white/90"
        >
          Upload Image
        </button>

        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
          Preview blocks: {previewBlocksCount}
        </span>

        <button
          onClick={onDuplicate}
          disabled={!hasSelectedBlock}
          className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-40 hover:bg-white/10"
        >
          Duplicate
        </button>

        <button
          onClick={onBringToFront}
          disabled={!hasSelectedBlock}
          className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-40 hover:bg-white/10"
        >
          Bring To Front
        </button>

        <button
          onClick={onDelete}
          disabled={!hasSelectedBlock}
          className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-200 transition disabled:cursor-not-allowed disabled:opacity-40 hover:bg-red-500/15"
        >
          Delete
        </button>
      </div>
    </div>
  )
}
function ScenesStatusPanel({
  sceneName,
  onSceneNameChange,
  onSaveScene,
  sceneBusy,
  stageState,
  scenes,
  onApplyScene,
  onClearScreenShare,
  onUnpin,
  onClearPrimary,
}: {
  sceneName: string
  onSceneNameChange: (value: string) => void
  onSaveScene: () => void
  sceneBusy: boolean
  stageState: StageState | null
  scenes: Array<{ id: string; name: string }>
  onApplyScene: (sceneId: string) => void
  onClearScreenShare: () => void
  onUnpin: () => void
  onClearPrimary: () => void
}): JSX.Element {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
        Scenes / Status
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          value={sceneName}
          onChange={(e) => onSceneNameChange(e.target.value)}
          placeholder="Scene name"
          className="min-w-[220px] rounded-xl bg-white/10 px-3 py-2 text-sm outline-none ring-0 placeholder:text-white/30"
        />

        <button
          onClick={onSaveScene}
          disabled={sceneBusy}
          className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90"
        >
          Save Scene
        </button>

        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
          Screen: {stageState?.screen_share_participant_id || "none"}
        </span>

        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
          Pinned: {stageState?.pinned_participant_id || "none"}
        </span>

        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
          Primary: {stageState?.primary_participant_id || "none"}
        </span>

        {stageState?.screen_share_participant_id ? (
          <button
            onClick={onClearScreenShare}
            className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10"
          >
            Clear screen
          </button>
        ) : null}

        {stageState?.pinned_participant_id ? (
          <button
            onClick={onUnpin}
            className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10"
          >
            Clear pin
          </button>
        ) : null}

        {stageState?.primary_participant_id ? (
          <button
            onClick={onClearPrimary}
            className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10"
          >
            Clear primary
          </button>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {scenes.map((scene) => (
          <button
            key={scene.id}
            onClick={() => onApplyScene(scene.id)}
            className="rounded-lg border border-white/15 px-3 py-1.5 text-xs transition hover:bg-white/5"
          >
            {scene.name}
          </button>
        ))}
      </div>
    </div>
  )
}



function CenterSwitcherColumn({
  triggerAudienceCue,
  onHideAudienceCue,
  previewProgramDifferent,
  onPreviewCanvasMouseMove,
  stopDraggingBlock,
  onClearSelectedBlock,
  stageState,
  onStageParticipants,
  previewBlocks,
  selectedBlockId,
  setSelectedBlockId,
  startDraggingBlock,
  startResizingBlock,
  programState,
  programBlocks,
  showAudienceCue,
  audienceCueRegion,
  audienceCueMoonMode,
  audienceCueQuestionLabel,
  isTransitioning,
  transitionFromState,
  transitionFromBlocks,
  transitionFadingOut,
  sceneName,
  onSceneNameChange,
  onSaveScene,
  sceneBusy,
  scenes,
  onApplyScene,
  onClearScreenShare,
  onUnpin,
  onClearPrimary,
  setError,
  addTestTextBlock,
  addTestVideoBlock,
  addTestPdfBlock,
  addTestImageBlock,
  onUploadPdf,
  onUploadVideo,
  onUploadImage,
  duplicateSelectedBlock,
  bringSelectedBlockToFront,
  deleteSelectedBlock,
}: {
  triggerAudienceCue: (options?: {
    region?: string
    moonMode?: boolean
    questionLabel?: string
    durationMs?: number
  }) => void
  onHideAudienceCue: () => void
  previewProgramDifferent: boolean
  onPreviewCanvasMouseMove: (e: React.MouseEvent<HTMLDivElement>) => void
  stopDraggingBlock: () => void
  onClearSelectedBlock: () => void
  stageState: StageState | null
  onStageParticipants: ProducerParticipant[]
  previewBlocks: PreviewBlock[]
  selectedBlockId: string | null
  setSelectedBlockId: (value: string | null) => void
  startDraggingBlock: (e: React.MouseEvent<HTMLDivElement>, blockId: string) => void
  startResizingBlock: (e: React.MouseEvent<HTMLDivElement>, blockId: string) => void
  programState: StageState | null
  programBlocks: PreviewBlock[]
  showAudienceCue: boolean
  audienceCueRegion: string
  audienceCueMoonMode: boolean
  audienceCueQuestionLabel: string
  isTransitioning: boolean
  transitionFromState: StageState | null
  transitionFromBlocks: PreviewBlock[]
  transitionFadingOut: boolean
  sceneName: string
  onSceneNameChange: (value: string) => void
  onSaveScene: () => void
  sceneBusy: boolean
  scenes: Array<{ id: string; name: string }>
  onApplyScene: (sceneId: string) => void
  onClearScreenShare: () => void
  onUnpin: () => void
  onClearPrimary: () => void
  setError: (value: string | null) => void
  addTestTextBlock: () => void
  addTestVideoBlock: () => void
  addTestPdfBlock: () => void
  addTestImageBlock: () => void
  onUploadPdf: () => void
  onUploadVideo: () => void
  onUploadImage: () => void
  duplicateSelectedBlock: () => void
  bringSelectedBlockToFront: () => void
  deleteSelectedBlock: () => void
}): JSX.Element {
  return (
    <div className="space-y-5 xl:col-start-2">
      <AudienceOriginTestPanel
        onTriggerCue={triggerAudienceCue}
        onHideCue={onHideAudienceCue}
      />

      <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,18,42,0.92),rgba(5,8,22,0.98))] p-4 xl:p-4 2xl:p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        <div className="mb-4">
          <div className="text-[11px] uppercase tracking-[0.22em] text-white/35">
            Switcher
          </div>
          <div className="mt-1 text-lg font-semibold text-white">
            Preview → Program
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.08fr_88px_1.18fr] 2xl:grid-cols-[1fr_96px_1.22fr]">
  {/* PREVIEW */}
  <div className="rounded-[28px] border border-sky-300/15 bg-[#07111f] p-3 shadow-[0_24px_80px_rgba(14,165,233,0.08)]">
    <MonitorHeader
      title="Preview"
      subtitle="Next shot"
      tone="preview"
      badge={
        <span className="rounded-full border border-sky-300/20 bg-sky-400/10 px-3 py-1 text-[11px] font-semibold text-sky-200">
          {previewProgramDifferent ? "Changed" : "Ready"}
        </span>
      }
    />

    <div
      className="relative mt-3 h-[560px] overflow-hidden rounded-[22px] border border-white/10 bg-black xl:h-[650px] 2xl:h-[760px]"
      onMouseMove={onPreviewCanvasMouseMove}
      onMouseUp={stopDraggingBlock}
      onMouseLeave={stopDraggingBlock}
      onClick={onClearSelectedBlock}
    >
      <StageVideoPreview
        stageState={stageState}
        participantIds={onStageParticipants.map((p) => p.identity)}
      />

      {renderPlacedBlocks({
        blocks: previewBlocks,
        opts: {
          selectable: true,
          showChrome: true,
          selectedBlockId,
        },
        selectedBlockId,
        setSelectedBlockId,
        startDraggingBlock,
        startResizingBlock,
      })}

      <div className="pointer-events-none absolute bottom-4 left-4 rounded-full border border-white/10 bg-black/60 px-3 py-1 text-[11px] font-semibold text-white/70">
        PREVIEW
      </div>
    </div>
  </div>

  {/* TAKE BRIDGE */}
  <div className="hidden xl:flex flex-col items-center justify-center gap-4">
    <div className="h-full w-px bg-gradient-to-b from-transparent via-white/10 to-transparent" />

    <div className="rounded-[26px] border border-red-300/25 bg-[linear-gradient(180deg,#7f1d1d,#ef4444)] px-5 py-4 shadow-[0_20px_60px_rgba(239,68,68,0.35)]">
      <div className="text-center text-[11px] font-black uppercase tracking-[0.24em] text-white">
        TAKE
      </div>
    </div>

    <div className="h-full w-px bg-gradient-to-b from-transparent via-white/10 to-transparent" />
  </div>

  {/* PROGRAM */}
  <div className="rounded-[30px] border border-red-400/18 bg-[#170b0d] p-3 shadow-[0_30px_100px_rgba(239,68,68,0.14)]">
    <MonitorHeader
      title="Program"
      subtitle="Live output"
      tone="program"
      badge={
        <span className="rounded-full border border-red-400/20 bg-red-500/10 px-3 py-1 text-[11px] font-semibold text-red-200">
          {programState?.is_live ? "LIVE" : "STANDBY"}
        </span>
      }
    />

    <div className="relative mt-3 h-[590px] overflow-hidden rounded-[24px] border border-red-400/15 bg-black xl:h-[690px] 2xl:h-[800px] shadow-[0_0_0_1px_rgba(239,68,68,0.08)]">
      <StageVideoPreview
        stageState={programState}
        participantIds={programState?.stage_participant_ids || []}
      />

      {renderPlacedBlocks({
        blocks: programBlocks,
        opts: {
          selectable: false,
          showChrome: false,
        },
        selectedBlockId,
        setSelectedBlockId,
        startDraggingBlock,
        startResizingBlock,
      })}

      <div className="absolute inset-0 z-30 pointer-events-none p-4">
        <AudienceOriginCue
          visible={showAudienceCue}
          region={audienceCueRegion}
          moonMode={audienceCueMoonMode}
          entering
          questionLabel={audienceCueQuestionLabel}
          compact
          broadcast
        />
      </div>

      <div className="pointer-events-none absolute left-4 top-4 flex items-center gap-2 rounded-full border border-red-400/25 bg-black/60 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-red-200">
        <span
          className={`h-2.5 w-2.5 rounded-full ${
            programState?.is_live ? "animate-pulse bg-red-400" : "bg-white/30"
          }`}
        />
        LIVE
      </div>

      <div className="pointer-events-none absolute bottom-4 left-4 rounded-full border border-red-400/20 bg-black/60 px-3 py-1 text-[11px] font-semibold text-red-200">
        PROGRAM
      </div>
    </div>
  </div>
</div>
        <MediaBlocksPanel
          previewBlocksCount={previewBlocks.length}
          onAddText={addTestTextBlock}
          onAddVideo={addTestVideoBlock}
          onAddPdf={addTestPdfBlock}
          onAddImage={addTestImageBlock}
          onUploadPdf={onUploadPdf}
          onUploadVideo={onUploadVideo}
          onUploadImage={onUploadImage}
          onDuplicate={duplicateSelectedBlock}
          onBringToFront={bringSelectedBlockToFront}
          onDelete={deleteSelectedBlock}
          hasSelectedBlock={Boolean(selectedBlockId)}
        />

        <ScenesStatusPanel
          sceneName={sceneName}
          onSceneNameChange={onSceneNameChange}
          onSaveScene={onSaveScene}
          sceneBusy={sceneBusy}
          stageState={stageState}
          scenes={scenes}
          onApplyScene={onApplyScene}
          onClearScreenShare={onClearScreenShare}
          onUnpin={onUnpin}
          onClearPrimary={onClearPrimary}
        />
      </div>
    </div>
  )
}
export default function ProducerRoomClient({
  eventId,
  sessionId,
}: {
  eventId: string
  sessionId: string
}) {
  const [token, setToken] = useState<string | null>(null)
  const [serverUrl, setServerUrl] = useState<string | null>(null)
  const [participants, setParticipants] = useState<ProducerParticipant[]>([])
  const [stageState, setStageState] = useState<StageState | null>(null)
  const [loadingText, setLoadingText] = useState("Connecting producer...")
  const [error, setError] = useState<string | null>(null)

  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([])
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedVideoDeviceId, setSelectedVideoDeviceId] = useState("")
  const [selectedAudioDeviceId, setSelectedAudioDeviceId] = useState("")
  const [deviceAccessReady, setDeviceAccessReady] = useState(false)

  const [scenes, setScenes] = useState<any[]>([])
  const [sceneName, setSceneName] = useState("")
  const [sceneBusy, setSceneBusy] = useState(false)
  const [localSceneSnapshots, setLocalSceneSnapshots] = useState<SceneSnapshot[]>([])

  const [autoDirectorEnabled, setAutoDirectorEnabled] = useState(true)
  const [takeBusy, setTakeBusy] = useState(false)

  const [programState, setProgramState] = useState<StageState | null>(null)


  const pdfInputRef = useRef<HTMLInputElement | null>(null)
  const videoInputRef = useRef<HTMLInputElement | null>(null)
  const imageInputRef = useRef<HTMLInputElement | null>(null)

  const localPreviewStreamRef = useRef<MediaStream | null>(null)

  const [isTransitioning, setIsTransitioning] = useState(false)
  const [transitionFromState, setTransitionFromState] = useState<StageState | null>(null)
  const [transitionFromBlocks, setTransitionFromBlocks] = useState<PreviewBlock[]>([])
  const [transitionFadingOut, setTransitionFadingOut] = useState(false)
    const [showAudienceCue, setShowAudienceCue] = useState(false)
  const [audienceCueRegion, setAudienceCueRegion] = useState("Europe")
  const [audienceCueMoonMode, setAudienceCueMoonMode] = useState(false)
  const [audienceCueQuestionLabel, setAudienceCueQuestionLabel] = useState(
    "How are outcomes differing across regions?"
  )
  const audienceCueTimeoutRef = useRef<number | null>(null)
    const producerScopeLabel = useMemo(() => {
    return sessionId ? `Session ${sessionId.slice(0, 8)}` : "Session"
  }, [sessionId])
  const api = useProducerRoomApi(eventId, sessionId)
    const {
    previewBlocks,
    setPreviewBlocks,
    programBlocks,
    setProgramBlocks,
    selectedBlockId,
    setSelectedBlockId,
    draggingBlockId,
    setDraggingBlockId,
    resizingBlockId,
    setResizingBlockId,
    dragOffset,
    setDragOffset,
    previewCanvasRect,
    setPreviewCanvasRect,
    selectedBlock,
    addTestTextBlock,
    addTestVideoBlock,
    addTestPdfBlock,
    addTestImageBlock,
    deleteSelectedBlock,
    duplicateSelectedBlock,
    bringSelectedBlockToFront,
  } = useProducerBlocks()
const stopLocalPreviewStream = useCallback(() => {
  if (!localPreviewStreamRef.current) return

  localPreviewStreamRef.current.getTracks().forEach((track) => track.stop())
  localPreviewStreamRef.current = null
}, [])


  async function loadToken() {
    const data = await api.loadToken()
    setToken(data.token)
    setServerUrl(process.env.NEXT_PUBLIC_LIVEKIT_URL || "")
  }

  async function loadParticipants() {
    const data = await api.loadParticipants()
    setParticipants(Array.isArray(data?.participants) ? data.participants : [])
  }

  async function loadProgramState() {
    const data = await api.loadProgramState()
    setProgramState(data?.state ?? null)
  }

  async function loadStageState() {
    const data = await api.loadStageState()
    setStageState(data?.state ?? null)
  }

  async function loadScenes() {
    const data = await api.loadScenes()
    setScenes(Array.isArray(data?.scenes) ? data.scenes : [])
  }

const loadMediaDevices = useCallback(async () => {
  try {
    const tempStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    })

    const devices = await navigator.mediaDevices.enumerateDevices()

    tempStream.getTracks().forEach((track) => track.stop())

    const videos = devices.filter((device) => device.kind === "videoinput")
    const audios = devices.filter((device) => device.kind === "audioinput")

    setVideoDevices(videos)
    setAudioDevices(audios)

    setSelectedVideoDeviceId((prev) =>
      prev && videos.some((device) => device.deviceId === prev)
        ? prev
        : videos[0]?.deviceId || ""
    )

    setSelectedAudioDeviceId((prev) =>
      prev && audios.some((device) => device.deviceId === prev)
        ? prev
        : audios[0]?.deviceId || ""
    )

    setDeviceAccessReady(videos.length > 0 || audios.length > 0)
  } catch (err) {
    console.error("Failed to load media devices", err)
    setDeviceAccessReady(false)
    setVideoDevices([])
    setAudioDevices([])
    setSelectedVideoDeviceId("")
    setSelectedAudioDeviceId("")
  }
}, [])

  const refreshAll = useCallback(async () => {
    await Promise.all([loadParticipants(), loadStageState(), loadProgramState(), loadScenes()])
  }, [])

  async function addToStage(identity: string) {
    const data = await api.addToStage(identity)
    setStageState(data.state)
  }

  async function removeFromStage(identity: string) {
    const data = await api.removeFromStage(identity)
    setStageState(data.state)
  }

  async function pinParticipant(identity: string) {
    const data = await api.pinParticipant(identity)
    setStageState(data.state)
  }

  async function unpinParticipant() {
    const data = await api.unpinParticipant()
    setStageState(data.state)
  }

async function setPrimaryParticipant(identity: string) {
  const data = await api.setPrimaryParticipant(identity)
  setStageState(data.state)
}

async function clearPrimaryParticipant() {
  const data = await api.clearPrimaryParticipant()
  setStageState(data.state)
}

  async function saveScene() {
    if (!sceneName.trim()) {
      setError("Scene name required")
      return
    }

    try {
      setSceneBusy(true)

      const data = await api.saveScene(sceneName)

      const savedSceneId = String(data?.scene?.id ?? crypto.randomUUID())

      setLocalSceneSnapshots((prev) => {
        const next = prev.filter((s) => s.id !== savedSceneId)
        next.push({
          id: savedSceneId,
          name: sceneName,
          stageState: stageState ? { ...stageState } : null,
          previewBlocks: previewBlocks.map((b) => ({ ...b })),
        })
        return next
      })

      setSceneName("")
      await loadScenes()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSceneBusy(false)
    }
  }

  async function applyScene(sceneId: string) {
    try {
      setSceneBusy(true)

      const data = await api.applyScene(sceneId)

      setStageState(data.state)

      const localSnapshot = localSceneSnapshots.find((s) => s.id === sceneId)
      if (localSnapshot) {
        setPreviewBlocks(localSnapshot.previewBlocks.map((b) => ({ ...b })))
        setSelectedBlockId(null)
      }

      await refreshAll()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSceneBusy(false)
    }
  }

async function setAutoDirector(enabled: boolean) {
  const data = await api.setAutoDirector(enabled)
  setStageState(data.state)
  setAutoDirectorEnabled(Boolean(data?.state?.auto_director_enabled))
}

  async function goLive() {
    const data = await api.goLive()
    setStageState(data.state)
  }

  async function goOffAir() {
    const data = await api.goOffAir()
    setStageState(data.state)
  }

async function setLayout(layout: "solo" | "grid" | "screen_speaker") {
  const data = await api.setLayout(layout)
  setStageState(data.state)
}

async function setScreenShare(participantId: string, trackId: string) {
  const data = await api.setScreenShare(participantId, trackId)
  setStageState(data.state)
}

async function clearScreenShare() {
  const data = await api.clearScreenShare()
  setStageState(data.state)
}

  async function takeProgram() {
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
    }, 450)

    return data?.state ?? null
  }

  function handlePdfUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const src = URL.createObjectURL(file)

    setPreviewBlocks((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type: "pdf",
        x: 120,
        y: 90,
        width: 420,
        height: 260,
        zIndex: Math.max(...prev.map((b) => b.zIndex), 0) + 1,
        opacity: 1,
        label: file.name.replace(/\.[^/.]+$/, "") || "Uploaded PDF",
        src,
        hidden: false,
      },
    ])

    e.target.value = ""
  }

  function handleVideoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const src = URL.createObjectURL(file)

    setPreviewBlocks((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type: "video",
        x: 100,
        y: 100,
        width: 420,
        height: 236,
        zIndex: Math.max(...prev.map((b) => b.zIndex), 0) + 1,
        opacity: 1,
        label: file.name.replace(/\.[^/.]+$/, "") || "Uploaded Video",
        src,
        hidden: false,
      },
    ])

    e.target.value = ""
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const src = URL.createObjectURL(file)

    setPreviewBlocks((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type: "image",
        x: 100,
        y: 100,
        width: 260,
        height: 140,
        zIndex: Math.max(...prev.map((b) => b.zIndex), 0) + 1,
        opacity: 1,
        label: file.name.replace(/\.[^/.]+$/, "") || "Uploaded Image",
        src,
        hidden: false,
      },
    ])

    e.target.value = ""
  }

  function startDraggingBlock(e: React.MouseEvent<HTMLDivElement>, blockId: string) {
    const rect = e.currentTarget.parentElement?.getBoundingClientRect() || null
    if (!rect) return

    const block = previewBlocks.find((b) => b.id === blockId)
    if (!block) return

    setPreviewCanvasRect(rect)
    setDraggingBlockId(blockId)
    setDragOffset({
      x: e.clientX - rect.left - block.x,
      y: e.clientY - rect.top - block.y,
    })
  }

  function startResizingBlock(e: React.MouseEvent<HTMLDivElement>, blockId: string) {
    e.stopPropagation()

    const rect = e.currentTarget.parentElement?.getBoundingClientRect() || null
    if (!rect) return

    setPreviewCanvasRect(rect)
    setResizingBlockId(blockId)
    setSelectedBlockId(blockId)
  }

  function onPreviewCanvasMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!previewCanvasRect) return

    if (resizingBlockId) {
      setPreviewBlocks((prev) =>
        prev.map((block) => {
          if (block.id !== resizingBlockId) return block

          const nextWidth = e.clientX - previewCanvasRect.left - block.x
          const nextHeight = e.clientY - previewCanvasRect.top - block.y

          return {
            ...block,
            width: Math.max(80, nextWidth),
            height: Math.max(60, nextHeight),
          }
        })
      )
      return
    }

    if (!draggingBlockId) return

    const nextX = e.clientX - previewCanvasRect.left - dragOffset.x
    const nextY = e.clientY - previewCanvasRect.top - dragOffset.y

    setPreviewBlocks((prev) =>
      prev.map((block) =>
        block.id === draggingBlockId
          ? {
              ...block,
              x: Math.max(0, nextX),
              y: Math.max(0, nextY),
            }
          : block
      )
    )
  }

  function stopDraggingBlock() {
    setDraggingBlockId(null)
    setResizingBlockId(null)
  }

  function updateSelectedTextBlockContent(value: string) {
    if (!selectedBlockId) return

    setPreviewBlocks((prev) =>
      prev.map((block) =>
        block.id === selectedBlockId && block.type === "text"
          ? {
              ...block,
              content: value,
            }
          : block
      )
    )
  }

  function updateSelectedBlockSize(field: "width" | "height", value: string) {
    if (!selectedBlockId) return

    const numericValue = Number(value)
    if (!Number.isFinite(numericValue)) return

    setPreviewBlocks((prev) =>
      prev.map((block) =>
        block.id === selectedBlockId
          ? {
              ...block,
              [field]: Math.max(field === "width" ? 80 : 60, numericValue),
            }
          : block
      )
    )
  }

  function updateSelectedBlockOpacity(value: string) {
    if (!selectedBlockId) return

    const numericValue = Number(value)
    if (!Number.isFinite(numericValue)) return

    setPreviewBlocks((prev) =>
      prev.map((block) =>
        block.id === selectedBlockId
          ? {
              ...block,
              opacity: Math.max(0.1, Math.min(1, numericValue)),
            }
          : block
      )
    )
  }

  function toggleSelectedBlockHidden() {
    if (!selectedBlockId) return

    setPreviewBlocks((prev) =>
      prev.map((block) =>
        block.id === selectedBlockId
          ? {
              ...block,
              hidden: !block.hidden,
            }
          : block
      )
    )
  }

  function updateSelectedBlockPosition(field: "x" | "y", value: string) {
    if (!selectedBlockId) return

    const numericValue = Number(value)
    if (!Number.isFinite(numericValue)) return

    setPreviewBlocks((prev) =>
      prev.map((block) =>
        block.id === selectedBlockId
          ? {
              ...block,
              [field]: Math.max(0, numericValue),
            }
          : block
      )
    )
  }

  function updateSelectedBlockLabel(value: string) {
    if (!selectedBlockId) return

    setPreviewBlocks((prev) =>
      prev.map((block) =>
        block.id === selectedBlockId
          ? {
              ...block,
              label: value,
            }
          : block
      )
    )
  }

  function updateSelectedBlockSrc(value: string) {
    if (!selectedBlockId) return

    setPreviewBlocks((prev) =>
      prev.map((block) =>
        block.id === selectedBlockId
          ? {
              ...block,
              src: value,
            }
          : block
      )
    )
  }
  function triggerAudienceCue(options?: {
    region?: string
    moonMode?: boolean
    questionLabel?: string
    durationMs?: number
  }) {
    if (audienceCueTimeoutRef.current) {
      window.clearTimeout(audienceCueTimeoutRef.current)
    }

    setAudienceCueRegion(options?.region ?? "Europe")
    setAudienceCueMoonMode(options?.moonMode ?? false)
    setAudienceCueQuestionLabel(
      options?.questionLabel ?? "How are outcomes differing across regions?"
    )
    setShowAudienceCue(true)

    audienceCueTimeoutRef.current = window.setTimeout(() => {
      setShowAudienceCue(false)
      audienceCueTimeoutRef.current = null
    }, options?.durationMs ?? 5000)
  }





  function getScreenTrackSid(participant: ProducerParticipant) {
    const track = participant.tracks.find((t) => t.source === 3 || t.source === "SCREEN_SHARE")
    return track?.sid ?? null
  }



  useEffect(() => {
    let mounted = true

    async function boot() {
      try {
        setError(null)
        setLoadingText("Creating producer token...")
        await loadToken()
        if (!mounted) return

        await loadMediaDevices()
        if (!mounted) return

        setLoadingText("Loading room state...")
        await refreshAll()
      } catch (err: any) {
        if (!mounted) return
        setError(err?.message || "Failed to load producer room")
      }
    }

    void boot()

    return () => {
      mounted = false
    }
  }, [eventId, sessionId, loadMediaDevices, refreshAll])

  useEffect(() => {
    const id = window.setInterval(() => {
      void refreshAll().catch(() => {})
    }, 3000)

    return () => window.clearInterval(id)
  }, [refreshAll])

  useEffect(() => {
    if (typeof stageState?.auto_director_enabled === "boolean") {
      setAutoDirectorEnabled(stageState.auto_director_enabled)
    }
  }, [stageState?.auto_director_enabled])

useEffect(() => {
  if (!deviceAccessReady) return

  let cancelled = false

  async function start() {
    try {
      stopLocalPreviewStream()

      const videoExists =
        !selectedVideoDeviceId ||
        videoDevices.some((device) => device.deviceId === selectedVideoDeviceId)

      const audioExists =
        !selectedAudioDeviceId ||
        audioDevices.some((device) => device.deviceId === selectedAudioDeviceId)

      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoExists
          ? selectedVideoDeviceId
            ? { deviceId: { exact: selectedVideoDeviceId } }
            : true
          : true,
        audio: audioExists
          ? selectedAudioDeviceId
            ? { deviceId: { exact: selectedAudioDeviceId } }
            : true
          : true,
      })

      if (cancelled) {
        stream.getTracks().forEach((track) => track.stop())
        return
      }

      localPreviewStreamRef.current = stream
    } catch (err) {
      console.error("Preview start failed", err)
    }
  }

  void start()

  return () => {
    cancelled = true
    stopLocalPreviewStream()
  }
}, [
  deviceAccessReady,
  selectedVideoDeviceId,
  selectedAudioDeviceId,
  videoDevices,
  audioDevices,
  stopLocalPreviewStream,
])

const stageIds = useMemo(() => new Set(stageState?.stage_participant_ids || []), [stageState])

const onStageParticipants = useMemo(() => participants.filter((p) => stageIds.has(p.identity)), [participants, stageIds])


const firstOnStageScreenShare = useMemo(
  () =>
    onStageParticipants.find((p) => {
      if (!p.screenShareEnabled) return false

      const screenTrack = p.tracks.find(
        (t) => t.source === 3 || t.source === "SCREEN_SHARE"
      )

      return Boolean(screenTrack?.sid)
    }),
  [onStageParticipants]
)

const selectedScreenStillExists = useMemo(
  () =>
    onStageParticipants.some((p) => {
      if (p.identity !== stageState?.screen_share_participant_id) return false

      return p.tracks.some(
        (t) =>
          (t.source === 3 || t.source === "SCREEN_SHARE") &&
          t.sid === stageState?.screen_share_track_id
      )
    }),
  [
    onStageParticipants,
    stageState?.screen_share_participant_id,
    stageState?.screen_share_track_id,
  ]
)


const previewProgramDifferent = useMemo(
  () =>
    JSON.stringify({
      layout: stageState?.layout ?? null,
      stage_participant_ids: stageState?.stage_participant_ids ?? [],
      primary_participant_id: stageState?.primary_participant_id ?? null,
      pinned_participant_id: stageState?.pinned_participant_id ?? null,
      screen_share_participant_id: stageState?.screen_share_participant_id ?? null,
      screen_share_track_id: stageState?.screen_share_track_id ?? null,
      is_live: stageState?.is_live ?? false,
      blocks: previewBlocks,
    }) !==
    JSON.stringify({
      layout: programState?.layout ?? null,
      stage_participant_ids: programState?.stage_participant_ids ?? [],
      primary_participant_id: programState?.primary_participant_id ?? null,
      pinned_participant_id: programState?.pinned_participant_id ?? null,
      screen_share_participant_id: programState?.screen_share_participant_id ?? null,
      screen_share_track_id: programState?.screen_share_track_id ?? null,
      is_live: programState?.is_live ?? false,
      blocks: programBlocks,
    }),
  [stageState, programState, previewBlocks, programBlocks]
)

  useEffect(() => {
    if (!autoDirectorEnabled) return
    if (!stageState) return
    if (stageState.layout !== "screen_speaker") return
    if (stageState.screen_share_track_id) return
    if (!firstOnStageScreenShare) return

    const screenTrack = firstOnStageScreenShare.tracks.find(
      (t) => t.source === 3 || t.source === "SCREEN_SHARE"
    )

    if (!screenTrack?.sid) return

    void setScreenShare(firstOnStageScreenShare.identity, screenTrack.sid).catch(
  (_err: unknown): void => {}
)
  }, [autoDirectorEnabled, stageState, firstOnStageScreenShare])

  useEffect(() => {
    if (!stageState?.screen_share_track_id) return
    if (selectedScreenStillExists) return

    void clearScreenShare().catch((_err: unknown): void => {})
  }, [stageState?.screen_share_track_id, selectedScreenStillExists])

  useEffect(() => {
    return () => {
      if (audienceCueTimeoutRef.current) {
        window.clearTimeout(audienceCueTimeoutRef.current)
      }
      stopLocalPreviewStream()
    }
  }, [stopLocalPreviewStream])

  if (error) {
    return <div className="p-8 text-red-400">{error}</div>
  }

  if (!token || !serverUrl) {
    return <div className="p-8 text-white">{loadingText}</div>
  }

      return (
  <LiveKitRoom token={token} serverUrl={serverUrl} connect video audio>
    <RoomAudioRenderer />

    <div className="flex min-h-screen flex-col bg-[radial-gradient(circle_at_top,#0b1736_0%,#050816_45%,#02040b_100%)] text-white">
      <input
        ref={pdfInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handlePdfUpload}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={handleVideoUpload}
      />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageUpload}
      />

<div className="border-b border-white/10 bg-[linear-gradient(180deg,rgba(3,7,18,0.98),rgba(2,6,23,0.94))] px-4 py-4 shadow-[0_18px_70px_rgba(0,0,0,0.38)] md:px-6 xl:px-8 2xl:px-10">
  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
    <div className="flex min-w-0 items-center gap-4">
      <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] border border-sky-300/20 bg-sky-400/10 shadow-[0_0_40px_rgba(56,189,248,0.22)]">
        <div className="h-6 w-6 rounded-full border border-sky-200/70 bg-[radial-gradient(circle_at_35%_25%,rgba(255,255,255,0.95),rgba(56,189,248,0.45)_35%,rgba(79,70,229,0.3)_70%)] shadow-[0_0_26px_rgba(125,211,252,0.65)]" />
        <div className="absolute h-8 w-11 -rotate-12 rounded-full border border-sky-200/35" />
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.32em] text-white/35">
          <span>Jupiter</span>
          <span className="text-white/20">•</span>
          <span>Mission Control</span>
          <span className="text-white/20">•</span>
          <span>{producerScopeLabel}</span>
        </div>

        <div className="mt-2 flex flex-wrap items-end gap-3">
          <h1 className="truncate text-3xl font-semibold leading-none tracking-[-0.04em] text-white">
            {stageState?.headline || "Live Production"}
          </h1>

          <span className="rounded-full border border-sky-300/20 bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-100">
            {stageState?.layout === "screen_speaker"
              ? "Speaker + Screen"
              : stageState?.layout === "grid"
                ? "Grid"
                : "Solo"}
          </span>
        </div>
      </div>
    </div>

    <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[720px] xl:grid-cols-[1fr_1fr_1.25fr]">
      <div className="rounded-[24px] border border-red-400/20 bg-red-500/10 p-4 shadow-[0_0_40px_rgba(239,68,68,0.08)]">
        <div className="text-[10px] uppercase tracking-[0.24em] text-red-100/70">
          Program
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${programState?.is_live ? "animate-pulse bg-red-400 shadow-[0_0_18px_rgba(248,113,113,0.9)]" : "bg-white/25"}`} />
          <span className="text-lg font-semibold text-white">
            {programState?.is_live ? "On Air" : "Holding"}
          </span>
        </div>
      </div>

      <div className="rounded-[24px] border border-white/10 bg-white/[0.045] p-4">
        <div className="text-[10px] uppercase tracking-[0.24em] text-white/35">
          Show State
        </div>
        <div className="mt-2 text-lg font-semibold text-white">
          {previewProgramDifferent ? "Preview Changed" : "In Sync"}
        </div>
        <div className="mt-1 text-xs text-white/40">
          {onStageParticipants.length} talent · {previewBlocks.length} overlays
        </div>
      </div>

      <div className="rounded-[24px] border border-emerald-300/15 bg-emerald-500/[0.06] p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-[10px] uppercase tracking-[0.24em] text-emerald-100/60">
            Audio Meters
          </div>
          <div className="rounded-full border border-emerald-300/20 bg-black/25 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-emerald-100/80">
            Live
          </div>
        </div>

        <div className="space-y-3">
          {["Host", "Guest", "Program"].map((label, rowIndex) => (
            <div key={label} className="grid grid-cols-[64px_1fr] items-center gap-3">
              <div className="text-xs text-white/55">{label}</div>
              <div className="flex h-3 items-center gap-1 rounded-full bg-black/35 px-1">
                {Array.from({ length: 18 }).map((_, index) => {
                  const active =
                    index < (rowIndex === 0 ? 13 : rowIndex === 1 ? 9 : 15)

                  return (
                    <div
                      key={`${label}-${index}`}
                      className={`h-1.5 flex-1 rounded-full ${
                        active
                          ? index > 14
                            ? "bg-red-400"
                            : index > 11
                              ? "bg-amber-300"
                              : "bg-emerald-400"
                          : "bg-white/10"
                      }`}
                    />
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
</div>

            <div className="flex-1 bg-[radial-gradient(circle_at_50%_0%,rgba(56,189,248,0.08),transparent_35%),linear-gradient(180deg,rgba(2,6,23,0.96),rgba(2,6,23,1))] px-4 py-5 md:px-6 xl:px-8 2xl:px-10">
  <div className="grid w-full gap-5 xl:grid-cols-[270px_minmax(0,1fr)_350px] 2xl:grid-cols-[290px_minmax(0,1fr)_380px]">
    <div className="space-y-4 rounded-[34px] border border-white/10 bg-black/25 p-3 shadow-[0_24px_80px_rgba(0,0,0,0.32)] backdrop-blur-xl xl:col-start-1">
      <ControlStackPanel
        takeBusy={takeBusy}
        previewProgramDifferent={previewProgramDifferent}
        onTake={() => {
          void (async () => {
            try {
              setTakeBusy(true)
              setError(null)
              await takeProgram()
            } catch (e: any) {
              setError(e.message)
            } finally {
              setTakeBusy(false)
            }
          })()
        }}
        onGoLive={() =>
          void goLive().catch((e: unknown) =>
            setError(e instanceof Error ? e.message : "Unexpected error")
          )
        }
        onGoOffAir={() =>
          void goOffAir().catch((e: unknown) =>
            setError(e instanceof Error ? e.message : "Unexpected error")
          )
        }
        layout={stageState?.layout}
        onSetLayout={(layout) =>
          void setLayout(layout).catch((e: unknown) =>
            setError(e instanceof Error ? e.message : "Unexpected error")
          )
        }
        autoDirectorEnabled={autoDirectorEnabled}
        onToggleAutoDirector={() =>
          void setAutoDirector(!autoDirectorEnabled).catch((e: unknown) =>
            setError(e instanceof Error ? e.message : "Unexpected error")
          )
        }
      />

      <DeviceSelectorPanel
        deviceAccessReady={deviceAccessReady}
        videoDevices={videoDevices}
        audioDevices={audioDevices}
        selectedVideoDeviceId={selectedVideoDeviceId}
        selectedAudioDeviceId={selectedAudioDeviceId}
        onSelectVideoDevice={setSelectedVideoDeviceId}
        onSelectAudioDevice={setSelectedAudioDeviceId}
      />
    </div>
<div className="min-w-0 rounded-[38px] border border-white/10 bg-black/20 p-3 shadow-[0_30px_120px_rgba(0,0,0,0.42)] backdrop-blur-xl"></div>
    <CenterSwitcherColumn
      triggerAudienceCue={triggerAudienceCue}
      onHideAudienceCue={() => setShowAudienceCue(false)}
      previewProgramDifferent={previewProgramDifferent}
      onPreviewCanvasMouseMove={onPreviewCanvasMouseMove}
      stopDraggingBlock={stopDraggingBlock}
      onClearSelectedBlock={() => setSelectedBlockId(null)}
      stageState={stageState}
      onStageParticipants={onStageParticipants}
      previewBlocks={previewBlocks}
      selectedBlockId={selectedBlockId}
      setSelectedBlockId={setSelectedBlockId}
      startDraggingBlock={startDraggingBlock}
      startResizingBlock={startResizingBlock}
      programState={programState}
      programBlocks={programBlocks}
      showAudienceCue={showAudienceCue}
      audienceCueRegion={audienceCueRegion}
      audienceCueMoonMode={audienceCueMoonMode}
      audienceCueQuestionLabel={audienceCueQuestionLabel}
      isTransitioning={isTransitioning}
      transitionFromState={transitionFromState}
      transitionFromBlocks={transitionFromBlocks}
      transitionFadingOut={transitionFadingOut}
      sceneName={sceneName}
      onSceneNameChange={setSceneName}
      onSaveScene={saveScene}
      sceneBusy={sceneBusy}
      scenes={scenes}
      onApplyScene={(sceneId) => void applyScene(sceneId)}
      onClearScreenShare={() =>
        void clearScreenShare().catch((e: unknown) =>
          setError(e instanceof Error ? e.message : "Unexpected error")
        )
      }
      onUnpin={() =>
        void unpinParticipant().catch((e: unknown) =>
          setError(e instanceof Error ? e.message : "Unexpected error")
        )
      }
      onClearPrimary={() =>
        void clearPrimaryParticipant().catch((e: unknown) =>
          setError(e instanceof Error ? e.message : "Unexpected error")
        )
      }
      setError={setError}
      addTestTextBlock={addTestTextBlock}
      addTestVideoBlock={addTestVideoBlock}
      addTestPdfBlock={addTestPdfBlock}
      addTestImageBlock={addTestImageBlock}
      onUploadPdf={() => pdfInputRef.current?.click()}
      onUploadVideo={() => videoInputRef.current?.click()}
      onUploadImage={() => imageInputRef.current?.click()}
      duplicateSelectedBlock={duplicateSelectedBlock}
      bringSelectedBlockToFront={bringSelectedBlockToFront}
      deleteSelectedBlock={deleteSelectedBlock}
    />
</div>
<div className="min-w-0 rounded-[34px] border border-white/10 bg-black/25 p-3 shadow-[0_24px_80px_rgba(0,0,0,0.32)] backdrop-blur-xl">
    <RightInspectorRail
            selectedBlock={selectedBlock}
            onToggleHidden={toggleSelectedBlockHidden}
            onUpdateOpacity={updateSelectedBlockOpacity}
            onUpdateLabel={updateSelectedBlockLabel}
            onUpdatePosition={updateSelectedBlockPosition}
            onUpdateSize={updateSelectedBlockSize}
            onUpdateSrc={updateSelectedBlockSrc}
            onUpdateTextContent={updateSelectedTextBlockContent}
            participants={participants}
            stageIds={stageIds}
            stageState={stageState}
            getScreenTrackSid={getScreenTrackSid}
            onAddToStage={(identity) =>
              void addToStage(identity).catch((e: unknown) =>
                setError(e instanceof Error ? e.message : "Unexpected error")
              )
            }
            onSetScreenShare={(participantId, trackId) =>
              void setScreenShare(participantId, trackId).catch((e: unknown) =>
                setError(e instanceof Error ? e.message : "Unexpected error")
              )
            }
            onClearPrimary={() =>
              void clearPrimaryParticipant().catch((e: unknown) =>
                setError(e instanceof Error ? e.message : "Unexpected error")
              )
            }
            onSetPrimary={(identity) =>
              void setPrimaryParticipant(identity).catch((e: unknown) =>
                setError(e instanceof Error ? e.message : "Unexpected error")
              )
            }
            onUnpin={() =>
              void unpinParticipant().catch((e: unknown) =>
                setError(e instanceof Error ? e.message : "Unexpected error")
              )
            }
            onPin={(identity) =>
              void pinParticipant(identity).catch((e: unknown) =>
                setError(e instanceof Error ? e.message : "Unexpected error")
              )
            }
            onRemoveFromStage={(identity) =>
              void removeFromStage(identity).catch((e: unknown) =>
                setError(e instanceof Error ? e.message : "Unexpected error")
              )
            }
                       onError={setError}
          />
        </div>
      </div>
    </div>
  </LiveKitRoom>
)
}