import { useState, type JSX } from "react"
import { useRoomContext } from "@livekit/components-react"
import {
  Camera,
  Mic2,
  ScreenShare,
  ShieldCheck,
  ThumbsUp,
  Users,
  MessageSquareText,
  MonitorUp,
} from "lucide-react"
import ProducerQAModerationPanel from "./ProducerQAModerationPanel"
const PARTICIPANT_ACCENT_STYLES = [
  {
    id: "none",
    rgb: "148,163,184",
    swatch: "bg-transparent",
    ring: "border-white/16",
    glow: "shadow-none",
    card: "border-white/[0.07]",
    cardGlow: "shadow-none",
  },
  {
    id: "violet",
    rgb: "168,85,247",
    swatch: "bg-violet-300",
    ring: "border-violet-300/55",
    glow: "shadow-[0_0_22px_rgba(168,85,247,0.34)]",
    card: "border-violet-400/34",
    cardGlow: "shadow-[0_0_30px_rgba(168,85,247,0.18)]",
  },
  {
    id: "cyan",
    rgb: "34,211,238",
    swatch: "bg-cyan-300",
    ring: "border-cyan-300/55",
    glow: "shadow-[0_0_22px_rgba(34,211,238,0.34)]",
    card: "border-cyan-400/34",
    cardGlow: "shadow-[0_0_30px_rgba(34,211,238,0.16)]",
  },
  {
    id: "green",
    rgb: "16,185,129",
    swatch: "bg-emerald-300",
    ring: "border-emerald-300/55",
    glow: "shadow-[0_0_22px_rgba(16,185,129,0.30)]",
    card: "border-emerald-400/30",
    cardGlow: "shadow-[0_0_30px_rgba(16,185,129,0.14)]",
  },
  {
    id: "amber",
    rgb: "251,191,36",
    swatch: "bg-amber-300",
    ring: "border-amber-300/55",
    glow: "shadow-[0_0_22px_rgba(251,191,36,0.30)]",
    card: "border-amber-400/30",
    cardGlow: "shadow-[0_0_30px_rgba(251,191,36,0.14)]",
  },
  {
    id: "rose",
    rgb: "244,63,94",
    swatch: "bg-rose-300",
    ring: "border-rose-300/55",
    glow: "shadow-[0_0_22px_rgba(244,63,94,0.30)]",
    card: "border-rose-400/30",
    cardGlow: "shadow-[0_0_30px_rgba(244,63,94,0.14)]",
  },
] as const
type ParticipantAccentId = (typeof PARTICIPANT_ACCENT_STYLES)[number]["id"]
const PARTICIPANT_COLOR_ACCENT_STYLES = PARTICIPANT_ACCENT_STYLES.filter(
  (style) => style.id !== "none",
)
type ParticipantGlowLevel = "low" | "med" | "high"
type ParticipantOutlineWeight = "soft" | "standard" | "bold"
type ParticipantAppearanceOverride = {
  accentId?: ParticipantAccentId
  glowLevel?: ParticipantGlowLevel
  outlineWeight?: ParticipantOutlineWeight
}

function LocalMediaControls({
  videoDevices,
  audioDevices,
  selectedVideoDeviceId,
  selectedAudioDeviceId,
  onSelectVideoDevice,
  onSelectAudioDevice,
}: {
  videoDevices: MediaDeviceInfo[]
  audioDevices: MediaDeviceInfo[]
  selectedVideoDeviceId: string
  selectedAudioDeviceId: string
  onSelectVideoDevice: (deviceId: string) => void
  onSelectAudioDevice: (deviceId: string) => void
}): JSX.Element {
  const room = useRoomContext()
  const [cameraOn, setCameraOn] = useState(room.localParticipant.isCameraEnabled)
  const [micOn, setMicOn] = useState(room.localParticipant.isMicrophoneEnabled)
  const [screenOn, setScreenOn] = useState(room.localParticipant.isScreenShareEnabled)
  const [busyControl, setBusyControl] = useState<"camera" | "mic" | "screen" | null>(null)
  const [deviceError, setDeviceError] = useState<string | null>(null)

  const explainDeviceError = (error: unknown): string => {
    if (error instanceof DOMException && error.name === "NotAllowedError") {
      return "Camera or microphone access is blocked. Allow access in your browser settings, then try again."
    }
    if (error instanceof DOMException && error.name === "NotFoundError") {
      return "No matching camera or microphone was found."
    }
    return error instanceof Error ? error.message : "The browser could not start this device."
  }

  const toggleCamera = async () => {
    try {
      setBusyControl("camera")
      setDeviceError(null)
      await room.localParticipant.setCameraEnabled(!room.localParticipant.isCameraEnabled)
      setCameraOn(room.localParticipant.isCameraEnabled)
    } catch (error) {
      setDeviceError(explainDeviceError(error))
    } finally {
      setBusyControl(null)
    }
  }

  const toggleMic = async () => {
    try {
      setBusyControl("mic")
      setDeviceError(null)
      await room.localParticipant.setMicrophoneEnabled(!room.localParticipant.isMicrophoneEnabled)
      setMicOn(room.localParticipant.isMicrophoneEnabled)
    } catch (error) {
      setDeviceError(explainDeviceError(error))
    } finally {
      setBusyControl(null)
    }
  }

  const toggleScreen = async () => {
    try {
      setBusyControl("screen")
      setDeviceError(null)
      await room.localParticipant.setScreenShareEnabled(!room.localParticipant.isScreenShareEnabled)
      setScreenOn(room.localParticipant.isScreenShareEnabled)
    } catch (error) {
      setDeviceError(explainDeviceError(error))
    } finally {
      setBusyControl(null)
    }
  }

  const changeDevice = async (kind: "videoinput" | "audioinput", deviceId: string) => {
    try {
      setDeviceError(null)
      await room.switchActiveDevice(kind, deviceId)
      if (kind === "videoinput") onSelectVideoDevice(deviceId)
      if (kind === "audioinput") onSelectAudioDevice(deviceId)
    } catch (error) {
      setDeviceError(explainDeviceError(error))
    }
  }

  const controls = [
    { id: "camera" as const, label: "Camera", icon: Camera, on: cameraOn, action: toggleCamera },
    { id: "mic" as const, label: "Microphone", icon: Mic2, on: micOn, action: toggleMic },
    { id: "screen" as const, label: "Share screen", icon: MonitorUp, on: screenOn, action: toggleScreen },
  ]

  return (
    <section className="border-b border-white/[0.08] bg-[linear-gradient(180deg,rgba(12,20,34,0.98),rgba(6,11,20,0.98))] px-3 py-3" aria-label="Your camera and audio">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[9px] font-bold uppercase tracking-[0.14em] text-sky-100/55">Your camera &amp; audio</div>
          <p className="mt-1 text-[10px] leading-4 text-white/45">Turn on your devices here, then use Stage to place yourself in Preview.</p>
        </div>
        <span className={`mt-0.5 h-2 w-2 rounded-full ${cameraOn || micOn || screenOn ? "bg-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.7)]" : "bg-white/20"}`} />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-1.5">
        {controls.map(({ id, label, icon: Icon, on, action }) => (
          <button key={id} type="button" disabled={busyControl !== null} onClick={() => void action()} aria-pressed={on}
            className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-[11px] border px-1.5 py-2 text-[8px] font-bold uppercase tracking-[0.08em] transition disabled:opacity-45 ${on ? "border-emerald-300/28 bg-emerald-400/[0.12] text-emerald-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_0_14px_rgba(52,211,153,0.08)]" : "border-white/[0.09] bg-white/[0.035] text-white/58 hover:border-sky-200/20 hover:bg-sky-300/[0.07] hover:text-white"}`}>
            <Icon size={13} />
            <span>{busyControl === id ? "Starting…" : `${label} ${on ? "on" : "off"}`}</span>
          </button>
        ))}
      </div>
      {(videoDevices.length > 1 || audioDevices.length > 1) ? (
        <div className="mt-2 grid gap-1.5">
          {videoDevices.length > 1 ? <select aria-label="Camera" value={selectedVideoDeviceId} onChange={(event) => void changeDevice("videoinput", event.target.value)} className="h-8 rounded-[9px] border border-white/[0.08] bg-[#080d17] px-2 text-[9px] text-white/68 outline-none focus:border-sky-300/35">{videoDevices.map((device, index) => <option key={device.deviceId} value={device.deviceId}>{device.label || `Camera ${index + 1}`}</option>)}</select> : null}
          {audioDevices.length > 1 ? <select aria-label="Microphone" value={selectedAudioDeviceId} onChange={(event) => void changeDevice("audioinput", event.target.value)} className="h-8 rounded-[9px] border border-white/[0.08] bg-[#080d17] px-2 text-[9px] text-white/68 outline-none focus:border-sky-300/35">{audioDevices.map((device, index) => <option key={device.deviceId} value={device.deviceId}>{device.label || `Microphone ${index + 1}`}</option>)}</select> : null}
        </div>
      ) : null}
      {deviceError ? <p className="mt-2 rounded-[9px] border border-amber-300/16 bg-amber-300/[0.07] px-2 py-1.5 text-[9px] leading-4 text-amber-50/75" role="alert">{deviceError}</p> : null}
    </section>
  )
}

const PARTICIPANT_GLOW_LEVELS: Array<{
  id: ParticipantGlowLevel
  label: string
}> = [
  { id: "low", label: "Low" },
  { id: "med", label: "Med" },
  { id: "high", label: "High" },
]

const PARTICIPANT_OUTLINE_WEIGHTS: Array<{
  id: ParticipantOutlineWeight
  label: string
}> = [
  { id: "soft", label: "Soft" },
  { id: "standard", label: "Std" },
  { id: "bold", label: "Bold" },
]

function InspectorParticipantRow({
  participant,
  role,
  onStage,
  screenTrackSid,
  selectedAccentId,
  selectedGlowLevel,
  selectedOutlineWeight,
  onSetAccentColor,
  onSetGlowLevel,
  onSetOutlineWeight,
  onAddToStage,
  onRemoveFromStage,
  onSetPrimary,
  onSetScreenShare,
}: {
  participant: ProducerParticipant
  role: string
  onStage: boolean
  screenTrackSid: string | null
  selectedAccentId?: string | null
  selectedGlowLevel?: ParticipantGlowLevel | null
  selectedOutlineWeight?: ParticipantOutlineWeight | null
  onSetAccentColor: (identity: string, accentId: ParticipantAccentId) => void
  onSetGlowLevel: (identity: string, glowLevel: ParticipantGlowLevel) => void
  onSetOutlineWeight: (identity: string, outlineWeight: ParticipantOutlineWeight) => void
  onAddToStage: (identity: string) => void
  onRemoveFromStage: (identity: string) => void
  onSetPrimary: (identity: string) => void
  onSetScreenShare: (participantId: string, trackId: string) => void
}): JSX.Element {
  const initials = (participant.name || participant.identity || "G")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  const cameraOn = Boolean(participant.cameraEnabled)
  const micOn = Boolean(participant.micEnabled)
  const screenReady = Boolean(screenTrackSid || participant.screenShareEnabled)
  const fallbackAccentStyle =
    PARTICIPANT_COLOR_ACCENT_STYLES[
      Math.abs(participant.identity.length) % PARTICIPANT_COLOR_ACCENT_STYLES.length
    ]
  const accentStyle =
    PARTICIPANT_ACCENT_STYLES.find((style) => style.id === selectedAccentId) ??
    fallbackAccentStyle
  const glowLevel = selectedGlowLevel ?? "med"
  const outlineWeight = selectedOutlineWeight ?? "standard"
  const [visualControlsOpen, setVisualControlsOpen] = useState(false)

  return (
    <div
      className="group/participant rounded-[10px] border bg-[#0a101a] px-2.5 py-2.5 transition hover:bg-[#0d1623]"
      style={{
        borderColor: onStage
          ? "rgba(125,211,252,0.26)"
          : `rgba(${accentStyle.rgb}, 0.16)`,
        borderWidth: 1,
        boxShadow: onStage
          ? "inset 3px 0 0 rgba(125,211,252,0.48)"
          : "inset 0 1px 0 rgba(255,255,255,0.01)",
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] border bg-[linear-gradient(145deg,#182235,#0d1421)] text-[12px] font-semibold text-white/84 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
            style={{
              borderColor: `rgba(${accentStyle.rgb}, 0.42)`,
              borderWidth: 1,
            }}
          >
            {initials}
          </div>

          <div className="min-w-0">
            <div className="truncate text-[12px] font-semibold tracking-[-0.01em] text-white/92">
              {participant.name || participant.identity}
            </div>
            <div className="mt-0.5 text-[9px] font-medium uppercase tracking-[0.07em] text-white/46">
              {role}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            if (onStage) {
              onRemoveFromStage(participant.identity)
              return
            }

            onAddToStage(participant.identity)
          }}
          className={`shrink-0 rounded-[8px] border px-3 py-1.5 text-[9px] font-semibold transition ${
            onStage
              ? "border-red-300/12 bg-red-400/[0.045] text-red-100/54 hover:bg-red-400/[0.08]"
              : "border-emerald-300/12 bg-emerald-400/[0.065] text-emerald-100/62 hover:bg-emerald-400/[0.11]"
          }`}
        >
          {onStage ? "Remove" : "Send to stage"}
        </button>
      </div>

      <div className="mt-2 rounded-[11px] border border-white/[0.040] bg-black/18">
        <button
          type="button"
          onClick={() => setVisualControlsOpen((current) => !current)}
          className="flex w-full items-center justify-between gap-2 px-2 py-1.5 text-left transition hover:bg-white/[0.025]"
        >
          <span className="flex items-center gap-2">
            <span
              className={`h-3 w-3 rounded-full border border-white/18 ${accentStyle.swatch}`}
            />
            <span className="text-[8px] font-medium text-white/38">
              Appearance
            </span>
          </span>

            <span className="text-[8px] font-medium text-white/28">
            {visualControlsOpen ? "Hide" : "Edit"}
          </span>
        </button>

        {visualControlsOpen ? (
          <div className="border-t border-white/[0.040] p-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="shrink-0 text-[8px] font-black uppercase tracking-[0.14em] text-white/34">
                Accent
              </span>
              <div className="flex min-w-0 shrink items-center justify-end gap-1">
                {PARTICIPANT_ACCENT_STYLES.map((style) => {
                  const isSelected = style.id === accentStyle.id

                  return (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => onSetAccentColor(participant.identity, style.id)}
                      className={`relative h-4 w-4 shrink-0 rounded-full border transition hover:scale-110 ${style.swatch} ${
                        isSelected
                          ? "border-white/80 shadow-[0_0_12px_rgba(255,255,255,0.22)]"
                          : "border-white/18 opacity-70 hover:opacity-100"
                      }`}
                      title={style.id === "none" ? "Clear accent" : `Set ${style.id} accent`}
                    >
                      {style.id === "none" ? (
                        <span className="absolute left-1/2 top-1/2 h-px w-[145%] -translate-x-1/2 -translate-y-1/2 -rotate-45 rounded-full bg-white/72 shadow-[0_0_6px_rgba(255,255,255,0.22)]" />
                      ) : null}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="mt-2 grid gap-2">
              <div className="rounded-[13px] border border-white/[0.045] bg-black/22 px-2.5 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.012)]">
                <div className="text-[8px] font-black uppercase tracking-[0.14em] text-white/32">
                  Outline
                </div>
                <div className="mt-1.5 grid grid-cols-3 gap-1.5 rounded-[10px] border border-white/[0.035] bg-white/[0.018] p-1">
                  {PARTICIPANT_OUTLINE_WEIGHTS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onSetOutlineWeight(participant.identity, item.id)}
                      className={`min-w-[3.05rem] rounded-[8px] border px-2 py-1.5 text-[8px] font-black uppercase tracking-[0.08em] transition ${
                        outlineWeight === item.id
                          ? "border-white/34 bg-white/[0.14] text-white/86 shadow-[0_0_12px_rgba(255,255,255,0.08)]"
                          : "border-transparent bg-transparent text-white/34 hover:bg-white/[0.045] hover:text-white/62"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-[13px] border border-white/[0.045] bg-black/22 px-2.5 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.012)]">
                <div className="text-[8px] font-black uppercase tracking-[0.14em] text-white/32">
                  Glow
                </div>
                <div className="mt-1.5 grid grid-cols-3 gap-1.5 rounded-[10px] border border-white/[0.035] bg-white/[0.018] p-1">
                  {PARTICIPANT_GLOW_LEVELS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onSetGlowLevel(participant.identity, item.id)}
                      className={`min-w-[3.05rem] rounded-[8px] border px-2 py-1.5 text-[8px] font-black uppercase tracking-[0.08em] transition ${
                        glowLevel === item.id
                          ? "border-white/34 bg-white/[0.14] text-white/86 shadow-[0_0_12px_rgba(255,255,255,0.08)]"
                          : "border-transparent bg-transparent text-white/34 hover:bg-white/[0.045] hover:text-white/62"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-2 grid grid-cols-3 gap-1.5" aria-label="Participant device status">
        <span className={`flex items-center justify-center gap-1 rounded-[9px] border px-2 py-1.5 text-[8px] font-bold uppercase tracking-[0.08em] ${cameraOn ? "border-emerald-300/12 bg-emerald-400/[0.07] text-emerald-100/68" : "border-white/[0.05] bg-white/[0.02] text-white/30"}`}>
          <Camera size={10} /> Cam {cameraOn ? "on" : "off"}
        </span>
        <span className={`flex items-center justify-center gap-1 rounded-[9px] border px-2 py-1.5 text-[8px] font-bold uppercase tracking-[0.08em] ${micOn ? "border-emerald-300/12 bg-emerald-400/[0.07] text-emerald-100/68" : "border-white/[0.05] bg-white/[0.02] text-white/30"}`}>
          <Mic2 size={10} /> Mic {micOn ? "on" : "off"}
        </span>
        {screenTrackSid ? (
          <button type="button" onClick={() => { onAddToStage(participant.identity); window.setTimeout(() => onSetScreenShare(participant.identity, screenTrackSid), 120) }} className="flex items-center justify-center gap-1 rounded-[9px] border border-sky-300/14 bg-sky-400/[0.08] px-2 py-1.5 text-[8px] font-bold uppercase tracking-[0.08em] text-sky-100/72 transition hover:bg-sky-400/[0.13]" title="Route this shared screen to Preview">
            <ScreenShare size={10} /> Route share
          </button>
        ) : (
          <span className={`flex items-center justify-center gap-1 rounded-[9px] border px-2 py-1.5 text-[8px] font-bold uppercase tracking-[0.08em] ${screenReady ? "border-sky-300/12 bg-sky-400/[0.07] text-sky-100/68" : "border-white/[0.05] bg-white/[0.02] text-white/30"}`}>
            <ScreenShare size={10} /> No share
          </span>
        )}
      </div>
    </div>
  )
}

function EngagementSparkline(): JSX.Element {
  return (
    <div className="mt-2 h-12 rounded-[14px] border border-white/[0.035] bg-black/12 px-2 py-2">
      <svg viewBox="0 0 180 42" className="h-full w-full overflow-visible">
        <path
          d="M0 30 C12 22 18 20 28 23 C42 28 48 18 62 22 C78 26 82 12 96 18 C110 24 116 6 132 10 C148 14 150 20 164 14 C172 10 176 9 180 8"
          fill="none"
          stroke="rgba(52,211,153,0.85)"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <path
          d="M0 30 C12 22 18 20 28 23 C42 28 48 18 62 22 C78 26 82 12 96 18 C110 24 116 6 132 10 C148 14 150 20 164 14 C172 10 176 9 180 8 L180 42 L0 42 Z"
          fill="rgba(52,211,153,0.08)"
        />
      </svg>
    </div>
  )
}
import RightInspectorRail from "./RightInspectorRail"
import type { PreviewBlock } from "./useProducerBlocks"
import type { ProducerParticipant, StageState } from "./producerRoomTypes"

function RightRailMetric({
  icon,
  label,
  value,
  tone = "neutral",
}: {
  icon: JSX.Element
  label: string
  value: string | number
  tone?: "neutral" | "green" | "violet" | "red" | "sky"
}): JSX.Element {
  const toneClass =
    tone === "green"
      ? "border-emerald-300/8 bg-emerald-400/[0.04] text-emerald-100/42"
      : tone === "violet"
        ? "border-violet-300/8 bg-violet-400/[0.04] text-violet-100/42"
        : tone === "red"
          ? "border-red-300/8 bg-red-400/[0.04] text-red-100/42"
          : tone === "sky"
            ? "border-sky-300/8 bg-sky-400/[0.04] text-sky-100/42"
            : "border-white/6 bg-white/[0.024] text-white/34"

  return (
    <div
      className={`group relative overflow-hidden rounded-[11px] border px-1.5 py-1 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.014)] ${toneClass}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent,rgba(255,255,255,0.006)_42%,transparent_64%)] opacity-18 transition-opacity duration-500 group-hover:opacity-36" />
      <div className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-white/6 to-transparent" />
      <div className="relative z-10 mx-auto flex h-5 w-5 items-center justify-center rounded-md border border-white/6 bg-white/[0.020] text-white/30">
        {icon}
      </div>
      <div className="relative z-10 mt-px text-[12px] font-semibold tracking-tight text-white/50">
        {value}
      </div>
      <div className="relative z-10 mt-px text-[7px] font-black uppercase tracking-[0.09em] opacity-30">
        {label}
      </div>
    </div>
  )
}

function RailStatusChip({
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
      ? "border-sky-300/12 bg-sky-400/[0.07] text-sky-100/46"
      : tone === "green"
        ? "border-emerald-300/12 bg-emerald-400/[0.07] text-emerald-100/46"
        : tone === "violet"
          ? "border-violet-300/12 bg-violet-400/[0.07] text-violet-100/46"
          : tone === "amber"
            ? "border-amber-300/12 bg-amber-400/[0.07] text-amber-100/46"
            : "border-white/6 bg-white/[0.022] text-white/30"

  return (
    <div className={`group relative flex items-center gap-1 overflow-hidden rounded-full border px-1.5 py-0.5 text-[7px] font-black uppercase tracking-[0.09em] ${toneClass}`}>
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent,rgba(255,255,255,0.006)_42%,transparent_64%)] opacity-18 transition-opacity duration-500 group-hover:opacity-36" />
      <div className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-white/6 to-transparent" />

      <span className="relative z-10 opacity-70">{icon}</span>
      <span className="relative z-10 text-white/42">{label}</span>
      <span className="relative z-10 inline-flex items-center gap-1.5">
        {tone !== "neutral" ? (
          <span
            className={`h-1.5 w-1.5 rounded-full animate-pulse ${
              tone === "sky"
                ? "bg-sky-300/75 shadow-[0_0_5px_rgba(125,211,252,0.32)]"
                : tone === "green"
                  ? "bg-emerald-300/75 shadow-[0_0_5px_rgba(110,231,183,0.32)]"
                  : tone === "violet"
                    ? "bg-violet-300/75 shadow-[0_0_5px_rgba(196,181,253,0.32)]"
                    : "bg-amber-300/75 shadow-[0_0_5px_rgba(252,211,77,0.28)]"
            }`}
          />
        ) : null}

        {value}
      </span>
    </div>
  )
}

function RailDrawer({
  title,
  sub,
  icon,
  meta,
  defaultOpen = false,
  children,
}: {
  title: string
  sub: string
  icon: JSX.Element
  meta?: string
  defaultOpen?: boolean
  children: JSX.Element
}): JSX.Element {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-[15px] border border-white/[0.04] bg-[linear-gradient(180deg,rgba(255,255,255,0.009),rgba(255,255,255,0.003))] shadow-[0_4px_14px_rgba(0,0,0,0.075),inset_0_1px_0_rgba(255,255,255,0.010)]">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="relative z-10 flex w-full items-center justify-between gap-2 px-1.5 py-1 text-left transition hover:bg-white/[0.010]"
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-white/5 bg-white/[0.014] text-white/22">
            {icon}
          </span>

          <span className="min-w-0">
            <span className="block text-[8px] font-black uppercase tracking-[0.09em] text-white/20">
              {title}
            </span>
            <span className="mt-px block truncate text-[9px] font-semibold text-white/14">
              {sub}
            </span>
          </span>
        </span>

        <span className="flex shrink-0 items-center gap-1 text-[7px] font-black uppercase tracking-[0.08em] text-white/14">
          {meta ? (
            <span className="rounded-full border border-white/5 bg-white/[0.012] px-1.5 py-0.5">
              {meta}
            </span>
          ) : null}
          <span className="rounded-full border border-white/5 bg-white/[0.012] px-1.5 py-0.5">
            {open ? "Hide" : "Open"}
          </span>
        </span>
      </button>

      {open ? (
        <div className="relative z-10 min-h-0 flex-1 overflow-y-auto border-t border-white/[0.028] px-1.25 pb-1.25 pt-1">
          {children}
        </div>
      ) : null}
    </div>
  )
}

export default function ProducerRightRail({
  videoDevices,
  audioDevices,
  selectedVideoDeviceId,
  selectedAudioDeviceId,
  onSelectVideoDevice,
  onSelectAudioDevice,
  participants,
  participantAppearanceOverrides,
  onSetParticipantAccentColor,
  onSetParticipantGlowLevel,
  onSetParticipantOutlineWeight,
  stageIds,
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
  eventId,
  sessionId,
  onPreviewQuestion,
  onHideQuestion,
}: {
  videoDevices: MediaDeviceInfo[]
  audioDevices: MediaDeviceInfo[]
  selectedVideoDeviceId: string
  selectedAudioDeviceId: string
  onSelectVideoDevice: (deviceId: string) => void
  onSelectAudioDevice: (deviceId: string) => void
  participants: ProducerParticipant[]
  participantAppearanceOverrides: Record<string, ParticipantAppearanceOverride>
  onSetParticipantAccentColor: (identity: string, accentId: ParticipantAccentId) => void
  onSetParticipantGlowLevel: (identity: string, glowLevel: ParticipantGlowLevel) => void
  onSetParticipantOutlineWeight: (identity: string, outlineWeight: ParticipantOutlineWeight) => void
  stageIds: Set<string>
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
  eventId: string
  sessionId: string
  onPreviewQuestion: (question: string, region: string) => void
  onHideQuestion: () => void
}): JSX.Element {
  
  const onStageParticipants = participants.filter((participant) => stageIds.has(participant.identity))
  const backstageParticipants = participants.filter((participant) => !stageIds.has(participant.identity))
  const participantRole = (index: number): string =>
    index === 0 ? "Host" : index === 1 ? "Presenter" : index === 2 ? "Speaker" : "Guest"
  const backstageCount = backstageParticipants.length
  type RailTab = "Stage" | "Backstage" | "Layers" | "Q&A"
  const defaultRailTab: RailTab = previewBlocks.length > 0 || selectedBlock
    ? "Layers"
    : onStageParticipants.length === 0 && backstageCount > 0
      ? "Backstage"
      : "Stage"
  const [activeRailTab, setActiveRailTab] = useState<RailTab>(defaultRailTab)
  const railTabs: RailTab[] = ["Stage", "Backstage", "Layers", "Q&A"]

  return (
    <aside className="flex h-full min-w-0 flex-col overflow-hidden bg-[linear-gradient(180deg,rgba(5,9,18,0.98),rgba(2,4,9,1))]">
      <LocalMediaControls
        videoDevices={videoDevices}
        audioDevices={audioDevices}
        selectedVideoDeviceId={selectedVideoDeviceId}
        selectedAudioDeviceId={selectedAudioDeviceId}
        onSelectVideoDevice={onSelectVideoDevice}
        onSelectAudioDevice={onSelectAudioDevice}
      />
      <header className="shrink-0 border-b border-white/[0.09] bg-[#070c15] px-3 pb-3 pt-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/44">Stage desk</div>
            <div className="mt-1 text-[14px] font-semibold text-white/92">
              {onStageParticipants.length} on stage · {backstageCount} backstage
            </div>
          </div>
          <ShieldCheck size={15} className="text-emerald-200/52" />
        </div>
        <nav className="mt-3 grid grid-cols-4 gap-1" aria-label="Stage desk views">
          {railTabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => {
                setActiveRailTab(tab)
              }}
              className={`h-9 rounded-[7px] border text-[9px] font-semibold transition ${
                activeRailTab === tab
                  ? "border-sky-300/40 bg-[#102845] text-sky-50/92 shadow-[inset_0_-2px_0_rgba(56,189,248,0.55)]"
                  : "border-white/[0.07] bg-white/[0.022] text-white/46 hover:bg-white/[0.05] hover:text-white/72"
              }`}
            >
              <span className="flex items-center justify-center gap-1">
                {tab === "Q&A" ? <MessageSquareText size={10} /> : null}
                {tab}
              </span>
            </button>
          ))}
        </nav>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {activeRailTab === "Q&A" ? (
          <ProducerQAModerationPanel
            eventId={eventId}
            sessionId={sessionId}
            onPreviewQuestion={onPreviewQuestion}
            onHideQuestion={onHideQuestion}
          />
        ) : activeRailTab === "Layers" ? (
          selectedBlock || previewBlocks.length > 0 ? (
            <RightInspectorRail
              selectedBlock={selectedBlock}
              previewBlocks={previewBlocks}
              selectedBlockId={selectedBlockId}
              onSelectBlock={onSelectBlock}
              onToggleLayerHidden={onToggleLayerHidden}
              onMoveLayerForward={onMoveLayerForward}
              onMoveLayerBackward={onMoveLayerBackward}
              onReorderLayers={onReorderLayers}
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
              onAssignParticipantToCameraSlot={onAssignParticipantToCameraSlot}
              participants={participants}
              stageIds={stageIds}
              stageState={stageState}
              getScreenTrackSid={getScreenTrackSid}
              onAddToStage={onAddToStage}
              onSetScreenShare={onSetScreenShare}
              onClearPrimary={onClearPrimary}
              onSetPrimary={onSetPrimary}
              onUnpin={onUnpin}
              onPin={onPin}
              onRemoveFromStage={onRemoveFromStage}
              onError={onError}
            />
          ) : (
            <div className="rounded-[12px] border border-dashed border-white/[0.09] px-3 py-8 text-center text-[10px] text-white/32">
              Add a source to Preview to manage its layers.
            </div>
          )
        ) : (
          <>
            <div className="mb-3">
              <div className="text-[8px] font-semibold uppercase tracking-[0.14em] text-white/30">
                {activeRailTab === "Stage" ? "Audience can see" : "Waiting room"}
              </div>
              <div className="mt-1 text-[20px] font-semibold tracking-[-0.035em] text-white/94">
                {activeRailTab === "Stage"
                  ? `${onStageParticipants.length} on stage`
                  : `${backstageCount} backstage`}
              </div>
              <p className="mt-1 text-[10px] leading-relaxed text-white/44">
                {activeRailTab === "Stage"
                  ? "Remove or promote the primary speaker without leaving this view."
                  : "Check readiness, then send a presenter to stage."}
              </p>
            </div>

            <div className="space-y-2">
              {(activeRailTab === "Stage" ? onStageParticipants : backstageParticipants).length > 0 ? (
                (activeRailTab === "Stage" ? onStageParticipants : backstageParticipants)
                  .slice(0, 8)
                  .map((participant, index) => (
                    <InspectorParticipantRow
                      key={participant.identity}
                      participant={participant}
                      role={participantRole(index)}
                      onStage={activeRailTab === "Stage"}
                      screenTrackSid={getScreenTrackSid(participant)}
                      selectedAccentId={participant.accentColor ?? participantAppearanceOverrides[participant.identity]?.accentId ?? null}
                      selectedGlowLevel={participantAppearanceOverrides[participant.identity]?.glowLevel ?? null}
                      selectedOutlineWeight={participantAppearanceOverrides[participant.identity]?.outlineWeight ?? null}
                      onSetAccentColor={onSetParticipantAccentColor}
                      onSetGlowLevel={onSetParticipantGlowLevel}
                      onSetOutlineWeight={onSetParticipantOutlineWeight}
                      onAddToStage={onAddToStage}
                      onRemoveFromStage={onRemoveFromStage}
                      onSetPrimary={onSetPrimary}
                      onSetScreenShare={onSetScreenShare}
                    />
                  ))
              ) : (
                <div className="rounded-[12px] border border-dashed border-white/[0.09] px-3 py-8 text-center text-[10px] leading-relaxed text-white/32">
                  {participants.length === 0
                    ? "No presenters are connected yet."
                    : activeRailTab === "Stage"
                      ? "Stage is clear. Open Backstage to choose a presenter."
                      : "Everyone connected is already on stage."}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </aside>
  )
}
