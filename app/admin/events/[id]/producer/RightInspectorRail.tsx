import type { JSX } from "react"
import {
  Archive,
  CircleDot,
  Cpu,
  Globe2,
  HardDrive,
  Layers3,
  Radar,
  Radio,
  SatelliteDish,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
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

function RightRailAtmosphere(): JSX.Element {
  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-violet-300/7 via-sky-300/4 to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent,rgba(255,255,255,0.018)_42%,transparent_64%)] animate-[rightRailSignalSweep_12s_ease-in-out_infinite]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.055] bg-[repeating-linear-gradient(to_bottom,rgba(255,255,255,0.022)_0px,rgba(255,255,255,0.022)_1px,transparent_1px,transparent_7px)]" />
      <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-violet-200/24 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-violet-300/[0.05] to-transparent" />
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
    <div className="relative overflow-hidden flex items-center justify-between gap-3 rounded-[22px] border border-white/8 bg-black/22 px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent,rgba(255,255,255,0.018)_42%,transparent_64%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/16 to-transparent" />
      <div className="relative z-10 flex min-w-0 items-center gap-2.5">
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

      <div className="relative z-10 hidden rounded-full border border-violet-300/14 bg-violet-400/8 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.16em] text-violet-100/58 xl:block">
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
      ? "border-sky-300/14 bg-sky-400/8 text-sky-100/62"
      : tone === "green"
        ? "border-emerald-300/14 bg-emerald-400/8 text-emerald-100/62"
        : tone === "violet"
          ? "border-violet-300/14 bg-violet-400/8 text-violet-100/62"
          : tone === "amber"
            ? "border-amber-300/14 bg-amber-400/8 text-amber-100/62"
            : "border-white/10 bg-black/24 text-white/42"

  return (
    <div className={`relative z-10 flex items-center gap-2 rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.14em] ${toneClass}`}>
      <span className="opacity-80">{icon}</span>
      <span className="text-white/30">{label}</span>
      <span>{value}</span>
    </div>
  )
}

function InspectorTelemetryStrip(): JSX.Element {
  return (
    <div className="relative overflow-hidden rounded-[28px] border border-violet-300/12 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.08),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(56,189,248,0.05),transparent_32%),linear-gradient(180deg,rgba(12,10,28,0.955),rgba(3,4,10,0.99))] p-3 shadow-[0_24px_80px_rgba(0,0,0,0.38),inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent,rgba(255,255,255,0.018)_42%,transparent_64%)] animate-[rightRailSignalSweep_12s_ease-in-out_infinite]" />
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-violet-200/26 to-transparent" />
      <div className="relative z-10 flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-violet-100/68">
            <Sparkles size={13} />
            Inspector
          </div>

          <div className="mt-1 text-sm font-semibold tracking-tight text-white">
            Layers, capture, and source routing
          </div>
        </div>

        <div className="rounded-full border border-violet-300/14 bg-violet-400/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-violet-100/62 shadow-[0_0_18px_rgba(168,85,247,0.12)]">
          Ready
        </div>
      </div>

      <div className="relative z-10 mt-3 flex flex-wrap gap-2">
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

      <div className="relative z-10 mt-3 grid grid-cols-3 gap-2">
        {[
          {
            label: "Inspector",
            value: "Ready",
            tone: "border-sky-300/14 bg-sky-400/8 text-sky-100/70",
          },
          {
            label: "Routing",
            value: "Ready",
            tone: "border-emerald-300/14 bg-emerald-400/8 text-emerald-100/70",
          },
          {
            label: "Capture",
            value: "Ready",
            tone: "border-violet-300/14 bg-violet-400/8 text-violet-100/70",
          },
        ].map((item) => (
          <div
            key={item.label}
            className={`relative overflow-hidden rounded-2xl border px-2 py-2 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] ${item.tone}`}
          >
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent,rgba(255,255,255,0.018)_42%,transparent_64%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
            <div className="relative z-10 mx-auto mb-1 h-1.5 w-1.5 rounded-full bg-current opacity-55 shadow-[0_0_10px_currentColor]" />
            <div className="text-[8px] font-black uppercase tracking-[0.16em] opacity-70">
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

function RecordingCenterPanel(): JSX.Element {
  return (
    <div className="relative overflow-hidden rounded-[28px] border border-red-300/14 bg-[radial-gradient(circle_at_top_right,rgba(239,68,68,0.075),transparent_34%),linear-gradient(180deg,rgba(20,8,10,0.955),rgba(8,4,6,0.98))] p-3 shadow-[0_24px_80px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent,rgba(255,255,255,0.018)_42%,transparent_64%)] animate-[rightRailSignalSweep_13s_ease-in-out_infinite]" />
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-red-200/28 to-transparent" />
      <div className="relative z-10">
        <div className="flex items-center justify-between gap-3">
          <div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-red-100/72">
            <CircleDot
              size={12}
              className="animate-pulse text-red-300"
            />
            Recording
          </div>

          <div className="mt-1 text-lg font-semibold tracking-tight text-white">
            Program and ISO capture
          </div>
          </div>

        <div className="rounded-full border border-red-300/20 bg-red-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-red-100/78 shadow-[0_0_18px_rgba(248,113,113,0.12)]">
          Ready
        </div>
        </div>

        <div className="mt-3 rounded-[24px] border border-violet-300/10 bg-violet-400/[0.05] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.18em] text-violet-100/58">
                <Radio size={11} />
                Capture Status
              </div>

              <div className="mt-1 text-sm font-semibold text-white/84">
                Program and ISO feeds stable
              </div>
            </div>

            <div className="rounded-full border border-violet-300/14 bg-violet-400/8 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.14em] text-violet-100/58">
              59.94 fps
            </div>
          </div>

          <div className="mt-3 flex items-center gap-1.5">
            {Array.from({ length: 24 }).map((_, index) => (
              <div
                key={index}
                className={[
                  "h-8 flex-1 rounded-full",
                  index > 18
                    ? "bg-red-300/70"
                    : index > 13
                      ? "bg-amber-300/70"
                      : "bg-emerald-300/70",
                ].join(" ")}
              />
            ))}
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
    <div className="group relative overflow-hidden space-y-3 rounded-[38px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.12),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(56,189,248,0.08),transparent_30%),linear-gradient(180deg,rgba(7,12,28,0.92),rgba(2,4,10,0.99))] p-2.5 shadow-[0_38px_140px_rgba(0,0,0,0.58),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl transition duration-300 hover:border-white/14 xl:col-start-3">
      <RightRailAtmosphere />
      <div className="relative z-10 space-y-3">
        <InspectorTelemetryStrip />
        <RailSectionLabel
          icon={<SlidersHorizontal size={16} />}
          title="Layer Inspector"
          sub="Selected Layer Control Surface"
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
          title="Capture Systems"
          sub="Program + ISO Capture Routing"
        />

        <RecordingCenterPanel />
        <RailSectionLabel
          icon={<Users size={16} />}
          title="Green Room Operations"
          sub={`${participants.length} Connected Participants`}
        />

        <BackstagePanel participantCount={participants.length}>
          {participants.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.025),rgba(255,255,255,0.01))] p-6 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
              <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-black/28 text-white/38 shadow-[0_12px_30px_rgba(0,0,0,0.22)]">
                <Radio size={16} />
              </div>

              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/34">
                Green Room Idle
              </div>

              <div className="mt-2 text-sm text-white/40">
                Waiting for presenters and contributors to join the live room.
              </div>

              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/24 px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-white/34">
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
            opacity: 0.42;
          }
          100% {
            transform: translateX(18%);
          }
        }
      `}</style>
    </div>
  )
}