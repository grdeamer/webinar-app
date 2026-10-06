export type SourceProfile = {
  programName: string; switcherName: string; captureName: string; encoderName: string; audioName: string; notes: string;
  relayResolution: "1080p" | "720p"; encoderFps: 15 | 30; encoderBitrate: number;
}
export const defaultSourceProfile: SourceProfile = {
  programName: "HDMI program", switcherName: "ATEM", captureName: "capture device", encoderName: "OBS", audioName: "Program audio", notes: "",
  relayResolution: "1080p", encoderFps: 30, encoderBitrate: 6000,
}
export function parseSourceProfile(value: unknown): SourceProfile {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid source profile.")
  const input = value as Record<string, unknown>
  function label(key: string) {
    const text = typeof input[key] === "string" ? input[key].trim() : ""
    if (!text || text.length > 64 || /[\x00-\x1f]/.test(text)) throw new Error("Device and program names must be 1–64 characters.")
    return text
  }
  const notes = typeof input.notes === "string" ? input.notes.trim() : ""
  if (notes.length > 500 || /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(notes)) throw new Error("Notes must be at most 500 characters.")
  if (input.relayResolution !== "720p" && input.relayResolution !== "1080p") throw new Error("Choose 720p or 1080p.")
  if (input.encoderFps !== 15 && input.encoderFps !== 30) throw new Error("Encoder guidance supports 15 or 30 fps.")
  if (typeof input.encoderBitrate !== "number" || !Number.isInteger(input.encoderBitrate) || input.encoderBitrate < 1000 || input.encoderBitrate > 20000) throw new Error("Encoder bitrate must be between 1,000 and 20,000 Kbps.")
  return { programName: label("programName"), switcherName: label("switcherName"), captureName: label("captureName"), encoderName: label("encoderName"), audioName: label("audioName"), notes, relayResolution: input.relayResolution, encoderFps: input.encoderFps, encoderBitrate: input.encoderBitrate }
}
