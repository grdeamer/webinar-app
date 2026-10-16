export type VideoSettings = { quality: "auto" | "720p" | "1080p"; aspect: "original" | "16:9" | "4:3" }
// Preserve legacy defaults when reading existing profiles.
export const defaultVideoSettings: VideoSettings = { quality: "auto", aspect: "original" }
export const newSatelliteVideoSettings: VideoSettings = { quality: "1080p", aspect: "16:9" }
export function parseVideoSettings(value: unknown): VideoSettings {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid video settings.")
  const input = value as Record<string, unknown>
  if (!["auto", "720p", "1080p"].includes(String(input.quality)) || !["original", "16:9", "4:3"].includes(String(input.aspect))) throw new Error("Choose a supported video quality and aspect ratio.")
  return { quality: input.quality as VideoSettings["quality"], aspect: input.aspect as VideoSettings["aspect"] }
}
