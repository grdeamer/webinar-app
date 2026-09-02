export const BROADCAST_OUTPUT_PROFILE_STORAGE_KEY = "jupiter-broadcast-output-profile-v1"

export type BroadcastResolutionTier = "480p" | "720p" | "1080p"
export type BroadcastFrameRate = 30 | 60
export type BroadcastAspectRatio = "16:9" | "9:16" | "1:1" | "4:3"

export type BroadcastOutputProfile = {
  id: string
  label: string
  resolutionTier: BroadcastResolutionTier
  width: number
  height: number
  frameRate: BroadcastFrameRate
  aspectRatio: BroadcastAspectRatio
  aspectRatioValue: number
  videoBitrateKbps: number
}

function profile(
  id: string,
  label: string,
  resolutionTier: BroadcastResolutionTier,
  width: number,
  height: number,
  frameRate: BroadcastFrameRate,
  aspectRatio: BroadcastAspectRatio,
  videoBitrateKbps: number,
): BroadcastOutputProfile {
  return { id, label, resolutionTier, width, height, frameRate, aspectRatio, aspectRatioValue: width / height, videoBitrateKbps }
}

export const BROADCAST_OUTPUT_PROFILES = {
  "low-480p30-16x9": profile("low-480p30-16x9", "Low bandwidth 480p", "480p", 854, 480, 30, "16:9", 1500),
  "low-480p30-9x16": profile("low-480p30-9x16", "Low bandwidth 480p portrait", "480p", 480, 854, 30, "9:16", 1500),
  "low-480p30-1x1": profile("low-480p30-1x1", "Low bandwidth 480p square", "480p", 480, 480, 30, "1:1", 1400),
  "low-480p30-4x3": profile("low-480p30-4x3", "Low bandwidth 480p presentation", "480p", 640, 480, 30, "4:3", 1500),
  "universal-720p30": profile("universal-720p30", "HD 720p", "720p", 1280, 720, 30, "16:9", 3500),
  "universal-720p60": profile("universal-720p60", "HD 720p high motion", "720p", 1280, 720, 60, "16:9", 5000),
  "universal-720p30-9x16": profile("universal-720p30-9x16", "HD 720p portrait", "720p", 720, 1280, 30, "9:16", 3500),
  "universal-720p60-9x16": profile("universal-720p60-9x16", "HD 720p portrait high motion", "720p", 720, 1280, 60, "9:16", 5000),
  "universal-720p30-1x1": profile("universal-720p30-1x1", "HD 720p square", "720p", 720, 720, 30, "1:1", 3000),
  "universal-720p60-1x1": profile("universal-720p60-1x1", "HD 720p square high motion", "720p", 720, 720, 60, "1:1", 4500),
  "universal-720p30-4x3": profile("universal-720p30-4x3", "HD 720p presentation", "720p", 960, 720, 30, "4:3", 3200),
  "universal-720p60-4x3": profile("universal-720p60-4x3", "HD 720p presentation high motion", "720p", 960, 720, 60, "4:3", 4800),
  "high-1080p30": profile("high-1080p30", "Full HD 1080p", "1080p", 1920, 1080, 30, "16:9", 6000),
  "high-1080p60": profile("high-1080p60", "Full HD 1080p high motion", "1080p", 1920, 1080, 60, "16:9", 9000),
  "high-1080p30-9x16": profile("high-1080p30-9x16", "Full HD 1080p portrait", "1080p", 1080, 1920, 30, "9:16", 6000),
  "high-1080p60-9x16": profile("high-1080p60-9x16", "Full HD 1080p portrait high motion", "1080p", 1080, 1920, 60, "9:16", 9000),
  "high-1080p30-1x1": profile("high-1080p30-1x1", "Full HD 1080p square", "1080p", 1080, 1080, 30, "1:1", 5200),
  "high-1080p60-1x1": profile("high-1080p60-1x1", "Full HD 1080p square high motion", "1080p", 1080, 1080, 60, "1:1", 7800),
  "high-1080p30-4x3": profile("high-1080p30-4x3", "Full HD 1080p presentation", "1080p", 1440, 1080, 30, "4:3", 5600),
  "high-1080p60-4x3": profile("high-1080p60-4x3", "Full HD 1080p presentation high motion", "1080p", 1440, 1080, 60, "4:3", 8400),
} as const satisfies Record<string, BroadcastOutputProfile>

export type BroadcastOutputProfileId = keyof typeof BROADCAST_OUTPUT_PROFILES

export const BROADCAST_RESOLUTION_OPTIONS = [
  { id: "480p", label: "Low 480p", detail: "Bandwidth saver" },
  { id: "720p", label: "HD 720p", detail: "Standard live" },
  { id: "1080p", label: "Full HD 1080p", detail: "High quality" },
] as const satisfies ReadonlyArray<{ id: BroadcastResolutionTier; label: string; detail: string }>

export const BROADCAST_ASPECT_RATIO_OPTIONS = [
  { id: "16:9", label: "16:9", detail: "Landscape" },
  { id: "9:16", label: "9:16", detail: "Portrait" },
  { id: "1:1", label: "1:1", detail: "Square" },
  { id: "4:3", label: "4:3", detail: "Presentation" },
] as const satisfies ReadonlyArray<{ id: BroadcastAspectRatio; label: string; detail: string }>

export const DEFAULT_BROADCAST_OUTPUT_PROFILE_ID: BroadcastOutputProfileId = "universal-720p30"

export function normalizeBroadcastOutputProfileId(value: unknown): BroadcastOutputProfileId {
  return typeof value === "string" && value in BROADCAST_OUTPUT_PROFILES
    ? value as BroadcastOutputProfileId
    : DEFAULT_BROADCAST_OUTPUT_PROFILE_ID
}

export function getBroadcastOutputProfile(value: unknown): BroadcastOutputProfile {
  return BROADCAST_OUTPUT_PROFILES[normalizeBroadcastOutputProfileId(value)]
}

export function findBroadcastOutputProfileId({
  resolutionTier,
  frameRate,
  aspectRatio,
}: {
  resolutionTier: BroadcastResolutionTier
  frameRate: BroadcastFrameRate
  aspectRatio: BroadcastAspectRatio
}): BroadcastOutputProfileId {
  const exactMatch = Object.values(BROADCAST_OUTPUT_PROFILES).find(
    (candidate) => candidate.resolutionTier === resolutionTier && candidate.frameRate === frameRate && candidate.aspectRatio === aspectRatio,
  )
  if (exactMatch) return exactMatch.id as BroadcastOutputProfileId

  const safeMatch = Object.values(BROADCAST_OUTPUT_PROFILES).find(
    (candidate) => candidate.resolutionTier === resolutionTier && candidate.frameRate === 30 && candidate.aspectRatio === aspectRatio,
  )
  return (safeMatch?.id as BroadcastOutputProfileId | undefined) ?? DEFAULT_BROADCAST_OUTPUT_PROFILE_ID
}

export function broadcastOutputProfileLabel(profile: BroadcastOutputProfile): string {
  return `${profile.width}×${profile.height} · ${profile.aspectRatio} · ${profile.frameRate} fps`
}
