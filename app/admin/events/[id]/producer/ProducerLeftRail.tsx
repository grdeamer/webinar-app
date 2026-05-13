import type { JSX } from "react"
import {
  Camera,
  Cpu,
  Globe2,
  MonitorUp,
  Radio,
  SatelliteDish,
  ShieldCheck,
} from "lucide-react"
import type { StageState } from "./producerRoomTypes"
import AudioMixerPanel from "./AudioMixerPanel"
import ControlStackPanel from "./ControlStackPanel"

import ProducerMicControls from "./ProducerMicControls"

import type { ScreenLayoutPreset } from "./assetDockTypes"

function LeftRailAtmosphere(): JSX.Element {
  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-sky-300/10 via-violet-300/6 to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent,rgba(255,255,255,0.032)_42%,transparent_64%)] animate-[leftRailSignalSweep_9s_ease-in-out_infinite]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.10] bg-[repeating-linear-gradient(to_bottom,rgba(255,255,255,0.022)_0px,rgba(255,255,255,0.022)_1px,transparent_1px,transparent_7px)]" />
      <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-sky-200/24 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-sky-300/[0.05] to-transparent" />
    </>
  )
}

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
    <div className={`relative z-10 flex items-center gap-2 rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.14em] ${toneClass}`}>
      <span className="opacity-80">{icon}</span>
      <span className="text-white/30">{label}</span>
      <span>{value}</span>
    </div>
  )
}

function RailRackHeader(): JSX.Element {
  return (
    <div className="relative overflow-hidden rounded-[30px] border border-sky-300/14 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.14),transparent_36%),radial-gradient(circle_at_bottom_left,rgba(168,85,247,0.08),transparent_34%),linear-gradient(180deg,rgba(8,18,34,0.94),rgba(3,7,16,0.99))] p-3 shadow-[0_24px_80px_rgba(0,0,0,0.40),inset_0_1px_0_rgba(255,255,255,0.045)]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent,rgba(255,255,255,0.04)_42%,transparent_64%)] animate-[leftRailSignalSweep_8s_ease-in-out_infinite]" />
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-sky-200/26 to-transparent" />
      <div className="relative z-10 flex items-center justify-between gap-3">
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

      <div className="relative z-10 mt-3 flex flex-wrap gap-2">
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

      <div className="relative z-10 mt-3 grid grid-cols-3 gap-2">
        {[
          { label: "Route", value: "Live", tone: "text-red-100/68 border-red-300/14 bg-red-400/8" },
          { label: "Stage", value: "Ready", tone: "text-sky-100/68 border-sky-300/14 bg-sky-400/8" },
          { label: "Devices", value: "Locked", tone: "text-emerald-100/68 border-emerald-300/14 bg-emerald-400/8" },
        ].map((item) => (
          <div
            key={item.label}
            className={`relative overflow-hidden rounded-2xl border px-2 py-2 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] ${item.tone}`}
          >
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent,rgba(255,255,255,0.05)_42%,transparent_64%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
            <div className="relative z-10 mx-auto mb-1 h-1.5 w-1.5 rounded-full bg-current opacity-70 shadow-[0_0_12px_currentColor] animate-pulse" />
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
    <div className="relative overflow-hidden rounded-[28px] border border-sky-300/18 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.16),transparent_38%),linear-gradient(180deg,rgba(14,27,45,0.84),rgba(4,9,18,0.94))] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.32),0_0_28px_rgba(56,189,248,0.10),inset_0_1px_0_rgba(255,255,255,0.055)]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent,rgba(255,255,255,0.04)_42%,transparent_64%)] animate-[leftRailSignalSweep_10s_ease-in-out_infinite]" />
      <div className="relative z-10 mb-3 flex items-center justify-between gap-3">
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
        style={{ position: "relative", zIndex: 10 }}
        aria-label="Monitor size"
      />
      <div className="relative z-10 mt-2 flex justify-between text-[10px] text-white/35">
        <span>Compact</span>
        <span>Large</span>
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
    <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.016))] p-4 shadow-[0_18px_55px_rgba(0,0,0,0.26),inset_0_1px_0_rgba(255,255,255,0.045)]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent,rgba(255,255,255,0.03)_42%,transparent_64%)] animate-[leftRailSignalSweep_11s_ease-in-out_infinite]" />
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/18 to-transparent" />
      <div className="relative z-10 mb-3 flex items-center justify-between gap-3">
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

      <div className="relative z-10 grid gap-3 md:grid-cols-2">
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

      <div className="relative z-10 mt-3 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/45">
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
    <div className="group relative overflow-hidden space-y-3 rounded-[36px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(96,165,250,0.10),transparent_34%),linear-gradient(180deg,rgba(6,11,26,0.88),rgba(2,4,10,0.97))] p-2.5 shadow-[0_32px_120px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl transition duration-300 hover:border-white/14 xl:col-start-1">
      <LeftRailAtmosphere />
      <div className="relative z-10 space-y-3">
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

      <style jsx global>{`
        @keyframes leftRailSignalSweep {
          0%,
          100% {
            opacity: 0;
            transform: translateX(-18%);
          }

          46% {
            opacity: 0.78;
          }

          100% {
            transform: translateX(18%);
          }
        }
      `}</style>
    </div>
  )
}