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
  Eye,
  EyeOff,
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

function LayerStackPanel({
  blocks,
  selectedBlockId,
  onSelectBlock,
}: {
  blocks: PreviewBlock[]
  selectedBlockId: string | null
  onSelectBlock: (blockId: string) => void
}): JSX.Element {
  const sortedBlocks = [...blocks].sort((a, b) => (b.zIndex ?? 0) - (a.zIndex ?? 0))

  return (
    <div className="relative overflow-hidden rounded-[18px] border border-white/[0.055] bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.026),transparent_34%),linear-gradient(180deg,rgba(10,14,25,0.84),rgba(4,6,12,0.95))] p-2 shadow-[0_9px_26px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.022)]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent,rgba(255,255,255,0.01)_42%,transparent_64%)] animate-[rightRailSignalSweep_18s_ease-in-out_infinite]" />
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-violet-200/14 to-transparent" />

      <div className="relative z-10 mb-2 flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-violet-100/42">
            <Layers3 size={12} />
            Layer Stack
          </div>
          <div className="mt-1 text-xs font-semibold text-white/42">
            {blocks.length === 0 ? "No composition layers" : `${blocks.length} composition layer${blocks.length === 1 ? "" : "s"}`}
          </div>
        </div>

        <div className="rounded-full border border-white/8 bg-white/[0.026] px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.12em] text-white/34">
          Z Order
        </div>
      </div>

      <div className="relative z-10 space-y-1.5">
        {sortedBlocks.length === 0 ? (
          <div className="rounded-[16px] border border-dashed border-white/7 bg-white/[0.018] px-3 py-4 text-center text-xs font-semibold text-white/30">
            Add a text, image, video, or PDF block to begin layering.
          </div>
        ) : (
          sortedBlocks.map((block, index) => {
            const isSelected = block.id === selectedBlockId

            return (
              <button
                key={block.id}
                type="button"
                onClick={() => onSelectBlock(block.id)}
                className={`group/layer flex w-full items-center justify-between gap-2 rounded-[15px] border px-2.5 py-2 text-left transition-all hover:-translate-y-px ${
                  isSelected
                    ? "border-violet-300/18 bg-violet-400/[0.085] shadow-[0_0_18px_rgba(168,85,247,0.07),inset_0_1px_0_rgba(255,255,255,0.035)]"
                    : "border-white/[0.055] bg-white/[0.020] shadow-[inset_0_1px_0_rgba(255,255,255,0.018)] hover:border-white/10 hover:bg-white/[0.036]"
                }`}
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border text-[9px] font-black uppercase tracking-tight ${
                    isSelected
                      ? "border-violet-300/18 bg-violet-300/[0.12] text-violet-50/66"
                      : "border-white/8 bg-black/18 text-white/34"
                  }`}>
                    {index + 1}
                  </div>

                  <div className="min-w-0">
                    <div className="truncate text-xs font-semibold text-white/70">
                      {block.label || block.type}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[8px] font-black uppercase tracking-[0.11em] text-white/28">
                      <span>{block.type}</span>
                      <span>·</span>
                      <span className="tabular-nums">z {block.zIndex ?? 0}</span>
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  <span className="rounded-full border border-white/7 bg-black/18 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-[0.10em] text-white/26">
                    {block.hidden ? "Hidden" : "Live"}
                  </span>
                  {block.hidden ? (
                    <EyeOff size={12} className="text-amber-100/42" />
                  ) : (
                    <Eye size={12} className="text-emerald-100/42" />
                  )}
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}

function RecordingCenterPanel(): JSX.Element {
  return (
    <div className="relative overflow-hidden rounded-[16px] border border-red-300/[0.06] bg-[radial-gradient(circle_at_top_right,rgba(239,68,68,0.020),transparent_34%),linear-gradient(180deg,rgba(20,10,12,0.84),rgba(8,5,7,0.95))] p-1.5 shadow-[0_7px_22px_rgba(0,0,0,0.16),inset_0_1px_0_rgba(255,255,255,0.020)]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent,rgba(255,255,255,0.01)_42%,transparent_64%)] animate-[rightRailSignalSweep_16s_ease-in-out_infinite]" />
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-red-200/14 to-transparent" />
      <div className="relative z-10">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-red-100/42">
              <CircleDot size={12} className="text-red-300/70" />
              Recording
            </div>

            <div className="mt-1 text-sm font-semibold tracking-tight text-white/60">
              Program and ISO capture
            </div>
          </div>

          <div className="rounded-full border border-red-300/12 bg-red-400/[0.07] px-3 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-red-100/46 shadow-[0_0_8px_rgba(248,113,113,0.045)]">
            Ready
          </div>
        </div>

        <div className="mt-1.5 rounded-[14px] border border-violet-300/[0.055] bg-violet-400/[0.024] p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.020)]">
          <div className="flex items-center justify-between gap-3">
            <div>
          <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.12em] text-violet-100/46">
                <Radio size={11} />
                Capture Status
              </div>

              <div className="mt-1 text-xs font-semibold text-white/78">
                Program and ISO feeds stable
              </div>
            </div>

            <div className="rounded-full border border-violet-300/10 bg-violet-400/[0.06] px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.12em] text-violet-100/46">
              59.94 fps
            </div>
          </div>

          <div className="mt-1.5 flex items-center gap-1">
            {Array.from({ length: 24 }).map((_, index) => (
              <div
                key={index}
                className={[
                  "h-4 flex-1 rounded-full",
                  index > 18
                    ? "bg-red-300/46"
                    : index > 13
                      ? "bg-amber-300/46"
                      : "bg-emerald-300/46",
                ].join(" ")}
              />
            ))}
          </div>
        </div>

        <div className="mt-1.5 grid gap-1 sm:grid-cols-2">
          <div className="rounded-[14px] border border-white/6 bg-white/[0.018] p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
            <div className="flex items-center justify-between gap-3">
              <div className="text-[9px] font-black uppercase tracking-[0.12em] text-white/42">
                Program Feed
              </div>
              <ShieldCheck size={13} className="text-emerald-200/62" />
            </div>

            <div className="mt-2 text-lg font-black tracking-tight text-white/84 tabular-nums">
              01:18:42
            </div>

            <div className="mt-2 flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.12em] text-emerald-100/52">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300/75 shadow-[0_0_5px_rgba(110,231,183,0.32)]" />
              Archive Stable
            </div>
          </div>

          <div className="rounded-[14px] border border-white/6 bg-white/[0.018] p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
            <div className="flex items-center justify-between gap-3">
              <div className="text-[9px] font-black uppercase tracking-[0.12em] text-white/42">
                ISO Feeds
              </div>
              <Archive size={13} className="text-amber-100/58" />
            </div>

            <div className="mt-2 text-lg font-black tracking-tight text-white/84">
              4 Ready
            </div>

            <div className="mt-2 flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.12em] text-amber-100/52">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-300/75 shadow-[0_0_5px_rgba(252,211,77,0.30)]" />
              ISO Ready
            </div>
          </div>
        </div>

        <div className="mt-3 hidden rounded-[20px] border border-white/7 bg-white/[0.022] p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.026)] 2xl:block">
          <div className="flex items-center justify-between gap-3">
            <div>
            <div className="text-[9px] font-black uppercase tracking-[0.12em] text-white/42">
                Storage Vault
              </div>

              <div className="mt-1 text-xs font-semibold text-white/82">
                2.8 TB Remaining
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-white/42">
              <HardDrive size={11} className="text-sky-100/55" />
              RAID Synced
            </div>
          </div>

          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/8">
            <div className="h-full w-[68%] rounded-full bg-[linear-gradient(90deg,rgba(251,191,36,0.88),rgba(239,68,68,0.92))] shadow-[0_0_16px_rgba(248,113,113,0.28)]" />
          </div>

          <div className="mt-2 flex items-center justify-between text-[9px] font-black uppercase tracking-[0.12em] text-white/30">
            <span>Vault Usage</span>
            <span>68%</span>
          </div>
        </div>

        <div className="mt-2.5 hidden grid-cols-3 gap-1.5 2xl:grid">
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
              <div className="text-[8px] font-black uppercase tracking-[0.12em] opacity-70">
                {item.label}
              </div>
              <div className="mt-1 text-xs font-semibold tracking-tight">
                {item.sub}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-2.5 flex items-center justify-between rounded-[18px] border border-white/7 bg-white/[0.022] px-2.5 py-2 text-[9px] font-black uppercase tracking-[0.12em] text-white/34 shadow-[inset_0_1px_0_rgba(255,255,255,0.026)]">
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
  previewBlocks,
  selectedBlockId,
  onSelectBlock,
  onToggleHidden,
  onUpdateOpacity,
  onUpdateScale,
  onUpdateRotation,
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
  previewBlocks: PreviewBlock[]
  selectedBlockId: string | null
  onSelectBlock: (blockId: string) => void
  onToggleHidden: () => void
  onUpdateOpacity: (value: string) => void
  onUpdateScale: (value: string) => void
  onUpdateRotation: (value: string) => void
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
        />
        <SelectedBlockInspector
          selectedBlock={selectedBlock}
          onToggleHidden={onToggleHidden}
          onUpdateOpacity={onUpdateOpacity}
          onUpdateScale={onUpdateScale}
          onUpdateRotation={onUpdateRotation}
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