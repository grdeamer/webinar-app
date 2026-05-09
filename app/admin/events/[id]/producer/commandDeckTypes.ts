import type { LucideIcon } from "lucide-react"
import { Repeat, Users, Wifi, Zap } from "lucide-react"

export type TakeMode = "cut" | "auto"
export type CinematicTransitionType = "fade" | "warp" | "curtain"

export type RundownCueState =
  | "idle"
  | "standby"
  | "next"
  | "live"
  | "completed"
  | "blocked"

export type RundownCueType =
  | "scene"
  | "lower_third"
  | "media"
  | "ifb"
  | "routing"
  | "break"

export type RundownExecutionMode = "rehearsal" | "live"

export type ConfidenceSeverity = "stable" | "watch" | "warning" | "critical"

export type ConfidenceMetricType =
  | "latency"
  | "bitrate"
  | "packet_loss"
  | "sync"
  | "return_feed"

export type IFBChannelType =
  | "host"
  | "guest"
  | "producer"
  | "stage_manager"
  | "broadcast"

export type IFBChannelState = "open" | "muted" | "cough" | "priority"

export const TRANSITION_OPTIONS: Array<{
  label: string
  value: CinematicTransitionType
}> = [
  { label: "Fade", value: "fade" },
  { label: "Warp", value: "warp" },
  { label: "Curtain", value: "curtain" },
]

export const RUNDOWN_CUE_STATE_ORDER: RundownCueState[] = [
  "idle",
  "standby",
  "next",
  "live",
  "completed",
  "blocked",
]

export const AUDIO_MIXER_ROWS = ["Host", "Guest", "Program"] as const

export const CONFIDENCE_MONITORING_METRICS: Array<{
  label: string
  type: ConfidenceMetricType
  severity: ConfidenceSeverity
  value: string
}> = [
  {
    label: "Latency",
    type: "latency",
    severity: "stable",
    value: "82ms",
  },
  {
    label: "Bitrate",
    type: "bitrate",
    severity: "stable",
    value: "8.2 Mbps",
  },
  {
    label: "Packet Loss",
    type: "packet_loss",
    severity: "watch",
    value: "0.2%",
  },
  {
    label: "A/V Sync",
    type: "sync",
    severity: "stable",
    value: "Locked",
  },
  {
    label: "Return Feed",
    type: "return_feed",
    severity: "stable",
    value: "Clean",
  },
]

export const IFB_CHANNELS: Array<{
  label: string
  type: IFBChannelType
  state: IFBChannelState
  route: string
}> = [
  {
    label: "Host IFB",
    type: "host",
    state: "open",
    route: "Producer",
  },
  {
    label: "Guest IFB",
    type: "guest",
    state: "muted",
    route: "Stage Manager",
  },
  {
    label: "Producer",
    type: "producer",
    state: "priority",
    route: "All Talent",
  },
  {
    label: "Stage",
    type: "stage_manager",
    state: "open",
    route: "Backstage",
  },
]

export const DEFAULT_RUNDOWN_CUES: Array<{
  id: string
  title: string
  type: RundownCueType
  state: RundownCueState
  duration: string
  owner: string
}> = [
  {
    id: "cue-host-open",
    title: "Host Welcome",
    type: "scene",
    state: "live",
    duration: "03:00",
    owner: "TD",
  },
  {
    id: "cue-guest-intro",
    title: "Guest Introduction",
    type: "lower_third",
    state: "next",
    duration: "00:20",
    owner: "Graphics",
  },
  {
    id: "cue-media-roll",
    title: "Sponsor Roll-In",
    type: "media",
    state: "standby",
    duration: "00:15",
    owner: "Playback",
  },
  {
    id: "cue-breakout-route",
    title: "Audience Route",
    type: "routing",
    state: "idle",
    duration: "00:05",
    owner: "Ops",
  },
]

export const QUICK_ACTIONS: Array<{
  label: string
  icon: LucideIcon
}> = [
  { label: "Signal", icon: Wifi },
  { label: "Guests", icon: Users },
  { label: "Replay", icon: Repeat },
  { label: "Boost", icon: Zap },
]

export type RundownCue = {
  id: string
  title: string
  type: RundownCueType
  state: RundownCueState
  duration: string
  owner: string
}

export type ConfidenceMetric = {
  label: string
  type: ConfidenceMetricType
  severity: ConfidenceSeverity
  value: string
}

export type IFBChannel = {
  label: string
  type: IFBChannelType
  state: IFBChannelState
  route: string
}

export type BroadcastCommandDeckProps = {
  isLive: boolean
  audienceCount: number
  onStageCount: number
  previewProgramDifferent: boolean
  takeBusy: boolean
  onTake: (
    mode: TakeMode,
    transitionType?: CinematicTransitionType,
    transitionDurationMs?: number
  ) => void
}

export type TakeControlProps = {
  previewProgramDifferent: boolean
  takeBusy: boolean
  onTake: (
    mode: TakeMode,
    transitionType?: CinematicTransitionType,
    transitionDurationMs?: number
  ) => void
}

export type TransitionModeControlProps = {
  selectedTransitionType: CinematicTransitionType
  onTransitionTypeChange: (value: CinematicTransitionType) => void
  selectedTransitionDurationMs?: number
  onTransitionDurationChange?: (value: number) => void
}

export type RundownEngineState = {
  mode: RundownExecutionMode
  cues: RundownCue[]
  activeCueId?: string
  nextCueId?: string
}

export type ConfidenceMonitoringState = {
  metrics: ConfidenceMetric[]
  transmissionHealthy: boolean
  returnFeedHealthy: boolean
}

export type IFBRoutingState = {
  channels: IFBChannel[]
  producerOverrideActive: boolean
}