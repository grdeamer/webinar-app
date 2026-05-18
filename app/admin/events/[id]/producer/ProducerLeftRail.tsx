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
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-sky-300/6 via-violet-300/3 to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent,rgba(255,255,255,0.018)_42%,transparent_64%)] animate-[leftRailSignalSweep_12s_ease-in-out_infinite]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.045] bg-[repeating-linear-gradient(to_bottom,rgba(255,255,255,0.022)_0px,rgba(255,255,255,0.022)_1px,transparent_1px,transparent_8px)]" />
      <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-sky-200/14 to-transparent" />
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
      ? "border-sky-300/10 bg-sky-400/[0.06] text-sky-100/52"
      : tone === "green"
        ? "border-emerald-300/10 bg-emerald-400/[0.06] text-emerald-100/52"
        : tone === "amber"
          ? "border-amber-300/10 bg-amber-400/[0.06] text-amber-100/52"
          : "border-white/8 bg-black/20 text-white/34"

  return (
    <div className={`group relative z-10 flex items-center gap-2 overflow-hidden rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.14em] ${toneClass}`}>
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent,rgba(255,255,255,0.024)_42%,transparent_64%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      <div className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-white/18 to-transparent" />

      <span className="relative z-10 opacity-80">{icon}</span>
      <span className="relative z-10 text-white/30">{label}</span>
      <span className="relative z-10 inline-flex items-center gap-1.5">
        {tone !== "neutral" ? (
          <span
            className={`h-1.5 w-1.5 rounded-full animate-pulse ${
              tone === "sky"
                ? "bg-sky-300/75 shadow-[0_0_5px_rgba(125,211,252,0.32)]"
                : tone === "green"
                  ? "bg-emerald-300/75 shadow-[0_0_5px_rgba(110,231,183,0.32)]"
                  : "bg-amber-300/75 shadow-[0_0_5px_rgba(252,211,77,0.28)]"
            }`}
          />
        ) : null}

        {value}
      </span>
    </div>
  )
}

function RailRackHeader(): JSX.Element {
  return (
    <div className="relative overflow-hidden rounded-[26px] border border-white/8 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.045),transparent_34%),linear-gradient(180deg,rgba(14,23,39,0.84),rgba(5,9,18,0.94))] p-3 shadow-[0_18px_48px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent,rgba(255,255,255,0.014)_42%,transparent_64%)] animate-[leftRailSignalSweep_14s_ease-in-out_infinite]" />
      <div className="pointer-events-none absolute inset-x-7 top-0 h-px bg-gradient-to-r from-transparent via-white/14 to-transparent" />

      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.24em] text-white/36">
            <Radio size={12} />
            Control Rack
          </div>
          <div className="mt-1 text-sm font-semibold tracking-tight text-white/70">
            Live controls and workstation inputs.
          </div>
        </div>

        <div className="relative overflow-hidden inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-300/12 bg-emerald-400/[0.065] px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.16em] text-emerald-100/62">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-300/75 shadow-[0_0_6px_rgba(110,231,183,0.34)]" />
          Ready
        </div>
      </div>

      <div className="relative z-10 mt-3 grid gap-2 sm:grid-cols-3">
        <RailTelemetryChip
          icon={<SatelliteDish size={10} />}
          label="Signal"
          value="Stable"
          tone="green"
        />

        <RailTelemetryChip
          icon={<Globe2 size={10} />}
          label="Audience"
          value="Ready"
          tone="sky"
        />

        <RailTelemetryChip
          icon={<Cpu size={10} />}
          label="System"
          value="Normal"
          tone="neutral"
        />
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
    <div className="relative mb-3 flex items-center justify-between gap-3 overflow-hidden rounded-[20px] border border-white/5 bg-white/[0.012] px-2.5 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.018)]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent,rgba(255,255,255,0.012)_42%,transparent_64%)]" />
      <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/14 to-transparent" />
      <div className="relative z-10 flex min-w-0 items-center gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-white/7 bg-black/18 text-white/48 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
          {icon}
        </span>
        <div className="min-w-0">
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/30">
            {title}
          </div>
          <div className="mt-0.5 truncate text-xs text-white/34">
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
    <div className="group relative overflow-hidden rounded-[26px] border border-sky-300/12 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.075),transparent_38%),linear-gradient(180deg,rgba(13,24,39,0.78),rgba(5,9,18,0.92))] p-4 shadow-[0_16px_44px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent,rgba(255,255,255,0.018)_42%,transparent_64%)] animate-[leftRailSignalSweep_13s_ease-in-out_infinite]" />
      <div className="pointer-events-none absolute inset-x-7 top-0 h-px bg-gradient-to-r from-transparent via-sky-200/14 to-transparent" />
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
    <div className="group relative overflow-hidden rounded-[26px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.022),rgba(255,255,255,0.01))] p-4 shadow-[0_14px_36px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.028)]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent,rgba(255,255,255,0.016)_42%,transparent_64%)] animate-[leftRailSignalSweep_13s_ease-in-out_infinite]" />
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent,rgba(255,255,255,0.014)_42%,transparent_64%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      <div className="relative z-10 mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-white/32">
            <Camera size={13} />
            Workstation Inputs
          </div>
          <div className="mt-1 text-xs text-white/36">
            Camera and microphone selection.
          </div>
        </div>

        <span
          className={`relative overflow-hidden rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] ${
            deviceAccessReady
              ? "border-emerald-300/14 bg-emerald-400/[0.07] text-emerald-100/58"
              : "border-amber-300/14 bg-amber-400/[0.07] text-amber-100/58"
          }`}
        >
          <span className="relative z-10 inline-flex items-center gap-1.5">
            <span
              className={`h-1.5 w-1.5 rounded-full animate-pulse ${
                deviceAccessReady
                  ? "bg-emerald-300/75 shadow-[0_0_5px_rgba(110,231,183,0.32)]"
                  : "bg-amber-300/75 shadow-[0_0_5px_rgba(252,211,77,0.28)]"
              }`}
            />
            {deviceAccessReady ? "Ready" : "Needs Access"}
          </span>
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
            className="w-full rounded-2xl border border-white/10 bg-black/35 px-3 py-2 text-sm text-white outline-none transition hover:border-white/18 hover:bg-black/42 focus:border-sky-300/35 focus:bg-black/45"
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
            className="w-full rounded-2xl border border-white/10 bg-black/35 px-3 py-2 text-sm text-white outline-none transition hover:border-white/18 hover:bg-black/42 focus:border-sky-300/35 focus:bg-black/45"
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
        <span className="relative overflow-hidden rounded-full border border-white/10 bg-black/30 px-3 py-1">
          <span className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-white/14 to-transparent" />
          <span className="relative z-10">
            Cameras: {videoDevices.length}
          </span>
        </span>
        <span className="relative overflow-hidden rounded-full border border-white/10 bg-black/30 px-3 py-1">
          <span className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-white/14 to-transparent" />
          <span className="relative z-10">
            Mics: {audioDevices.length}
          </span>
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
    <div className="group relative overflow-hidden space-y-3 rounded-[32px] border border-white/8 bg-[radial-gradient(circle_at_top_left,rgba(96,165,250,0.035),transparent_34%),linear-gradient(180deg,rgba(10,15,29,0.88),rgba(4,7,14,0.955))] p-2.5 shadow-[0_22px_74px_rgba(0,0,0,0.32),inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl transition duration-300 hover:border-white/11 hover:shadow-[0_26px_84px_rgba(0,0,0,0.38),0_0_18px_rgba(96,165,250,0.035)] xl:col-start-1">
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