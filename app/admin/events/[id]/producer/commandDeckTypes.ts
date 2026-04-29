import type { LucideIcon } from "lucide-react"
import { Repeat, Users, Wifi, Zap } from "lucide-react"

export type TakeMode = "cut" | "auto"
export type CinematicTransitionType = "fade" | "warp" | "curtain"

export const TRANSITION_OPTIONS: Array<{
  label: string
  value: CinematicTransitionType
}> = [
  { label: "Fade", value: "fade" },
  { label: "Warp", value: "warp" },
  { label: "Curtain", value: "curtain" },
]

export const AUDIO_MIXER_ROWS = ["Host", "Guest", "Program"] as const

export const QUICK_ACTIONS: Array<{
  label: string
  icon: LucideIcon
}> = [
  { label: "Signal", icon: Wifi },
  { label: "Guests", icon: Users },
  { label: "Replay", icon: Repeat },
  { label: "Boost", icon: Zap },
]

export type BroadcastCommandDeckProps = {
  isLive: boolean
  audienceCount: number
  onStageCount: number
  previewProgramDifferent: boolean
  takeBusy: boolean
  onTake: (mode: TakeMode, transitionType?: CinematicTransitionType) => void
}

export type TakeControlProps = {
  previewProgramDifferent: boolean
  takeBusy: boolean
  onTake: (mode: TakeMode, transitionType?: CinematicTransitionType) => void
}