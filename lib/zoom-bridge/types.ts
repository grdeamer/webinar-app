import type { SourceProfile } from "./source-profile"
export type PublishMode = "camera" | "share"
export type ZoomRoom = {
  id: string; name: string; meetingId: string; hasPasscode: boolean;
  running: boolean; originalSound: boolean; camera: boolean; microphone: boolean; publishMode: PublishMode; revision: string;
  observed: { publishMode?: PublishMode; originalSound?: boolean; videoResolution?: string; sourceVideo?: boolean; sourceAudio?: boolean; status?: string; camera?: boolean; microphone?: boolean; name?: string; error?: string; revision?: string };
  lastSeen: string | null;
}
export type ZoomAction = "start" | "stop" | "camera_on" | "camera_off" | "microphone_on" | "microphone_off" | "original_sound_on" | "original_sound_off"
export function normalizeMeetingId(value: string) {
  const id = value.replace(/[\s-]/g, "")
  if (!/^\d{9,11}$/.test(id)) throw new Error("Enter a Zoom meeting ID with 9–11 digits.")
  return id
}
export function actionPatch(action: ZoomAction) {
  switch (action) {
    case "original_sound_on": return { desired_original_sound: true }
    case "original_sound_off": return { desired_original_sound: false }
    case "start": return { desired_running: true }
    case "stop": return { desired_running: false }
    case "camera_on": return { desired_camera: true }
    case "camera_off": return { desired_camera: false }
    case "microphone_on": return { desired_microphone: true }
    case "microphone_off": return { desired_microphone: false }
    default: throw new Error("Unknown worker command.")
  }
}
export type ZoomSource = {
  kind: "srt" | "zoom"; profile?: SourceProfile;
  meetingId: string; hasPasscode: boolean; running: boolean; revision: string;
  observed: { ingestKeyRevision?: string; kind?: "srt" | "zoom"; inputResolutions?: string; status?: string; presenter?: string; spotlightCount?: number; video?: boolean; audio?: boolean; error?: string; revision?: string; videoFrames?: number; audioBlocks?: number };
  lastSeen: string | null;
}
export function parsePublishMode(value: unknown): PublishMode {
  if (value !== "camera" && value !== "share") throw new Error("Choose camera or screen share.")
  return value
}
export function outputLabel(mode: PublishMode) { return mode === "share" ? "Screen share" : "Camera" }
export function assertSourceIsSeparate(sourceMeetingId: string, destinationMeetingIds: string[]) {
  if (destinationMeetingIds.includes(sourceMeetingId)) throw new Error("The source meeting cannot also be a satellite destination.")
}
