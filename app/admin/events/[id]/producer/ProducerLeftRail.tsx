

import { useEffect, useState } from "react"
import type { JSX } from "react"
import { useRoomContext } from "@livekit/components-react"
import {
  Activity,
  Camera,
  Cpu,
  Globe2,
  Mic2,
  MonitorUp,
  Radio,
  SatelliteDish,
  ShieldCheck,
  SlidersHorizontal,
  Zap,
} from "lucide-react"
import type { StageState } from "./producerRoomTypes"
import AudioMixerPanel from "./AudioMixerPanel"


type ScreenLayoutPreset = "classic" | "brand" | "speaker_focus" | "fullscreen"

function RailTelemetryChip({
  icon,
  label,
  value,
  tone = "neutral",
}: {
  icon: JSX.Element
  label: string
  value: string
  tone?: "neutral" | "sky" | "green" | "amber"
}): JSX.Element {
  const toneClass =
    tone === "sky"
      ? "border-sky-300/14 bg-sky-400/8 text-sky-100/62"
      : tone === "green"
        ? "border-emerald-300/14 bg-emerald-400/8 text-emerald-100/62"
        : tone === "amber"
          ? "border-amber-300/14 bg-amber-400/8 text-amber-100/62"
          : "border-white/10 bg-black/24 text-white/42"

  return (
    <div className={`flex items-center gap-2 rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.14em] ${toneClass}`}>
      <span className="opacity-80">{icon}</span>
      <span className="text-white/30">{label}</span>
      <span>{value}</span>
    </div>
  )
}

function RailRackHeader(): JSX.Element {
  return (
    <div className="rounded-[30px] border border-sky-300/14 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.14),transparent_36%),radial-gradient(circle_at_bottom_left,rgba(168,85,247,0.08),transparent_34%),linear-gradient(180deg,rgba(8,18,34,0.94),rgba(3,7,16,0.99))] p-3 shadow-[0_24px_80px_rgba(0,0,0,0.40),inset_0_1px_0_rgba(255,255,255,0.045)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-sky-100/72">
            <Radio size={13} />
            Mission Control Rack
          </div>
          <div className="mt-1 text-sm font-semibold tracking-tight text-white">
            Transmission + Device Stack
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/16 bg-emerald-400/8 px-3 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-emerald-100/66">
          <ShieldCheck size={11} />
          Armed
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <RailTelemetryChip
          icon={<SatelliteDish size={10} />}
          label="Relay"
          value="Locked"
          tone="green"
        />

        <RailTelemetryChip
          icon={<Globe2 size={10} />}
          label="CDN"
          value="Healthy"
          tone="sky"
        />

        <RailTelemetryChip
          icon={<Cpu size={10} />}
          label="GPU"
          value="62%"
          tone="amber"
        />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {[
          { label: "Route", value: "Live", tone: "text-red-100/68 border-red-300/14 bg-red-400/8" },
          { label: "Stage", value: "Ready", tone: "text-sky-100/68 border-sky-300/14 bg-sky-400/8" },
          { label: "Devices", value: "Locked", tone: "text-emerald-100/68 border-emerald-300/14 bg-emerald-400/8" },
        ].map((item) => (
          <div
            key={item.label}
            className={`rounded-2xl border px-2 py-2 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] ${item.tone}`}
          >
            <div className="text-[8px] font-black uppercase tracking-[0.16em] opacity-65">
              {item.label}
            </div>
            <div className="mt-0.5 text-xs font-semibold tracking-tight">
              {item.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function RackSectionHeader({
  icon,
  title,
  sub,
}: {
  icon: JSX.Element
  title: string
  sub: string
}): JSX.Element {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black/24 text-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          {icon}
        </span>
        <div className="min-w-0">
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/38">
            {title}
          </div>
          <div className="mt-0.5 truncate text-xs text-white/42">
            {sub}
          </div>
        </div>
      </div>
    </div>
  )
}

function MonitorSizePanel({
  monitorHeight,
  onMonitorHeightChange,
}: {
  monitorHeight: number
  onMonitorHeightChange: (value: number) => void
}): JSX.Element {
  return (
    <div className="rounded-[28px] border border-sky-300/18 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.16),transparent_38%),linear-gradient(180deg,rgba(14,27,45,0.84),rgba(4,9,18,0.94))] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.32),0_0_28px_rgba(56,189,248,0.10),inset_0_1px_0_rgba(255,255,255,0.055)]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <RackSectionHeader
          icon={<MonitorUp size={15} />}
          title="Monitor Trim"
          sub="Resize Preview and Program together."
        />
        <span className="rounded-full border border-sky-300/16 bg-sky-400/8 px-2.5 py-1 text-[10px] font-semibold tabular-nums text-sky-100/70">
          {monitorHeight}px
        </span>
      </div>
      <input
        type="range"
        min="420"
        max="760"
        step="20"
        value={monitorHeight}
        onChange={(e) => onMonitorHeightChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-white/15 accent-sky-300"
        aria-label="Monitor size"
      />
      <div className="mt-2 flex justify-between text-[10px] text-white/35">
        <span>Compact</span>
        <span>Large</span>
      </div>
    </div>
  )
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
  screenLayoutPreset,
  onSetScreenLayoutPreset,
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
  screenLayoutPreset: ScreenLayoutPreset
  onSetScreenLayoutPreset: (preset: ScreenLayoutPreset) => void
}): JSX.Element {
  return (
    <>
      <div className="rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),transparent_34%),linear-gradient(180deg,rgba(18,22,38,0.82),rgba(5,7,16,0.94))] p-3.5 shadow-[0_22px_70px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.055)]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.26em] text-white/38">
            <Zap size={13} />
            Transmission Route
          </div>
          <div className="mt-1 text-xs text-white/45">
            Send the audience live or off air.
          </div>
        </div>
        <span className="rounded-full border border-red-300/20 bg-red-500/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-red-100/80">
          Audience Path
        </span>
      </div>

        <div className="space-y-3">
          <button
            onClick={onGoLive}
            className="w-full rounded-2xl border border-red-300/30 bg-red-500/16 px-4 py-3 text-sm font-black uppercase tracking-[0.18em] text-red-100 shadow-[0_0_24px_rgba(239,68,68,0.16)] transition hover:-translate-y-0.5 hover:bg-red-500/24 active:translate-y-0"
          >
            Send Live
          </button>

          <button
            onClick={onGoOffAir}
            className="w-full rounded-2xl border border-white/12 bg-white/[0.045] px-4 py-3 text-sm font-black uppercase tracking-[0.18em] text-white/75 transition hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.075] active:translate-y-0"
          >
            Hold Off Air
          </button>
        </div>
      </div>

      <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.018))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.045)]">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-white/40">
              <SlidersHorizontal size={13} />
              Stage Routing
            </div>
            <div className="mt-1 text-xs text-white/45">
              Choose the program composition.
            </div>
          </div>

          <span className="rounded-full border border-white/10 bg-black/30 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-white/45">
            Stage
          </span>
        </div>

        <div className="space-y-2">
          <button
            onClick={() => onSetLayout("solo")}
            className={`w-full rounded-2xl border px-4 py-2.5 text-sm font-black uppercase tracking-[0.15em] transition hover:-translate-y-0.5 active:translate-y-0 ${
              layout === "solo"
                ? "border-white/70 bg-white text-black shadow-[0_0_26px_rgba(255,255,255,0.18)]"
                : "border-white/12 bg-white/[0.045] text-white/72 hover:border-white/20 hover:bg-white/[0.075]"
            }`}
          >
            Solo
          </button>

          <button
            onClick={() => onSetLayout("grid")}
            className={`w-full rounded-2xl border px-4 py-2.5 text-sm font-black uppercase tracking-[0.15em] transition hover:-translate-y-0.5 active:translate-y-0 ${
              layout === "grid"
                ? "border-white/70 bg-white text-black shadow-[0_0_26px_rgba(255,255,255,0.18)]"
                : "border-white/12 bg-white/[0.045] text-white/72 hover:border-white/20 hover:bg-white/[0.075]"
            }`}
          >
            Grid
          </button>

          <button
            onClick={() => onSetLayout("screen_speaker")}
            className={`w-full rounded-2xl border px-4 py-2.5 text-sm font-black uppercase tracking-[0.15em] transition hover:-translate-y-0.5 active:translate-y-0 ${
              layout === "screen_speaker"
                ? "border-white/70 bg-white text-black shadow-[0_0_26px_rgba(255,255,255,0.18)]"
                : "border-white/12 bg-white/[0.045] text-white/72 hover:border-white/20 hover:bg-white/[0.075]"
            }`}
          >
            Speaker + Screen
          </button>

          <button
            onClick={onToggleAutoDirector}
            className={`w-full rounded-2xl border px-4 py-2.5 text-sm font-black uppercase tracking-[0.15em] transition hover:-translate-y-0.5 active:translate-y-0 ${
              autoDirectorEnabled
                ? "border-emerald-200/50 bg-emerald-300 text-black shadow-[0_0_26px_rgba(52,211,153,0.22)]"
                : "border-white/12 bg-white/[0.045] text-white/72 hover:border-white/20 hover:bg-white/[0.075]"
            }`}
          >
            {autoDirectorEnabled ? "Auto Director On" : "Auto Director Off"}
          </button>

          <div className="mt-4 rounded-[22px] border border-violet-300/18 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.14),transparent_36%),rgba(0,0,0,0.24)] p-3">
            <div className="mb-3 text-[10px] font-black uppercase tracking-[0.22em] text-violet-100/65">
              Screen Presets
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "classic", label: "Classic" },
                { id: "brand", label: "Brand" },
                { id: "speaker_focus", label: "Speaker" },
                { id: "fullscreen", label: "Full" },
              ].map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onSetScreenLayoutPreset(preset.id as ScreenLayoutPreset)}
                  className={`rounded-xl border px-2.5 py-2 text-[10px] font-black uppercase tracking-[0.13em] transition hover:-translate-y-0.5 active:translate-y-0 ${
                    screenLayoutPreset === preset.id
                      ? "border-violet-200/60 bg-violet-200 text-black shadow-[0_0_22px_rgba(168,85,247,0.22)]"
                      : "border-white/10 bg-white/[0.045] text-white/62 hover:border-white/20 hover:bg-white/[0.075]"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function ProducerMicControls(): JSX.Element {
  const room = useRoomContext()
  const [micEnabled, setMicEnabled] = useState(
    room.localParticipant.isMicrophoneEnabled
  )
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const tag = (event.target as HTMLElement | null)?.tagName?.toLowerCase()
      if (tag === "input" || tag === "textarea" || tag === "select") return

      if (event.code === "KeyM") {
        event.preventDefault()
        void setMic(!room.localParticipant.isMicrophoneEnabled)
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [room])

  async function setMic(value: boolean) {
    try {
      setBusy(true)
      await room.localParticipant.setMicrophoneEnabled(value)
      setMicEnabled(room.localParticipant.isMicrophoneEnabled)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="relative overflow-hidden rounded-[30px] border border-violet-200/18 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.16),transparent_38%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.10),transparent_34%),linear-gradient(180deg,rgba(24,18,38,0.84),rgba(6,6,14,0.96))] p-3.5 shadow-[0_22px_66px_rgba(0,0,0,0.34),0_0_30px_rgba(168,85,247,0.08),inset_0_1px_0_rgba(255,255,255,0.055)]">
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-violet-100/42 to-transparent" />
      <div className="relative z-10 mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-violet-100/72">
            <Mic2 size={13} />
            IFB + Talkback
          </div>
          <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.13em] text-white/34">
            Producer mic · talent cue channel
          </div>
        </div>
        <span
          className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] ${
            micEnabled
              ? "border-emerald-200/32 bg-emerald-300/12 text-emerald-50"
              : "border-red-200/28 bg-red-500/12 text-red-100"
          }`}
        >
          {micEnabled ? "Open" : "Muted"}
        </span>
      </div>

      <div className="relative z-10 grid gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void setMic(!micEnabled)}
          className={`rounded-2xl border px-4 py-3 text-sm font-black uppercase tracking-[0.16em] transition hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 ${
            micEnabled
              ? "border-emerald-200/42 bg-emerald-300/18 text-emerald-50 shadow-[0_0_26px_rgba(52,211,153,0.20),inset_0_1px_0_rgba(255,255,255,0.06)] hover:bg-emerald-300/26"
              : "border-red-200/36 bg-red-500/18 text-red-100 shadow-[0_0_26px_rgba(239,68,68,0.20),inset_0_1px_0_rgba(255,255,255,0.06)] hover:bg-red-500/26"
          }`}
        >
          {micEnabled ? "Mic On · M" : "Mic Muted · M"}
        </button>

        <button
          type="button"
          disabled={busy || !micEnabled}
          onMouseDown={() => void setMic(false)}
          onMouseUp={() => void setMic(true)}
          onMouseLeave={() => void setMic(true)}
          className="rounded-2xl border border-white/12 bg-white/[0.05] px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-white/72 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition hover:-translate-y-0.5 hover:border-white/18 hover:bg-white/[0.08] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Hold to Cough
        </button>
      </div>

      <div className="relative z-10 mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-[16px] border border-white/8 bg-black/24 p-2 text-center">
          <div className="flex items-center justify-center gap-1.5 text-[8px] font-black uppercase tracking-[0.16em] text-white/38">
            <Activity size={10} /> IFB
          </div>
          <div className="mt-1 text-xs font-semibold text-white/62">Talent</div>
        </div>
        <div className="rounded-[16px] border border-white/8 bg-black/24 p-2 text-center">
          <div className="text-[8px] font-black uppercase tracking-[0.16em] text-white/38">
            Talkback
          </div>
          <div className="mt-1 text-xs font-semibold text-white/62">Producer</div>
        </div>
      </div>
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
    <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.016))] p-4 shadow-[0_18px_55px_rgba(0,0,0,0.26),inset_0_1px_0_rgba(255,255,255,0.045)]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-white/40">
            <Camera size={13} />
            Device Rack
          </div>
          <div className="mt-1 text-xs text-white/45">
            Camera and microphone for this workstation.
          </div>
        </div>

        <span
          className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] ${
            deviceAccessReady
              ? "border-emerald-300/25 bg-emerald-400/10 text-emerald-100/85"
              : "border-amber-300/25 bg-amber-400/10 text-amber-100/85"
          }`}
        >
          {deviceAccessReady ? "Locked" : "Needs Access"}
        </span>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/38">
            Camera
          </label>
          <select
            value={selectedVideoDeviceId}
            onChange={(e) => onSelectVideoDevice(e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-black/35 px-3 py-2 text-sm text-white outline-none transition focus:border-sky-300/35 focus:bg-black/45"
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
          <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/38">
            Microphone
          </label>
          <select
            value={selectedAudioDeviceId}
            onChange={(e) => onSelectAudioDevice(e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-black/35 px-3 py-2 text-sm text-white outline-none transition focus:border-sky-300/35 focus:bg-black/45"
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

      <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/45">
        <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1">
          Cameras: {videoDevices.length}
        </span>
        <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1">
          Mics: {audioDevices.length}
        </span>
      </div>
    </div>
  )
}

export default function ProducerLeftRail({
  takeBusy,
  previewProgramDifferent,
  onTake,
  onGoLive,
  onGoOffAir,
  layout,
  onSetLayout,
  autoDirectorEnabled,
  onToggleAutoDirector,
  screenLayoutPreset,
  onSetScreenLayoutPreset,
  localMicLevel,
  monitorHeight,
  onMonitorHeightChange,
  deviceAccessReady,
  videoDevices,
  audioDevices,
  selectedVideoDeviceId,
  selectedAudioDeviceId,
  onSelectVideoDevice,
  onSelectAudioDevice,
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
  screenLayoutPreset: ScreenLayoutPreset
  onSetScreenLayoutPreset: (preset: ScreenLayoutPreset) => void
  localMicLevel: number
  monitorHeight: number
  onMonitorHeightChange: (value: number) => void
  deviceAccessReady: boolean
  videoDevices: MediaDeviceInfo[]
  audioDevices: MediaDeviceInfo[]
  selectedVideoDeviceId: string
  selectedAudioDeviceId: string
  onSelectVideoDevice: (value: string) => void
  onSelectAudioDevice: (value: string) => void
}): JSX.Element {
  return (
    <div className="space-y-3 rounded-[36px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(96,165,250,0.10),transparent_34%),linear-gradient(180deg,rgba(6,11,26,0.88),rgba(2,4,10,0.97))] p-2.5 shadow-[0_32px_120px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl transition duration-300 hover:border-white/14 xl:col-start-1">
      <RailRackHeader />
      <ControlStackPanel
        takeBusy={takeBusy}
        previewProgramDifferent={previewProgramDifferent}
        onTake={onTake}
        onGoLive={onGoLive}
        onGoOffAir={onGoOffAir}
        layout={layout}
        onSetLayout={onSetLayout}
        autoDirectorEnabled={autoDirectorEnabled}
        onToggleAutoDirector={onToggleAutoDirector}
        screenLayoutPreset={screenLayoutPreset}
        onSetScreenLayoutPreset={onSetScreenLayoutPreset}
      />
      <MonitorSizePanel
        monitorHeight={monitorHeight}
        onMonitorHeightChange={onMonitorHeightChange}
      />
      <ProducerMicControls />
      <AudioMixerPanel localMicLevel={localMicLevel} />
      <DeviceSelectorPanel
        deviceAccessReady={deviceAccessReady}
        videoDevices={videoDevices}
        audioDevices={audioDevices}
        selectedVideoDeviceId={selectedVideoDeviceId}
        selectedAudioDeviceId={selectedAudioDeviceId}
        onSelectVideoDevice={onSelectVideoDevice}
        onSelectAudioDevice={onSelectAudioDevice}
      />
    </div>
  )
}