import type { JSX } from "react"
import {
  Archive,
  CircleDot,
  HardDrive,
  Layers3,
  Radio,
  ShieldCheck,
  SlidersHorizontal,
  TimerReset,
  Users,
} from "lucide-react"
import type { PreviewBlock } from "./useProducerBlocks"
import BackstagePanel from "./BackstagePanel"
import ParticipantCard from "./ParticipantCard"
import SelectedBlockInspector from "./SelectedBlockInspector"

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
    <div className="flex items-center justify-between gap-3 rounded-[22px] border border-white/8 bg-black/22 px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] text-white/72 shadow-[0_10px_30px_rgba(0,0,0,0.2)]">
          {icon}
        </span>

        <div className="min-w-0">
          <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/32">
            {title}
          </div>
          <div className="truncate text-sm font-semibold text-white/82">
            {sub}
          </div>
        </div>
      </div>

      <div className="hidden rounded-full border border-violet-300/14 bg-violet-400/8 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.16em] text-violet-100/58 xl:block">
        Live
      </div>
    </div>
  )
}

function RecordingCenterPanel(): JSX.Element {
  return (
    <div className="rounded-[28px] border border-red-300/14 bg-[radial-gradient(circle_at_top_right,rgba(239,68,68,0.12),transparent_34%),linear-gradient(180deg,rgba(20,8,10,0.94),rgba(8,4,6,0.98))] p-3 shadow-[0_24px_80px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-red-100/72">
            <CircleDot
              size={12}
              className="animate-pulse text-red-300"
            />
            Recording Center
          </div>

          <div className="mt-1 text-lg font-semibold tracking-tight text-white">
            Program Capture Active
          </div>
        </div>

        <div className="rounded-full border border-red-300/20 bg-red-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-red-100/78 shadow-[0_0_18px_rgba(248,113,113,0.12)]">
          REC LIVE
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/8 bg-black/24 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <div className="flex items-center justify-between gap-3">
            <div className="text-[9px] font-black uppercase tracking-[0.18em] text-white/34">
              Program Feed
            </div>
            <ShieldCheck size={13} className="text-emerald-200/62" />
          </div>

          <div className="mt-2 text-xl font-black tracking-tight text-white tabular-nums">
            01:18:42
          </div>

          <div className="mt-2 flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.16em] text-emerald-100/52">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,0.8)]" />
            Archive Stable
          </div>
        </div>

        <div className="rounded-2xl border border-white/8 bg-black/24 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <div className="flex items-center justify-between gap-3">
            <div className="text-[9px] font-black uppercase tracking-[0.18em] text-white/34">
              ISO Feeds
            </div>
            <Archive size={13} className="text-amber-100/58" />
          </div>

          <div className="mt-2 text-xl font-black tracking-tight text-white">
            4 Armed
          </div>

          <div className="mt-2 flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.16em] text-amber-100/52">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-300 shadow-[0_0_8px_rgba(252,211,77,0.75)]" />
            Rolling Isolation
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-[24px] border border-white/8 bg-black/26 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[9px] font-black uppercase tracking-[0.18em] text-white/34">
              Storage Vault
            </div>

            <div className="mt-1 text-sm font-semibold text-white/82">
              2.8 TB Remaining
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-white/42">
            <HardDrive size={11} className="text-sky-100/55" />
            RAID Synced
          </div>
        </div>

        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/8">
          <div className="h-full w-[68%] rounded-full bg-[linear-gradient(90deg,rgba(251,191,36,0.88),rgba(239,68,68,0.92))] shadow-[0_0_16px_rgba(248,113,113,0.28)]" />
        </div>

        <div className="mt-2 flex items-center justify-between text-[9px] font-black uppercase tracking-[0.14em] text-white/30">
          <span>Vault Usage</span>
          <span>68%</span>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {[
          {
            label: "Program",
            sub: "Live",
            tone:
              "border-red-300/16 bg-red-400/8 text-red-100/72",
          },
          {
            label: "ISO",
            sub: "4 feeds",
            tone:
              "border-amber-300/16 bg-amber-400/8 text-amber-100/72",
          },
          {
            label: "Backup",
            sub: "Cloud",
            tone:
              "border-sky-300/16 bg-sky-400/8 text-sky-100/72",
          },
        ].map((item) => (
          <div
            key={item.label}
            className={`rounded-2xl border px-2 py-2 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] ${item.tone}`}
          >
            <div className="text-[8px] font-black uppercase tracking-[0.16em] opacity-70">
              {item.label}
            </div>
            <div className="mt-1 text-xs font-semibold tracking-tight">
              {item.sub}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between rounded-2xl border border-white/8 bg-black/24 px-3 py-2 text-[9px] font-black uppercase tracking-[0.16em] text-white/38 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
        <span className="flex items-center gap-2">
          <TimerReset size={11} className="text-red-200/55" />
          Continuous Capture
        </span>

        <span className="text-white/58">No frame drops</span>
      </div>
    </div>
  )
}

export default function RightInspectorRail({
  selectedBlock,
  onToggleHidden,
  onUpdateOpacity,
  onUpdateLabel,
  onUpdatePosition,
  onUpdateSize,
  onUpdateSrc,
  onUpdateTextContent,
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
  onToggleHidden: () => void
  onUpdateOpacity: (value: string) => void
  onUpdateLabel: (value: string) => void
  onUpdatePosition: (field: "x" | "y", value: string) => void
  onUpdateSize: (field: "width" | "height", value: string) => void
  onUpdateSrc: (value: string) => void
  onUpdateTextContent: (value: string) => void
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
    <div className="space-y-3 rounded-[34px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.10),transparent_34%),linear-gradient(180deg,rgba(7,12,28,0.88),rgba(2,4,10,0.97))] p-2.5 shadow-[0_32px_120px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl transition duration-300 hover:border-white/14 xl:col-start-3">
      <RailSectionLabel
        icon={<SlidersHorizontal size={16} />}
        title="Inspector"
        sub="Selected Layer Controls"
      />
      <SelectedBlockInspector
        selectedBlock={selectedBlock}
        onToggleHidden={onToggleHidden}
        onUpdateOpacity={onUpdateOpacity}
        onUpdateLabel={onUpdateLabel}
        onUpdatePosition={onUpdatePosition}
        onUpdateSize={onUpdateSize}
        onUpdateSrc={onUpdateSrc}
        onUpdateTextContent={onUpdateTextContent}
      />
      <RailSectionLabel
        icon={<Archive size={16} />}
        title="Recording"
        sub="Capture and Archive Systems"
      />

      <RecordingCenterPanel />
      <RailSectionLabel
        icon={<Users size={16} />}
        title="Backstage"
        sub={`${participants.length} Connected Participants`}
      />

      <BackstagePanel participantCount={participants.length}>
        {participants.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.025),rgba(255,255,255,0.01))] p-6 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-black/28 text-white/38 shadow-[0_12px_30px_rgba(0,0,0,0.22)]">
              <Radio size={16} />
            </div>

            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/34">
              Backstage Idle
            </div>

            <div className="mt-2 text-sm text-white/40">
              Waiting for presenters and contributors to join the live room.
            </div>

            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/24 px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-white/34">
              <Layers3 size={11} />
              Production Queue Empty
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
  )
}