export const BROADCAST_OUTPUT_PROFILE_STORAGE_KEY = "jupiter-broadcast-output-profile-v1"

export const BROADCAST_OUTPUT_PROFILES = {
  "universal-720p30": {
    id: "universal-720p30",
    label: "HD 720p",
    width: 1280,
    height: 720,
    frameRate: 30,
    aspectRatio: "16:9",
    aspectRatioValue: 16 / 9,
    videoBitrateKbps: 3500,
  },
  "high-1080p30": {
    id: "high-1080p30",
    label: "Full HD 1080p",
    width: 1920,
    height: 1080,
    frameRate: 30,
    aspectRatio: "16:9",
    aspectRatioValue: 16 / 9,
    videoBitrateKbps: 6000,
  },
} as const

export type BroadcastOutputProfileId = keyof typeof BROADCAST_OUTPUT_PROFILES
export type BroadcastOutputProfile = (typeof BROADCAST_OUTPUT_PROFILES)[BroadcastOutputProfileId]

export const DEFAULT_BROADCAST_OUTPUT_PROFILE_ID: BroadcastOutputProfileId = "universal-720p30"

export function normalizeBroadcastOutputProfileId(value: unknown): BroadcastOutputProfileId {
  return typeof value === "string" && value in BROADCAST_OUTPUT_PROFILES
    ? value as BroadcastOutputProfileId
    : DEFAULT_BROADCAST_OUTPUT_PROFILE_ID
}

export function getBroadcastOutputProfile(value: unknown): BroadcastOutputProfile {
  return BROADCAST_OUTPUT_PROFILES[normalizeBroadcastOutputProfileId(value)]
}

export function broadcastOutputProfileLabel(profile: BroadcastOutputProfile): string {
  return `${profile.width}×${profile.height} · ${profile.aspectRatio} · ${profile.frameRate} fps`
}
