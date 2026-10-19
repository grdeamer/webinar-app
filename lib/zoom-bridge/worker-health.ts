import type { ZoomRoom } from "./types"

export function workerStatusLabel(status?: string) {
  return status === "paused" ? "Paused for testing" : status || "Disconnected"
}

/** A controller poll must not turn an unresponsive worker into a connection. */
export function workerObservation(observed: ZoomRoom["observed"]): ZoomRoom["observed"] {
  if (observed.status === "paused" || (observed.status === "failed" && observed.error === "Meeting joins paused for diagnostics.")) {
    return { ...observed, status: "paused", error: undefined, camera: false, microphone: false, sourceVideo: false, sourceAudio: false }
  }
  return observed.status === "failed" && observed.error?.startsWith("Worker stalled.")
    ? { ...observed, status: "stalled", camera: false, microphone: false, sourceVideo: false, sourceAudio: false }
    : observed
}
