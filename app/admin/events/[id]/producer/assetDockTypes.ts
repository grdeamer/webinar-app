export type SceneSummary = {
  id: string
  name: string
}

export type DockAsset = {
  id: string
  label?: string
}

export const FALLBACK_GRAPHICS_ITEMS: DockAsset[] = [
  { id: "placeholder-lower", label: "Lower Third" },
  { id: "placeholder-name", label: "Name Tag" },
]

export const FALLBACK_MEDIA_ITEMS: DockAsset[] = [
  { id: "placeholder-intro", label: "Intro Video" },
  { id: "placeholder-bumper", label: "Bumper" },
  { id: "placeholder-countdown", label: "Countdown" },
]

export const TRANSITION_PRESETS = ["Cut", "Fade", "Dip", "Stinger"] as const
export const TRANSITION_DURATIONS = ["250ms", "500ms", "1s"] as const