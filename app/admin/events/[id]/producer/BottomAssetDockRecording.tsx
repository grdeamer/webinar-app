import type { RecordingStatus } from "./BottomAssetDock"

import { type JSX } from "react"

import { Mic2 } from "lucide-react"

export type RecordingSession = {
  id: string
  label: string
  startedAt: string
  endedAt: string | null
  durationSeconds: number
  source: string
  destination: string
  quality: string
  egressId?: string | null
  file?: string | null
  location?: string | null
  size?: string | null
  status: "processing" | "ready" | "recording" | "failed"
}

export type RecordingStatusRow = {
  id: string
  started_at?: string | null
  ended_at?: string | null
  status?: string | null
  source?: string | null
  destination?: string | null
  quality?: string | null
  egress_id?: string | null
  file_name?: string | null
  file_location?: string | null
  file_size?: number | string | null
}

export type RecordingSourceOption = {
  id: string
  label: string
  type: "program" | "preview" | "iso" | "clean" | "return"
  status: "live" | "ready" | "standby"
  description: string
}

export type UtilityPanel = "stream" | "overlays" | "schedule" | "shortcuts" | "settings"

export function formatRecordingDuration(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(safeSeconds / 3600)
  const minutes = Math.floor((safeSeconds % 3600) / 60)
  const remainingSeconds = safeSeconds % 60

  return [hours, minutes, remainingSeconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":")
}

export function CommRow({
  name,
  role,
  active,
}: {
  name: string
  role: string
  active?: boolean
}): JSX.Element {
  return (
    <div
      className={`flex items-center gap-1.5 rounded-[10px] border px-2 py-1 ${
        active
          ? "border-sky-300/20 bg-sky-500/[0.16]"
          : "border-white/[0.045] bg-white/[0.018]"
      }`}
    >
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/[0.050] bg-white/[0.020] text-white/44">
        <Mic2 size={12} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[10px] font-semibold text-white/72">{name}</div>
        <div className="mt-px text-[8px] font-medium text-white/32">{role}</div>
      </div>
      <div className="flex h-4 w-12 items-end justify-end gap-0.5">
        {Array.from({ length: 10 }).map((_, index) => (
          <span
            key={index}
            className="w-0.5 rounded-full bg-emerald-300/70"
            style={{ height: `${3 + ((index * 5) % 12)}px` }}
          />
        ))}
      </div>
    </div>
  )
}

export function UtilityButton({
  icon,
  label,
  meta,
  danger,
  active,
  onClick,
}: {
  icon: JSX.Element
  label: string
  meta: string
  danger?: boolean
  active?: boolean
  onClick?: () => void
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`producer-utility-button group flex min-h-[56px] items-center gap-4 rounded-[11px] border px-5 text-left transition-all duration-300 ease-out hover:-translate-y-px active:translate-y-0 ${
        danger
          ? "border-red-300/22 bg-[linear-gradient(180deg,rgba(185,28,28,0.76),rgba(127,29,29,0.92))] shadow-[0_0_22px_rgba(239,68,68,0.12),inset_0_1px_0_rgba(255,255,255,0.050)]"
          : active
            ? "border-violet-300/38 bg-[linear-gradient(135deg,rgba(76,29,149,0.64),rgba(67,56,202,0.48))] shadow-[0_0_26px_rgba(139,92,246,0.18),inset_0_1px_0_rgba(255,255,255,0.055)]"
          : "border-white/[0.055] bg-white/[0.022] shadow-[inset_0_1px_0_rgba(255,255,255,0.016)] hover:border-white/[0.09] hover:bg-white/[0.035]"
      }`}
    >
      <span className={danger ? "text-red-300" : active ? "text-violet-100" : "text-white/72"}>{icon}</span>
      <span className="min-w-0">
        <span className="block text-[15px] font-medium text-white/90">
          {label}
        </span>
        <span className={`mt-0.5 block text-[11px] font-medium uppercase tracking-[0.05em] ${label === "Stream" ? "text-emerald-300" : "text-white/45"}`}>{meta}</span>
      </span>
    </button>
  )
}

export function UtilityOverlay({
  activePanel,
  recordingStatus,
  recordingElapsedSeconds,
  recordings,
  onArmRecording,
  onStartRecording,
  onStopRecording,
  onClose,
}: {
  activePanel: UtilityPanel
  recordingStatus: RecordingStatus
  recordingElapsedSeconds: number
  recordings: RecordingSession[]
  onArmRecording: () => void
  onStartRecording: () => void
  onStopRecording: () => void
  onClose: () => void
}): JSX.Element {
  const panelMeta: Record<UtilityPanel, { title: string; eyebrow: string; description: string }> = {
    stream: {
      title: "Stream Destinations",
      eyebrow: "Outbound Broadcast",
      description: "Manage destinations, RTMP endpoints, stream keys, platform health, and failover routes.",
    },
    overlays: {
      title: "Overlay Manager",
      eyebrow: "Graphics + Lower Thirds",
      description: "Arm lower thirds, audience prompts, sponsor bugs, emergency slates, and show graphics.",
    },
    schedule: {
      title: "Scheduled Event",
      eyebrow: "Run of Show",
      description: "Review start time, agenda timing, rehearsal status, and operator notes for the scheduled production.",
    },
    shortcuts: {
      title: "Shortcut Mapper",
      eyebrow: "Operator Controls",
      description: "Assign hotkeys for TAKE, scenes, overlays, record, stream, mute, and backstage actions.",
    },
    settings: {
      title: "Workflow Settings",
      eyebrow: "Production Preferences",
      description: "Control workspace behavior, confirmations, transition defaults, monitoring, and operator safety rails.",
    },
  }

  const meta = panelMeta[activePanel]



  return (
    <div className="absolute inset-2 z-30 overflow-hidden rounded-[18px] border border-sky-200/14 bg-[radial-gradient(circle_at_20%_0%,rgba(56,189,248,0.12),transparent_32%),linear-gradient(180deg,rgba(8,13,24,0.98),rgba(2,5,11,0.995))] shadow-[0_24px_70px_rgba(0,0,0,0.48),0_0_28px_rgba(56,189,248,0.08),inset_0_1px_0_rgba(255,255,255,0.045)] backdrop-blur-2xl">
      <div className="pointer-events-none absolute inset-0 opacity-[0.018] bg-[repeating-linear-gradient(to_right,rgba(255,255,255,0.032)_0px,rgba(255,255,255,0.032)_1px,transparent_1px,transparent_28px)]" />
      <div className="relative z-10 flex items-start justify-between gap-4 border-b border-white/[0.06] px-5 py-4">
        <div>
          <div className="text-[8px] font-black uppercase tracking-[0.14em] text-sky-100/58">
            {meta.eyebrow}
          </div>
          <div className="mt-1 text-[20px] font-semibold tracking-[-0.055em] text-white/92">
            {meta.title}
          </div>
          <div className="mt-1 max-w-2xl text-[12px] leading-relaxed text-white/46">
            {meta.description}
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-white/[0.08] bg-white/[0.030] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.10em] text-white/58 hover:bg-white/[0.055] hover:text-white/82"
        >
          Close
        </button>
      </div>

      <div className="relative z-10 grid gap-3 p-5 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[16px] border border-white/[0.055] bg-white/[0.025] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.018)]">
          <div className="text-[10px] font-black uppercase tracking-[0.14em] text-white/42">
            Primary Controls
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {[
              "Enable confirmation before live actions",
              "Use event naming template",
              "Notify operator on state changes",
              "Show safety countdown",
            ].map((label, index) => (
              <button
                key={label}
                type="button"
                className={`rounded-[12px] border px-3 py-2.5 text-left text-[11px] font-semibold transition ${
                  index === 0
                    ? "border-sky-300/16 bg-sky-400/[0.10] text-sky-100/78"
                    : "border-white/[0.05] bg-white/[0.020] text-white/60 hover:bg-white/[0.035]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-[16px] border border-white/[0.055] bg-white/[0.020] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.016)]">
          <div className="text-[10px] font-black uppercase tracking-[0.14em] text-white/42">
            Status
          </div>
          <div className="mt-3 space-y-2">
            {[
              ["System", "Ready"],
              ["Route", "Program"],
              ["Health", "Nominal"],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between rounded-[11px] border border-white/[0.045] bg-white/[0.018] px-3 py-2">
                <span className="text-[10px] font-semibold text-white/42">{label}</span>
                <span className="text-[10px] font-black uppercase tracking-[0.10em] text-emerald-100/62">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export function ExpandedRecordingOverlay({
  recordingStatus,
  recordingElapsedSeconds,
  recordings,
  recordingSource,
  recordingDestination,
  recordingQuality,
  recordingError,
  onRecordingSourceChange,
  onRecordingDestinationChange,
  onRecordingQualityChange,
  onArmRecording,
  onStartRecording,
  onStopRecording,
  onClose,
}: {
  recordingStatus: RecordingStatus
  recordingElapsedSeconds: number
  recordings: RecordingSession[]
  recordingSource: string
  recordingDestination: string
  recordingQuality: string
  recordingError: string | null
  onRecordingSourceChange: (value: string) => void
  onRecordingDestinationChange: (value: string) => void
  onRecordingQualityChange: (value: string) => void
  onArmRecording: () => void
  onStartRecording: () => void
  onStopRecording: () => void
  onClose: () => void
}): JSX.Element {
  const isArmed = recordingStatus === "armed"
  const isStarting = recordingStatus === "starting"
  const isRecording = recordingStatus === "recording"
  const latestRecording = recordings[0]
  const latestRecordingStatus =
  latestRecording?.status === "ready"
    ? "Uploaded"
    : latestRecording?.status === "processing"
      ? "Finalizing"
      : latestRecording?.status === "failed"
        ? "Failed"
        : latestRecording?.status === "recording"
          ? "Recording"
          : "Standby"

  const latestRecordingLocation =
  latestRecording?.location
    ? latestRecording.location.split("/").slice(-2).join("/")
    : "Awaiting upload"

  const latestRecordingSize =
  latestRecording?.size && latestRecording.size !== "0"
    ? `${Number(latestRecording.size).toLocaleString()} bytes`
    : "Pending"
  const recordingSourceOptions: RecordingSourceOption[] = [
    {
      id: "program-feed",
      label: "Program Feed",
      type: "program",
      status: isRecording || isStarting ? "live" : "ready",
      description: "Final audience-facing mix with graphics and program audio.",
    },
    {
      id: "preview-feed",
      label: "Preview Feed",
      type: "preview",
      status: "ready",
      description: "Next prepared look before TAKE. Useful for rehearsal captures.",
    },
    {
      id: "screen-share",
      label: "Screen Share",
      type: "iso",
      status: "standby",
      description: "Dedicated screen-share capture path when a presenter is sharing.",
    },
    {
      id: "graphics-clean",
      label: "Graphics Clean Feed",
      type: "clean",
      status: "ready",
      description: "Program-adjacent capture without audience interaction layers.",
    },
    {
      id: "audience-return",
      label: "Audience Return",
      type: "return",
      status: "standby",
      description: "Audience Q&A, moderated participation, or future return audio/video.",
    },
    {
      id: "presenter-host",
      label: "Host ISO",
      type: "iso",
      status: "ready",
      description: "Isolated presenter camera/mic source for post-show editing.",
    },
  ]

  const pipelineStage = isRecording
  ? "Capturing"
  : isStarting
    ? "Starting"
    : recordingStatus === "stopped"
      ? "Processing"
      : isArmed
        ? "Armed"
        : "Idle"

  const encoderStatus = isRecording
  ? "Capturing"
  : isStarting
    ? "Requesting LiveKit egress"
    : isArmed
      ? "Ready to request"
      : recordingStatus === "stopped"
        ? "Packaging"
        : "Standby"

  const estimatedBitrate =
    recordingQuality === "4K Future"
      ? "18 Mbps"
      : recordingQuality === "1080p Standard"
        ? "6 Mbps"
        : "2.5 Mbps"

  const estimatedOutput = recordingElapsedSeconds > 0
    ? `${Math.max(1, Math.round((recordingElapsedSeconds * (recordingQuality === "4K Future" ? 18 : recordingQuality === "1080p Standard" ? 6 : 2.5)) / 8))} MB est.`
    : "—"

  const preflightChecks = [
    {
      label: "Program source ready",
      status: recordingSource.length > 0,
      detail: recordingSource,
    },
    {
      label: "Destination selected",
      status: recordingDestination.length > 0,
      detail: recordingDestination,
    },
    {
      label: "Quality profile valid",
      status: recordingQuality !== "",
      detail: recordingQuality,
    },
    {
  label: "Egress provider",
  status: true,
  detail: "LiveKit configured",
},
{
  label: "Storage target",
  status: true,
  detail: "S3 connected",
},
  ]

  const passedPreflightChecks = preflightChecks.filter((check) => check.status).length
  return (
    <div className="fixed inset-x-6 bottom-4 top-[86px] z-[999] overflow-y-auto overflow-x-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden rounded-[24px] border border-red-200/16 bg-[radial-gradient(circle_at_20%_0%,rgba(248,113,113,0.15),transparent_34%),radial-gradient(circle_at_84%_10%,rgba(251,191,36,0.08),transparent_28%),linear-gradient(180deg,rgba(18,8,10,0.985),rgba(4,5,10,0.998))] shadow-[0_34px_110px_rgba(0,0,0,0.72),0_0_42px_rgba(248,113,113,0.10),inset_0_1px_0_rgba(255,255,255,0.045)] backdrop-blur-2xl">
      <div className="pointer-events-none absolute inset-0 opacity-[0.018] bg-[repeating-linear-gradient(to_right,rgba(255,255,255,0.030)_0px,rgba(255,255,255,0.030)_1px,transparent_1px,transparent_32px)]" />

      <div className="relative z-10 flex items-start justify-between gap-4 border-b border-white/[0.065] px-5 py-4">
        <div>
          <div className="text-[9px] font-black uppercase tracking-[0.18em] text-red-100/58">
            Program Recording
          </div>
          <div className="mt-1 text-[24px] font-semibold tracking-[-0.055em] text-white/92">
            Recording Console
          </div>
          <div className="mt-1 max-w-2xl text-[12px] leading-relaxed text-white/46">
            LiveKit egress recording, runtime, saved session tracking, and S3 finalization status.
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-white/[0.08] bg-white/[0.030] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.10em] text-white/58 transition hover:bg-white/[0.055] hover:text-white/82"
        >
          Close
        </button>
      </div>

      <div className="relative z-10 grid min-h-0 items-start gap-4 p-5 xl:grid-cols-[1.08fr_0.92fr]">
        <div className="min-h-0 rounded-[18px] border border-white/[0.065] bg-white/[0.024] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.018)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[9px] font-black uppercase tracking-[0.15em] text-white/42">
                Status
              </div>
              <div className="mt-2 flex items-center gap-3">
                <span
                  className={`h-3.5 w-3.5 rounded-full ${
isRecording
  ? "animate-pulse bg-red-400 shadow-[0_0_22px_rgba(248,113,113,0.62)]"
  : isStarting
    ? "animate-pulse bg-sky-300 shadow-[0_0_20px_rgba(56,189,248,0.50)]"
    : isArmed
      ? "bg-amber-300 shadow-[0_0_18px_rgba(251,191,36,0.42)]"
      : "bg-white/22"
                  }`}
                />
                <div className="text-[34px] font-semibold uppercase tracking-[-0.06em] text-white/90">
                  {isRecording ? "Recording" : isStarting ? "Starting Recorder" : isArmed ? "Armed" : recordingStatus === "stopped" ? "Stopped" : "Idle"}                </div>
              </div>
            </div>

            <div
              className={`rounded-[18px] border px-5 py-4 text-right transition-all duration-300 ${
                isRecording
                  ? "border-red-300/45 bg-red-950/20 shadow-[0_0_0_1px_rgba(248,113,113,0.22),0_0_26px_rgba(248,113,113,0.34),inset_0_1px_0_rgba(255,255,255,0.028)]"
                  : isStarting
                    ? "border-sky-300/32 bg-sky-950/18 shadow-[0_0_0_1px_rgba(56,189,248,0.16),0_0_22px_rgba(56,189,248,0.24),inset_0_1px_0_rgba(255,255,255,0.024)]"
                    : "border-white/[0.060] bg-black/32 shadow-[inset_0_1px_0_rgba(255,255,255,0.020)]"
              }`}
            >
              <div className="text-[8px] font-black uppercase tracking-[0.14em] text-white/34">
                Runtime
              </div>
              <div className="mt-1 font-mono text-[34px] font-semibold tabular-nums text-white/90">
                {formatRecordingDuration(recordingElapsedSeconds)}
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <button
              type="button"
              onClick={onArmRecording}
              disabled={isRecording || isStarting}
              className={`rounded-[16px] border px-4 py-4 text-[11px] font-black uppercase tracking-[0.12em] transition ${
                isArmed
                  ? "border-amber-300/24 bg-amber-300/14 text-amber-100/86"
                  : "border-white/[0.065] bg-white/[0.024] text-white/58 hover:bg-white/[0.045] hover:text-white/82 disabled:opacity-35"
              }`}
            >
              Arm
            </button>

            <button
              type="button"
              onClick={onStartRecording}
              disabled={!isArmed || isRecording || isStarting}
              className="rounded-[16px] border border-red-300/24 bg-red-400/14 px-4 py-4 text-[11px] font-black uppercase tracking-[0.12em] text-red-100/82 shadow-[0_0_20px_rgba(248,113,113,0.12)] transition hover:bg-red-400/20 disabled:cursor-not-allowed disabled:opacity-35"
            >
              {isStarting ? "Starting..." : "Start Recording"}
            </button>

            <button
              type="button"
              onClick={onStopRecording}
              disabled={!isRecording || isStarting}
              className="rounded-[16px] border border-white/[0.075] bg-white/[0.030] px-4 py-4 text-[11px] font-black uppercase tracking-[0.12em] text-white/64 transition hover:bg-white/[0.055] hover:text-white/86 disabled:cursor-not-allowed disabled:opacity-35"
            >
              Stop
            </button>
          </div>

          <div className="mt-5 rounded-[16px] border border-sky-200/10 bg-sky-400/[0.035] px-4 py-3 text-[11px] leading-5 text-sky-50/54">
            LiveKit egress is now connected to S3-backed recording finalization. Future passes can add thumbnails, downloadable archives, retention policies, ISO exports, and recording analytics.
          </div>
          {recordingError ? (
            <div className="mt-4 rounded-[16px] border border-red-300/16 bg-red-400/[0.10] px-4 py-3 text-[11px] leading-5 text-red-100/82 shadow-[0_0_20px_rgba(248,113,113,0.08)]">
              {recordingError}
            </div>
          ) : null}
          <div className="mt-4 rounded-[18px] border border-white/[0.060] bg-black/24 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.014)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[8px] font-black uppercase tracking-[0.14em] text-white/42">
                  Recording Preflight
                </div>
                <div className="mt-1 text-[12px] font-semibold text-white/64">
                  Validate capture readiness before requesting egress.
                </div>
              </div>

              <div className={`rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.12em] ${
                passedPreflightChecks === preflightChecks.length
                  ? "border-emerald-300/16 bg-emerald-400/[0.080] text-emerald-100/70"
                  : "border-amber-300/16 bg-amber-300/[0.080] text-amber-100/68"
              }`}>
                {passedPreflightChecks}/{preflightChecks.length} Ready
              </div>
            </div>

            <div className="mt-3 grid gap-2">
              {preflightChecks.map((check) => (
                <div
                  key={check.label}
                  className="flex items-center justify-between gap-3 rounded-[12px] border border-white/[0.050] bg-white/[0.018] px-3 py-2"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                        check.status
                          ? "bg-emerald-300 shadow-[0_0_10px_rgba(52,211,153,0.55)]"
                          : "bg-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.42)]"
                      }`}
                    />
                    <div className="min-w-0">
                      <div className="truncate text-[10px] font-semibold text-white/70">
                        {check.label}
                      </div>
                      <div className="mt-0.5 truncate text-[8px] font-black uppercase tracking-[0.08em] text-white/28">
                        {check.detail}
                      </div>
                    </div>
                  </div>

                  <div
                    className={`shrink-0 rounded-full border px-2 py-0.5 text-[7px] font-black uppercase tracking-[0.08em] ${
                      check.status
                        ? "border-emerald-300/14 bg-emerald-400/[0.070] text-emerald-100/64"
                        : "border-amber-300/14 bg-amber-300/[0.070] text-amber-100/64"
                    }`}
                  >
                    {check.status ? "Ready" : "Pending"}
                  </div>
                </div>
              ))}
            </div>
          </div>
                    <div className="mt-4 rounded-[18px] border border-white/[0.060] bg-black/22 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.014)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[8px] font-black uppercase tracking-[0.14em]text-white/42">
                  Capture Model
                </div>
               <div className="mt-1 text-[12px] font-semibold text-white/64">
  LiveKit pipeline state, S3 upload status, encoder readiness, and finalized output telemetry.
</div>
              </div>

              <div className="rounded-full border border-amber-300/14 bg-amber-300/[0.070] px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.12em] text-amber-100/62">
                Pending Egress
              </div>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-3">
              <div>
                <div className="mb-1.5 text-[8px] font-black uppercase tracking-[0.14em] text-white/34">
                  Source
                </div>

                <div className="grid max-h-[260px] gap-1.5 overflow-y-auto pr-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {recordingSourceOptions.map((option) => {
                    const active = recordingSource === option.label

                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => onRecordingSourceChange(option.label)}
                        className={`rounded-[12px] border px-3 py-2 text-left transition ${
                          active
                            ? "border-red-300/22 bg-red-400/[0.105] shadow-[0_0_16px_rgba(248,113,113,0.10)]"
                            : "border-white/[0.050] bg-white/[0.018] hover:bg-white/[0.035]"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0 truncate text-[10px] font-black uppercase tracking-[0.08em] text-white/72">
                            {option.label}
                          </div>
                          <span
                            className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[7px] font-black uppercase tracking-[0.08em] ${
                              option.status === "live"
                                ? "border-red-300/22 bg-red-400/[0.12] text-red-100/78"
                                : option.status === "ready"
                                  ? "border-emerald-300/14 bg-emerald-400/[0.070] text-emerald-100/58"
                                  : "border-white/[0.055] bg-white/[0.020] text-white/32"
                            }`}
                          >
                            {option.status}
                          </span>
                        </div>
                        <div className="mt-1 text-[9px] leading-4 text-white/36">
                          {option.description}
                        </div>
                        <div className="mt-1.5 text-[7px] font-black uppercase tracking-[0.12em] text-white/24">
                          {option.type} source
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <div className="mb-1.5 text-[8px] font-black uppercase tracking-[0.14em] text-white/34">
                  Destination
                </div>

                <div className="grid gap-1.5">
                  {["Jupiter Cloud", "Local Browser", "External Storage"].map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => onRecordingDestinationChange(option)}
                      className={`rounded-[9px] border px-3 py-2 text-left text-[10px] font-black uppercase tracking-[0.08em] transition ${
                        recordingDestination === option
                          ? "border-sky-300/20 bg-sky-400/[0.090] text-sky-100/76"
                          : "border-white/[0.050] bg-white/[0.018] text-white/42 hover:bg-white/[0.035] hover:text-white/68"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-1.5 text-[8px] font-black uppercase tracking-[0.14em] text-white/34">
                  Quality
                </div>

                <div className="grid gap-1.5">
                  {["720p Draft", "1080p Standard", "4K Future"].map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => onRecordingQualityChange(option)}
                      className={`rounded-[9px] border px-2 py-1 text-left text-[10px] font-black uppercase tracking-[0.08em] transition ${
                        recordingQuality === option
                          ? "border-emerald-300/18 bg-emerald-400/[0.080] text-emerald-100/72"
                          : "border-white/[0.050] bg-white/[0.018] text-white/42 hover:bg-white/[0.035] hover:text-white/68"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-col gap-3 rounded-[18px] border border-white/[0.065] bg-white/[0.020] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.016)]">
          <div className="flex items-center justify-between">
            <div className="text-[8px] font-black uppercase tracking-[0.14em] text-white/42">
              Sessions
            </div>
            <div className="rounded-full border border-white/[0.055] bg-black/22 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.10em] text-white/34">
              {recordings.length} saved
            </div>
          </div>

          <div className="mt-3 max-h-[220px] space-y-2 overflow-y-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {recordings.length ? (
              recordings.slice(0, 8).map((recording) => (
                <div key={recording.id} className="rounded-[14px] border border-white/[0.050] bg-black/22 px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="truncate text-[12px] font-semibold text-white/74">
                      {recording.label}
                    </div>
                    <span className={`rounded-full border px-2 py-0.5 text-[7px] font-black uppercase tracking-[0.10em] ${
                      recording.status === "ready"
                        ? "border-emerald-300/14 bg-emerald-400/[0.070] text-emerald-100/62"
                        : recording.status === "recording"
                          ? "border-red-300/20 bg-red-400/[0.12] text-red-100/78"
                          : recording.status === "failed"
                            ? "border-red-300/16 bg-red-400/[0.08] text-red-100/70"
                            : "border-amber-300/14 bg-amber-400/[0.070] text-amber-100/62"
                    }`}>
                      {recording.status}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-[9px] font-semibold text-white/34">
                    <span>{new Date(recording.startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    <span>{formatRecordingDuration(recording.durationSeconds)}</span>
                  </div>
                  <div className="mt-1 truncate text-[8px] font-black uppercase tracking-[0.08em] text-white/26">
                    {recording.source} · {recording.quality}
                  </div>
                  {recording.size ? (
                    <div className="mt-1 truncate text-[8px] font-black uppercase tracking-[0.08em] text-emerald-100/34">
                      {recording.size} bytes · {recording.location ? "Stored" : "No location"}
                    </div>
                  ) : null}
                </div>
              ))
            ) : (
              <div className="rounded-[14px] border border-dashed border-white/[0.070] bg-white/[0.014] px-3 py-10 text-center text-[12px] leading-5 text-white/38">
                No recording sessions yet. Arm the recorder and start a capture to create the first session entry.
              </div>
            )}
          </div>

          {latestRecording ? (
            <div className="rounded-[14px] border border-emerald-300/10 bg-emerald-400/[0.045] px-3 py-2 text-[10px] leading-4 text-emerald-50/54">
              Latest: {latestRecording.label} · {latestRecordingStatus} · {latestRecordingLocation}
            </div>
          ) : null}

          <div className="rounded-[18px] border border-white/[0.060] bg-black/24 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.014)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[8px] font-black uppercase tracking-[0.14em] text-white/42">
                  Recording Pipeline
                </div>
<div className="mt-1 text-[12px] font-semibold text-white/64">
  Live capture telemetry, encoder state, upload finalization, and recording delivery readiness.
</div>
              </div>
              <div className={`rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.12em] ${
                isRecording
                  ? "border-red-300/20 bg-red-400/[0.12] text-red-100/78"
                  : recordingStatus === "stopped"
                    ? "border-amber-300/18 bg-amber-300/[0.080] text-amber-100/68"
                    : isArmed
                      ? "border-sky-300/18 bg-sky-400/[0.080] text-sky-100/68"
                      : "border-white/[0.060] bg-white/[0.020] text-white/40"
              }`}>
                {pipelineStage}
              </div>
            </div>

            <div className="mt-3 grid gap-2">
              {[
                ["Source", recordingSource],
                ["Destination", recordingDestination],
                ["Quality", recordingQuality],
                ["Encoder", encoderStatus],
                ["Target Bitrate", estimatedBitrate],
                ["Estimated Output", latestRecordingSize],
                ["Delivery", latestRecordingStatus],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-3 rounded-[12px] border border-white/[0.050] bg-white/[0.018] px-3 py-2">
                  <span className="text-[10px] font-semibold text-white/42">{label}</span>
                  <span className="truncate text-right text-[10px] font-black uppercase tracking-[0.08em] text-white/64">{value}</span>
                </div>
              ))}
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              {[
                ["Health", isRecording ? "Stable" : "Ready"],
                ["Dropped Frames", "0"],
                ["Exports", latestRecording?.status === "ready" ? "Ready" : recordingStatus === "stopped" ? "Finalizing" : "Pending"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-[12px] border border-white/[0.045] bg-black/22 px-2.5 py-2 text-center">
                  <div className="text-[7px] font-black uppercase tracking-[0.12em] text-white/28">{label}</div>
                  <div className="mt-1 text-[11px] font-black uppercase tracking-[0.08em] text-white/62">{value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
