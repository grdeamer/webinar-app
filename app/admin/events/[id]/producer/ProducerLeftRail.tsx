

import { useEffect, useState } from "react"
import type { JSX } from "react"
import { useRoomContext } from "@livekit/components-react"
import type { StageState } from "./producerRoomTypes"

type ScreenLayoutPreset = "classic" | "brand" | "speaker_focus" | "fullscreen"

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
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.24em] text-sky-100/85">
            Monitor Size
          </div>
          <div className="mt-1 text-xs text-white/45">
            Resize Preview and Program together.
          </div>
        </div>

        <span className="rounded-full border border-white/10 bg-black/30 px-2.5 py-1 text-[10px] font-semibold tabular-nums text-white/70">
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

function AudioMetersPanel({ localMicLevel }: { localMicLevel: number }): JSX.Element {
  return (
    <div className="rounded-[28px] border border-emerald-300/18 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.14),transparent_38%),linear-gradient(180deg,rgba(8,31,26,0.78),rgba(3,10,12,0.94))] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.30),inset_0_1px_0_rgba(255,255,255,0.055)]">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-100/70">
          Audio Meters
        </div>
        <div className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] ${
          localMicLevel > 0.08
            ? "border-emerald-300/25 bg-emerald-400/10 text-emerald-100/85"
            : "border-white/10 bg-black/25 text-white/45"
        }`}>
          {localMicLevel > 0.08 ? "Mic Active" : "Standing By"}
        </div>
      </div>

      <div className="space-y-3">
        {["Host", "Guest", "Program"].map((label, rowIndex) => (
          <div key={label} className="grid grid-cols-[64px_1fr] items-center gap-3">
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/50">{label}</div>
            <div className="flex h-3 items-center gap-1 rounded-full border border-white/8 bg-black/45 px-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              {Array.from({ length: 18 }).map((_, index) => {
                const active =
                  index <
                  (rowIndex === 0
                    ? Math.max(2, Math.round(localMicLevel * 18))
                    : rowIndex === 1
                      ? 9
                      : Math.max(3, Math.round(localMicLevel * 18)))

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

      <div className="mt-4 flex flex-wrap gap-2">
        <div className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-white/50">
          Space = Take
        </div>
        <div className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-white/50">
          M = Mic
        </div>
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
            <div className="text-[10px] font-black uppercase tracking-[0.26em] text-white/35">
              Control Stack
            </div>
            <div className="mt-1 text-xs text-white/45">
              Live switching and show state.
            </div>
          </div>

          <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-emerald-100/80">
            Armed
          </span>
        </div>

        <div className="space-y-3">
          <button
            onClick={onTake}
            disabled={takeBusy}
            className={`group relative w-full overflow-hidden rounded-[22px] border px-4 py-4 text-sm font-black uppercase tracking-[0.24em] shadow-lg transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 ${
              previewProgramDifferent
                ? "border-amber-200/60 bg-amber-300 text-black shadow-[0_0_34px_rgba(251,191,36,0.30)] hover:bg-amber-200"
                : "border-sky-200/50 bg-sky-300 text-black shadow-[0_0_28px_rgba(56,189,248,0.22)] hover:bg-sky-200"
            }`}
          >
            <span className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              <span className="absolute inset-y-0 left-[-40%] w-1/2 rotate-12 bg-white/35 blur-xl transition-transform duration-700 group-hover:translate-x-[330%]" />
            </span>

            <span className="relative z-10">
              {takeBusy ? "Taking..." : previewProgramDifferent ? "TAKE CHANGES" : "TAKE"}
            </span>

            <span className="relative z-10 mt-1 block text-[9px] font-bold tracking-[0.2em] text-black/55">
              SPACE
            </span>
          </button>

          <button
            onClick={onGoLive}
            className="w-full rounded-2xl border border-red-300/30 bg-red-500/16 px-4 py-3 text-sm font-black uppercase tracking-[0.18em] text-red-100 shadow-[0_0_24px_rgba(239,68,68,0.16)] transition hover:-translate-y-0.5 hover:bg-red-500/24 active:translate-y-0"
          >
            Go Live
          </button>

          <button
            onClick={onGoOffAir}
            className="w-full rounded-2xl border border-white/12 bg-white/[0.045] px-4 py-3 text-sm font-black uppercase tracking-[0.18em] text-white/75 transition hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.075] active:translate-y-0"
          >
            Off Air
          </button>
        </div>
      </div>

      <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.018))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.045)]">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.24em] text-white/40">
              Layout Modes
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
    <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.018))] p-3.5 shadow-[0_18px_55px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.045)]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-[10px] font-black uppercase tracking-[0.24em] text-white/40">
          Producer Mic
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] ${
          micEnabled
            ? "border-emerald-300/25 bg-emerald-400/10 text-emerald-100/80"
            : "border-red-300/25 bg-red-500/10 text-red-100/80"
        }`}>
          {micEnabled ? "Open" : "Muted"}
        </span>
      </div>

      <div className="grid gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void setMic(!micEnabled)}
          className={`rounded-2xl border px-4 py-3 text-sm font-black uppercase tracking-[0.16em] transition hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 ${
            micEnabled
              ? "border-emerald-200/40 bg-emerald-400/18 text-emerald-100 shadow-[0_0_22px_rgba(52,211,153,0.18)] hover:bg-emerald-400/26"
              : "border-red-300/35 bg-red-500/18 text-red-100 shadow-[0_0_22px_rgba(239,68,68,0.18)] hover:bg-red-500/26"
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
          className="rounded-2xl border border-white/12 bg-white/[0.045] px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-white/70 transition hover:-translate-y-0.5 hover:bg-white/[0.075] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Hold to Cough
        </button>
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
          <div className="text-[10px] font-black uppercase tracking-[0.24em] text-white/40">
            Producer Devices
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
          {deviceAccessReady ? "Ready" : "Needs Access"}
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
    <div className="space-y-4 rounded-[36px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(96,165,250,0.12),transparent_34%),linear-gradient(180deg,rgba(8,13,30,0.72),rgba(2,4,10,0.88))] p-3 shadow-[0_30px_110px_rgba(0,0,0,0.44),inset_0_1px_0_rgba(255,255,255,0.055)] backdrop-blur-xl transition duration-300 hover:border-white/15 xl:col-start-1">
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
      <AudioMetersPanel localMicLevel={localMicLevel} />
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