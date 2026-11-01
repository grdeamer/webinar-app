/** Recording and managed export must fail closed on the recording-free EC2 relay. */
export function liveRecordingDisabled(env: Record<string, string | undefined> = process.env) {
  return env.LIVEKIT_DEPLOYMENT === 'self-hosted' || env.LIVEKIT_RECORDING_ENABLED === 'false'
}
export function liveEgressDisabled(env: Record<string, string | undefined> = process.env) {
  return env.LIVEKIT_DEPLOYMENT === 'self-hosted' && env.LIVEKIT_EGRESS_ENABLED !== 'true'
}
export function assertLiveRecordingAllowed(env: Record<string, string | undefined> = process.env) {
  if (liveRecordingDisabled(env)) throw new Error('Recording is disabled for this media deployment.')
}
export function assertLiveEgressAllowed(env: Record<string, string | undefined> = process.env) {
  if (liveEgressDisabled(env)) throw new Error('RTMP export is not installed on the self-hosted relay. No Cloud fallback was started.')
}
