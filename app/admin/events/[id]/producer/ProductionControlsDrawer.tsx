import { CircleDot, Mic2, Volume2, X } from "lucide-react"
import type { JSX } from "react"

export type ProductionDrawerTab = "audio" | "recording"
export type ProductionRecordingStatus = "idle" | "armed" | "starting" | "recording" | "stopped"
export type ProductionAudioChannel = {
  id: string
  label: string
  level: number
  muted: boolean
  solo: boolean
}
export type ProductionRecordingItem = {
  id: string
  label: string
  status: "processing" | "ready" | "recording" | "failed"
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = seconds % 60

  return [hours, minutes, remainingSeconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":")
}

function AudioChannelRow({
  channel,
  onToggleMute,
  onToggleSolo,
}: {
  channel: ProductionAudioChannel
  onToggleMute: () => void
  onToggleSolo: () => void
}): JSX.Element {
  const level = Math.max(2, Math.min(100, channel.muted ? 2 : channel.level))
  const warning = level >= 88

  return (
    <div className="grid grid-cols-[70px_minmax(100px,1fr)_42px_42px] items-center gap-2 border-b border-white/[0.055] py-2 last:border-b-0">
      <div>
        <div className="text-[10px] font-semibold text-white/76">{channel.label}</div>
        <div className="mt-0.5 text-[8px] text-white/28">{channel.muted ? "Muted" : warning ? "High" : "Active"}</div>
      </div>
      <div className="relative h-2 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-[width] duration-100 ${warning ? "bg-amber-300/70" : "bg-emerald-300/70"}`}
          style={{ width: `${level}%` }}
        />
      </div>
      <button
        type="button"
        aria-pressed={channel.solo}
        onClick={onToggleSolo}
        className={`h-8 rounded-[8px] border text-[9px] font-semibold ${channel.solo ? "border-amber-300/30 bg-amber-300/[0.12] text-amber-100" : "border-white/[0.07] text-white/38 hover:bg-white/[0.04]"}`}
      >
        Solo
      </button>
      <button
        type="button"
        aria-pressed={channel.muted}
        onClick={onToggleMute}
        className={`h-8 rounded-[8px] border text-[9px] font-semibold ${channel.muted ? "border-red-300/30 bg-red-400/[0.12] text-red-100" : "border-white/[0.07] text-white/38 hover:bg-white/[0.04]"}`}
      >
        Mute
      </button>
    </div>
  )
}

export default function ProductionControlsDrawer({
  activeTab,
  onTabChange,
  onClose,
  audioChannels,
  onToggleMute,
  onToggleSolo,
  recordingStatus,
  recordingElapsedSeconds,
  recordings,
  recordingError,
  recordingSource,
  recordingDestination,
  recordingQuality,
  onRecordingSourceChange,
  onRecordingDestinationChange,
  onRecordingQualityChange,
  onArmRecording,
  onStartRecording,
  onStopRecording,
}: {
  activeTab: ProductionDrawerTab
  onTabChange: (tab: ProductionDrawerTab) => void
  onClose: () => void
  audioChannels: ProductionAudioChannel[]
  onToggleMute: (channel: string) => void
  onToggleSolo: (channel: string) => void
  recordingStatus: ProductionRecordingStatus
  recordingElapsedSeconds: number
  recordings: ProductionRecordingItem[]
  recordingError: string | null
  recordingSource: string
  recordingDestination: string
  recordingQuality: string
  onRecordingSourceChange: (value: string) => void
  onRecordingDestinationChange: (value: string) => void
  onRecordingQualityChange: (value: string) => void
  onArmRecording: () => void
  onStartRecording: () => void
  onStopRecording: () => void
}): JSX.Element {
  const isArmed = recordingStatus === "armed"
  const isStarting = recordingStatus === "starting"
  const isRecording = recordingStatus === "recording"

  return (
    <div className="fixed inset-x-3 bottom-3 z-[1000] flex max-h-[72dvh] min-h-[330px] flex-col overflow-hidden rounded-[16px] border border-white/[0.13] bg-[#050914]/[0.99] shadow-[0_28px_90px_rgba(0,0,0,0.72)] backdrop-blur-2xl sm:inset-x-5 lg:left-[96px] lg:right-[292px]">
      <header className="flex h-[58px] shrink-0 items-center justify-between border-b border-white/[0.07] px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-[9px] border border-white/[0.08] bg-white/[0.035] text-white/48">
            {activeTab === "audio" ? <Volume2 size={16} /> : <CircleDot size={16} />}
          </div>
          <div>
            <div className="text-[8px] font-semibold uppercase tracking-[0.16em] text-white/30">Production controls</div>
            <div className="mt-0.5 text-[14px] font-semibold text-white/84">
              {activeTab === "audio" ? "Audio" : "Recording"}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="grid grid-cols-2 gap-1 rounded-[9px] border border-white/[0.06] bg-black/20 p-1">
            {(["audio", "recording"] as ProductionDrawerTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => onTabChange(tab)}
                className={`h-7 rounded-[7px] px-3 text-[9px] font-semibold capitalize ${activeTab === tab ? "bg-white/[0.10] text-white/80" : "text-white/34 hover:bg-white/[0.04]"}`}
              >
                {tab}
              </button>
            ))}
          </div>
          <button
            type="button"
            aria-label="Close production controls"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-[9px] border border-white/[0.07] text-white/38 hover:bg-white/[0.05] hover:text-white/70"
          >
            <X size={15} />
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {activeTab === "audio" ? (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
            <section className="rounded-[12px] border border-white/[0.07] bg-white/[0.018] px-3">
              {audioChannels.map((channel) => (
                <AudioChannelRow
                  key={channel.id}
                  channel={channel}
                  onToggleMute={() => onToggleMute(channel.id)}
                  onToggleSolo={() => onToggleSolo(channel.id)}
                />
              ))}
            </section>
            <aside className="rounded-[12px] border border-white/[0.07] bg-white/[0.018] p-3">
              <Mic2 size={16} className="text-emerald-200/55" />
              <div className="mt-3 text-[13px] font-semibold text-white/76">Program audio</div>
              <p className="mt-1 text-[9px] leading-relaxed text-white/34">
                Levels are visible at a glance. Solo and Mute are the only controls exposed during show operation.
              </p>
              <div className="mt-4 rounded-[9px] border border-emerald-300/12 bg-emerald-400/[0.045] px-3 py-2 text-[9px] text-emerald-100/62">
                Master bus ready
              </div>
            </aside>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
            <section className="rounded-[12px] border border-white/[0.07] bg-white/[0.018] p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[8px] font-semibold uppercase tracking-[0.14em] text-white/30">Program recording</div>
                  <div className="mt-2 text-[28px] font-semibold tabular-nums tracking-[-0.04em] text-white/88">
                    {formatDuration(recordingElapsedSeconds)}
                  </div>
                  <div className="mt-1 text-[10px] capitalize text-white/38">{recordingStatus}</div>
                </div>
                <div className={`rounded-[8px] border px-3 py-2 text-[9px] font-semibold ${isRecording ? "border-red-300/22 bg-red-400/[0.10] text-red-100" : isArmed || isStarting ? "border-amber-300/20 bg-amber-300/[0.08] text-amber-100" : "border-white/[0.07] text-white/34"}`}>
                  {isRecording ? "Recording" : isStarting ? "Starting" : isArmed ? "Armed" : "Standby"}
                </div>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <label className="text-[8px] text-white/30">
                  Source
                  <select value={recordingSource} onChange={(event) => onRecordingSourceChange(event.target.value)} className="mt-1 h-9 w-full rounded-[8px] border border-white/[0.08] bg-[#070c16] px-2 text-[9px] text-white/64 outline-none">
                    <option>Program Feed</option>
                    <option>Preview Feed</option>
                    <option>Graphics Clean Feed</option>
                  </select>
                </label>
                <label className="text-[8px] text-white/30">
                  Destination
                  <select value={recordingDestination} onChange={(event) => onRecordingDestinationChange(event.target.value)} className="mt-1 h-9 w-full rounded-[8px] border border-white/[0.08] bg-[#070c16] px-2 text-[9px] text-white/64 outline-none">
                    <option>Jupiter Cloud</option>
                    <option>Live Archive</option>
                  </select>
                </label>
                <label className="text-[8px] text-white/30">
                  Quality
                  <select value={recordingQuality} onChange={(event) => onRecordingQualityChange(event.target.value)} className="mt-1 h-9 w-full rounded-[8px] border border-white/[0.08] bg-[#070c16] px-2 text-[9px] text-white/64 outline-none">
                    <option>1080p Standard</option>
                    <option>1080p High</option>
                    <option>720p Standard</option>
                  </select>
                </label>
              </div>

              {recordingError ? (
                <div className="mt-3 rounded-[9px] border border-red-300/18 bg-red-400/[0.07] px-3 py-2 text-[9px] text-red-100/68">{recordingError}</div>
              ) : null}

              <div className="mt-4 grid grid-cols-3 gap-2">
                <button type="button" onClick={onArmRecording} disabled={isRecording || isStarting} className="h-10 rounded-[9px] border border-amber-300/18 bg-amber-300/[0.06] text-[10px] font-semibold text-amber-100/64 disabled:cursor-not-allowed disabled:opacity-30">1 · Arm</button>
                <button type="button" onClick={onStartRecording} disabled={!isArmed || isRecording || isStarting} className="h-10 rounded-[9px] border border-emerald-300/20 bg-emerald-400/[0.08] text-[10px] font-semibold text-emerald-100/70 disabled:cursor-not-allowed disabled:opacity-30">2 · Start</button>
                <button type="button" onClick={onStopRecording} disabled={!isRecording || isStarting} className="h-10 rounded-[9px] border border-red-300/20 bg-red-400/[0.08] text-[10px] font-semibold text-red-100/70 disabled:cursor-not-allowed disabled:opacity-30">Stop</button>
              </div>
            </section>

            <aside className="rounded-[12px] border border-white/[0.07] bg-white/[0.018] p-3">
              <div className="text-[10px] font-semibold text-white/64">Recent recordings</div>
              <div className="mt-3 space-y-2">
                {recordings.length ? recordings.slice(0, 4).map((recording) => (
                  <div key={recording.id} className="rounded-[8px] border border-white/[0.055] px-2.5 py-2">
                    <div className="truncate text-[9px] font-medium text-white/60">{recording.label}</div>
                    <div className="mt-1 text-[8px] capitalize text-white/28">{recording.status}</div>
                  </div>
                )) : (
                  <div className="rounded-[8px] border border-dashed border-white/[0.08] px-3 py-6 text-center text-[9px] text-white/28">No recordings yet</div>
                )}
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  )
}
