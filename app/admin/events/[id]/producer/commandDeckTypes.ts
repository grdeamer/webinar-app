import type { LucideIcon } from "lucide-react"
import { Wifi, Users, Repeat, Zap } from "lucide-react"

export type TakeMode = "cut" | "auto"

export const TRANSITION_OPTIONS = ["Cut", "Fade", "Dip"] as const
export const AUDIO_MIXER_ROWS = ["Host", "Guest", "Program"] as const

export const QUICK_ACTIONS: ReadonlyArray<{
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
  onTake: (mode: TakeMode) => void
}

export type TakeControlProps = {
  previewProgramDifferent: boolean
  takeBusy: boolean
  onTake: (mode: TakeMode) => void
}