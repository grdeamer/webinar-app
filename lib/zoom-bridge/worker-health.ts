import type { ZoomRoom } from "./types"

/** A controller poll must not turn an unresponsive worker into a connection. */
export function workerObservation(observed: ZoomRoom["observed"]): ZoomRoom["observed"] {
  return observed.status === "failed" && observed.error?.startsWith("Worker stalled.")
    ? { ...observed, status: "stalled", camera: false, microphone: false, sourceVideo: false, sourceAudio: false }
    : observed
}
