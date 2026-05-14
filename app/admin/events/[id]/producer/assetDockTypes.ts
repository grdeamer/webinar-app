import type { PreviewBlock } from "./useProducerBlocks"

export type ScreenLayoutPreset = "classic" | "brand" | "speaker_focus" | "fullscreen"

export type SceneSummary = {
  id: string
  name: string
  screenLayoutPreset?: ScreenLayoutPreset | null
  previewBlocks?: PreviewBlock[] | null
  thumbnailUrl?: string | null
}

export type DockAsset = {
  id: string
  label?: string
}

export type DockAssetCategory = "graphic" | "media" | "scene"

export type DockAssetRecord = DockAsset & {
  category: DockAssetCategory
  thumbnailUrl?: string | null
  durationLabel?: string | null
}

export const FALLBACK_GRAPHICS_ITEMS: DockAssetRecord[] = [
  {
    id: "placeholder-lower",
    label: "Lower Third",
    category: "graphic",
  },
  {
    id: "placeholder-name",
    label: "Name Tag",
    category: "graphic",
  },
]

export const FALLBACK_MEDIA_ITEMS: DockAssetRecord[] = [
  {
    id: "placeholder-intro",
    label: "Intro Video",
    category: "media",
    durationLabel: "00:45",
  },
  {
    id: "placeholder-bumper",
    label: "Bumper",
    category: "media",
    durationLabel: "00:08",
  },
  {
    id: "placeholder-countdown",
    label: "Countdown",
    category: "media",
    durationLabel: "05:00",
  },
]

export const TRANSITION_PRESETS = ["Cut", "Fade", "Dip", "Stinger"] as const
export const TRANSITION_DURATIONS = ["250ms", "500ms", "1s"] as const