import type { JSX } from "react"
import {
  Archive,
  Cpu,
  Globe2,
  Layers3,
  Radar,
  Radio,
  SatelliteDish,
  SlidersHorizontal,
  Sparkles,
  Users,
} from "lucide-react"
import type { PreviewBlock } from "./useProducerBlocks"
import BackstagePanel from "./BackstagePanel"
import ParticipantCard from "./ParticipantCard"
import SelectedBlockInspector from "./SelectedBlockInspector"
import LayerStackPanel from "./LayerStackPanel"

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

function RightRailAtmosphere(): JSX.Element {
  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-violet-300/[0.010] via-sky-300/[0.005] to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent,rgba(255,255,255,0.006)_42%,transparent_64%)] animate-[rightRailSignalSweep_26s_ease-in-out_infinite]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.008] bg-[repeating-linear-gradient(to_bottom,rgba(255,255,255,0.010)_0px,rgba(255,255,255,0.010)_1px,transparent_1px,transparent_14px)]" />
      <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-violet-200/8 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-violet-300/[0.008] to-transparent" />
    </>
  )
}

function RailSectionLabel({
  icon,
  title,
  sub,
}: {
  icon: JSX.Element
  title: string
  sub: string
}): JSX.Element {
  return (
    <div className="relative flex items-center justify-between gap-2 overflow-hidden rounded-[14px] border border-white/[0.045] bg-[linear-gradient(180deg,rgba(255,255,255,0.018),rgba(255,255,255,0.007))] px-2 py-1 shadow-[0_5px_16px_rgba(0,0,0,0.09),inset_0_1px_0_rgba(255,255,255,0.018)] backdrop-blur-md transition-all duration-300 hover:border-white/8 hover:bg-white/[0.03]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent,rgba(255,255,255,0.01)_42%,transparent_64%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
      <div className="relative z-10 flex min-w-0 items-center gap-2.5">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-white/7 bg-[linear-gradient(180deg,rgba(255,255,255,0.036),rgba(255,255,255,0.012))] text-white/42 shadow-[0_4px_14px_rgba(0,0,0,0.08)]">
          {icon}
        </span>

        <div className="min-w-0">
          <div className="text-[8px] font-black uppercase tracking-[0.14em] text-white/24">
            {title}
          </div>
          <div className="truncate text-[11px] font-semibold text-white/50">
            {sub}
          </div>
        </div>
      </div>

      <div className="relative z-10 hidden rounded-full border border-violet-300/10 bg-violet-400/[0.055] px-1.5 py-0.5 text-[7px] font-black uppercase tracking-[0.10em] text-violet-100/34 xl:block">
        Ready
      </div>
    </div>
  )
}

function InspectorStatusChip({
  icon,
  label,
  value,
  tone = "neutral",
}: {
  icon: JSX.Element
  label: string
  value: string
  tone?: "neutral" | "sky" | "green" | "violet" | "amber"
}): JSX.Element {
  const toneClass =
    tone === "sky"
      ? "border-sky-300/10 bg-sky-400/[0.06] text-sky-100/52"
      : tone === "green"
        ? "border-emerald-300/10 bg-emerald-400/[0.06] text-emerald-100/52"
        : tone === "violet"
          ? "border-violet-300/10 bg-violet-400/[0.06] text-violet-100/52"
          : tone === "amber"
            ? "border-amber-300/10 bg-amber-400/[0.06] text-amber-100/52"
            : "border-white/7 bg-white/[0.032] text-white/32"

  return (
    <div className={`relative z-10 flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[7px] font-black uppercase tracking-[0.09em] ${toneClass}`}>
      <span className="opacity-58">{icon}</span>
      <span className="text-white/30">{label}</span>
      <span>{value}</span>
    </div>
  )
}

function InspectorTelemetryStrip(): JSX.Element {
  return (
    <div className="relative overflow-hidden rounded-[16px] border border-violet-300/[0.055] bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.022),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(56,189,248,0.014),transparent_32%),linear-gradient(180deg,rgba(12,12,26,0.86),rgba(4,6,12,0.96))] p-1.5 shadow-[0_7px_22px_rgba(0,0,0,0.16),inset_0_1px_0_rgba(255,255,255,0.020)]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent,rgba(255,255,255,0.01)_42%,transparent_64%)] animate-[rightRailSignalSweep_16s_ease-in-out_infinite]" />
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-violet-200/14 to-transparent" />
      <div className="relative z-10 flex items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.13em] text-violet-100/34">
            <Sparkles size={11} />
            Inspector
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.10em] text-white/26">
            <span className="rounded-full border border-white/6 bg-white/[0.03] px-2 py-0.5">
              Layers
            </span>
            <span className="rounded-full border border-white/6 bg-white/[0.03] px-2 py-0.5">
              Capture
            </span>
            <span className="rounded-full border border-white/6 bg-white/[0.03] px-2 py-0.5">
              Routing
            </span>
          </div>
        </div>

        <div className="rounded-full border border-violet-300/8 bg-violet-400/[0.045] px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.10em] text-violet-100/34 shadow-[0_0_6px_rgba(168,85,247,0.035)]">
          Ready
        </div>
      </div>

      <div className="relative z-10 mt-1.5 hidden flex-wrap gap-1 2xl:flex">
        <InspectorStatusChip
          icon={<SatelliteDish size={10} />}
          label="Signal"
          value="Stable"
          tone="green"
        />

        <InspectorStatusChip
          icon={<Globe2 size={10} />}
          label="Audience"
          value="Ready"
          tone="sky"
        />

        <InspectorStatusChip
          icon={<Cpu size={10} />}
          label="System"
          value="Normal"
          tone="amber"
        />

        <InspectorStatusChip
          icon={<Radar size={10} />}
          label="Control"
          value="Stable"
          tone="violet"
        />
      </div>

      <div className="relative z-10 mt-1.5 hidden grid-cols-3 gap-1 2xl:grid">
        {[
          {
            label: "Inspector",
            value: "Ready",
            tone: "border-sky-300/10 bg-sky-400/[0.06] text-sky-100/52",
          },
          {
            label: "Routing",
            value: "Ready",
            tone: "border-emerald-300/10 bg-emerald-400/[0.06] text-emerald-100/52",
          },
          {
            label: "Capture",
            value: "Ready",
            tone: "border-violet-300/10 bg-violet-400/[0.06] text-violet-100/52",
          },
        ].map((item) => (
          <div
            key={item.label}
            className={`relative overflow-hidden rounded-2xl border px-2 py-2 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] ${item.tone}`}
          >
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent,rgba(255,255,255,0.01)_42%,transparent_64%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
            <div className="relative z-10 mx-auto mb-1 h-1.5 w-1.5 rounded-full bg-current opacity-40 shadow-[0_0_5px_currentColor]" />
            <div className="text-[8px] font-black uppercase tracking-[0.12em] opacity-70">
              {item.label}
            </div>
            <div className="mt-1 text-xs font-semibold tracking-tight">
              {item.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function CameraSlotAssignmentPanel({
  selectedBlock,
  participants,
  onAssignParticipantToCameraSlot,
}: {
  selectedBlock: PreviewBlock | null
  participants: ProducerParticipant[]
  onAssignParticipantToCameraSlot: (blockId: string, participantId: string | null) => void
}): JSX.Element | null {
  if (!selectedBlock || selectedBlock.type !== "camera-slot") return null

  const assignedParticipant = participants.find(
    (participant) => participant.identity === selectedBlock.assignedParticipantId,
  )

  return (
    <div className="relative overflow-hidden rounded-[18px] border border-violet-300/[0.08] bg-[radial-gradient(circle_at_top_left,rgba(168,85,247,0.055),transparent_34%),linear-gradient(180deg,rgba(20,18,34,0.76),rgba(7,9,16,0.92))] p-2.5 shadow-[0_10px_26px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.028)]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent,rgba(255,255,255,0.012)_42%,transparent_64%)]" />
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.14em] text-violet-100/48">
            <Radio size={11} />
            Camera Slot Source
          </div>
          <div className="mt-1 truncate text-xs font-semibold text-white/68">
            {assignedParticipant?.name || assignedParticipant?.identity || "No participant assigned"}
          </div>
        </div>

        <div className="rounded-full border border-sky-300/12 bg-sky-400/[0.06] px-2 py-1 text-[8px] font-black uppercase tracking-[0.12em] text-sky-100/48">
          Safe
        </div>
      </div>

      <label className="relative z-10 mt-3 block text-[8px] font-black uppercase tracking-[0.14em] text-white/32">
        Assign participant
      </label>
      <select
        value={selectedBlock.assignedParticipantId ?? ""}
        onChange={(event) => {
          onAssignParticipantToCameraSlot(
            selectedBlock.id,
            event.target.value ? event.target.value : null,
          )
        }}
        className="relative z-10 mt-1 w-full rounded-[12px] border border-white/8 bg-black/38 px-3 py-2 text-xs font-semibold text-white/72 outline-none transition focus:border-violet-300/20 focus:bg-violet-400/[0.045]"
      >
        <option value="">Unassigned / Placeholder</option>
        {participants.map((participant) => (
          <option key={participant.identity} value={participant.identity}>
            {participant.name || participant.identity}
          </option>
        ))}
      </select>

      <div className="relative z-10 mt-2 rounded-[12px] border border-white/[0.055] bg-white/[0.018] px-2.5 py-2 text-[10px] font-semibold leading-4 text-white/36">
        The camera slot stays in the scene even when the assigned person disconnects. Jupiter falls back to the branded placeholder instead of breaking the layout.
      </div>
    </div>
  )
}


export default function RightInspectorRail({
  selectedBlock,
  previewBlocks,
  selectedBlockId,
  onSelectBlock,
  onToggleLayerHidden,
  onMoveLayerForward,
  onMoveLayerBackward,
  onReorderLayers,
  onToggleHidden,
  onToggleLocked,
  onUpdateOpacity,
  onUpdateScale,
  onUpdateRotation,
  onUpdateBlur,
  onUpdateGlow,
  onUpdateGlowColor,
  onUpdateBorderRadius,
  onUpdateShadowIntensity,
  onUpdateShadowColor,
  onUpdateLabel,
  onUpdateBlendMode,
  onUpdateGroupId,
  onUpdateTimelineStart,
  onUpdateTimelineDuration,
  onUpdateAnimationType,
  onUpdateAnimationProgress,
  onUpdatePosition,
  onUpdateSize,
  onUpdateSrc,
  onUpdateTextContent,
  onAssignParticipantToCameraSlot,
  participants,
  stageIds,
  stageState,
  getScreenTrackSid,
  onAddToStage,
  onSetScreenShare,
  onClearPrimary,
  onSetPrimary,
  onUnpin,
  onPin,
  onRemoveFromStage,
  onError,
}: {
  selectedBlock: PreviewBlock | null
  previewBlocks: PreviewBlock[]
  selectedBlockId: string | null
  onSelectBlock: (blockId: string) => void
  onToggleLayerHidden: (blockId: string) => void
  onMoveLayerForward: (blockId: string) => void
  onMoveLayerBackward: (blockId: string) => void
  onReorderLayers: (orderedBlockIds: string[]) => void
  onToggleHidden: () => void
  onToggleLocked: () => void
  onUpdateOpacity: (value: string) => void
  onUpdateScale: (value: string) => void
  onUpdateRotation: (value: string) => void
  onUpdateBlur: (value: string) => void
  onUpdateGlow: (value: string) => void
  onUpdateGlowColor: (value: string) => void
  onUpdateBorderRadius: (value: string) => void
  onUpdateShadowIntensity: (value: string) => void
  onUpdateShadowColor: (value: string) => void
  onUpdateLabel: (value: string) => void
  onUpdateBlendMode: (value: string) => void
  onUpdateGroupId: (value: string) => void
  onUpdateTimelineStart: (value: string) => void
  onUpdateTimelineDuration: (value: string) => void
  onUpdateAnimationType: (value: string) => void
  onUpdateAnimationProgress: (value: string) => void
  onUpdatePosition: (field: "x" | "y", value: string) => void
  onUpdateSize: (field: "width" | "height", value: string) => void
  onUpdateSrc: (value: string) => void
  onUpdateTextContent: (value: string) => void
  onAssignParticipantToCameraSlot: (blockId: string, participantId: string | null) => void
  participants: ProducerParticipant[]
  stageIds: Set<string>
  stageState: StageState | null
  getScreenTrackSid: (participant: ProducerParticipant) => string | null
  onAddToStage: (identity: string) => void
  onSetScreenShare: (participantId: string, trackId: string) => void
  onClearPrimary: () => void
  onSetPrimary: (identity: string) => void
  onUnpin: () => void
  onPin: (identity: string) => void
  onRemoveFromStage: (identity: string) => void
  onError: (value: string | null) => void
}): JSX.Element {
  return (
    <div className="group relative flex h-full min-h-0 flex-col overflow-hidden rounded-[18px] border border-white/[0.04] bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.008),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(56,189,248,0.006),transparent_30%),linear-gradient(180deg,rgba(13,18,30,0.58),rgba(6,9,17,0.84))] p-1 shadow-[0_6px_22px_rgba(0,0,0,0.10),inset_0_1px_0_rgba(255,255,255,0.016)] backdrop-blur-xl transition duration-300 hover:border-white/[0.055] xl:col-start-3">
      <RightRailAtmosphere />
      <div className="relative z-10 min-h-0 flex-1 space-y-1 overflow-y-auto pr-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <InspectorTelemetryStrip />
        <RailSectionLabel
          icon={<SlidersHorizontal size={16} />}
          title="Layer Inspector"
          sub="Selected Layer Control Surface"
        />
        <LayerStackPanel
          blocks={previewBlocks}
          selectedBlockId={selectedBlockId}
          onSelectBlock={onSelectBlock}
          onToggleLayerHidden={onToggleLayerHidden}
          onMoveLayerForward={onMoveLayerForward}
          onMoveLayerBackward={onMoveLayerBackward}
          onReorderLayers={onReorderLayers}
        />
        <CameraSlotAssignmentPanel
          selectedBlock={selectedBlock}
          participants={participants}
          onAssignParticipantToCameraSlot={onAssignParticipantToCameraSlot}
        />
        <SelectedBlockInspector
          selectedBlock={selectedBlock}
          onToggleHidden={onToggleHidden}
          onToggleLocked={onToggleLocked}
          onUpdateOpacity={onUpdateOpacity}
          onUpdateScale={onUpdateScale}
          onUpdateRotation={onUpdateRotation}
          onUpdateBlur={onUpdateBlur}
          onUpdateGlow={onUpdateGlow}
          onUpdateGlowColor={onUpdateGlowColor}
          onUpdateBorderRadius={onUpdateBorderRadius}
          onUpdateShadowIntensity={onUpdateShadowIntensity}
          onUpdateShadowColor={onUpdateShadowColor}
          onUpdateLabel={onUpdateLabel}
          onUpdateBlendMode={onUpdateBlendMode}
          onUpdateGroupId={onUpdateGroupId}
          onUpdateTimelineStart={onUpdateTimelineStart}
          onUpdateTimelineDuration={onUpdateTimelineDuration}
          onUpdateAnimationType={onUpdateAnimationType}
          onUpdateAnimationProgress={onUpdateAnimationProgress}
          onUpdatePosition={onUpdatePosition}
          onUpdateSize={onUpdateSize}
          onUpdateSrc={onUpdateSrc}
          onUpdateTextContent={onUpdateTextContent}
        />
        {/* Removed Capture Systems and RecordingCenterPanel */}
        <RailSectionLabel
          icon={<Users size={16} />}
          title="Green Room Operations"
          sub={`${participants.length} Connected Participants`}
        />

        <BackstagePanel participantCount={participants.length}>
          {participants.length === 0 ? (
            <div className="rounded-[16px] border border-dashed border-white/7 bg-[linear-gradient(180deg,rgba(255,255,255,0.014),rgba(255,255,255,0.005))] p-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.018)]">
              <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.035] text-white/34 shadow-[0_12px_30px_rgba(0,0,0,0.22)]">
                <Radio size={16} />
              </div>

              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/34">
                Green Room Idle
              </div>

              <div className="mt-2 text-sm text-white/40">
                Waiting for presenters and contributors to join the live room.
              </div>

              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-3 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-white/34">
                <Layers3 size={11} />
                Talent Queue Empty
              </div>
            </div>
          ) : (
            participants.map((p) => {
              const isOnStage = stageIds.has(p.identity)
              const isPrimary = stageState?.primary_participant_id === p.identity
              const isPinned = stageState?.pinned_participant_id === p.identity
              const isUsingScreen = stageState?.screen_share_participant_id === p.identity
              const screenTrackSid = getScreenTrackSid(p)

              return (
                <ParticipantCard
                  key={p.identity}
                  participant={p}
                  isOnStage={isOnStage}
                  isPrimary={isPrimary}
                  isPinned={isPinned}
                  isUsingScreen={isUsingScreen}
                  screenTrackSid={screenTrackSid}
                  onAddToStage={onAddToStage}
                  onSetScreenShare={onSetScreenShare}
                  onClearPrimary={onClearPrimary}
                  onSetPrimary={onSetPrimary}
                  onUnpin={onUnpin}
                  onPin={onPin}
                  onRemoveFromStage={onRemoveFromStage}
                  onError={onError}
                />
              )
            })
          )}
        </BackstagePanel>
      </div>

      <style jsx global>{`
        @keyframes rightRailSignalSweep {
          0%,
          100% {
            opacity: 0;
            transform: translateX(-18%);
          }
          46% {
            opacity: 0.24;
          }
          100% {
            transform: translateX(18%);
          }
        }
      `}</style>
    </div>
  )
}