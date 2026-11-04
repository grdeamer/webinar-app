export const ENGINE_STOP_REASONS = ['deadline','signal:SIGTERM','signal:SIGINT','operator-stop','network-limit','network-accounting-unavailable','soak-terminal','startup-failed'] as const
export type EngineStopReason = typeof ENGINE_STOP_REASONS[number]
/** Fixed metadata fields only: never log request bodies, credentials or arbitrary exception messages. */
export function engineStopEvent(reason:EngineStopReason,runId:string,phase:'requested'|'completed',success:boolean,atMs=Date.now()) {
  if(!ENGINE_STOP_REASONS.includes(reason)||!/^[-a-f0-9]{36}$/.test(runId)||!Number.isSafeInteger(atMs))throw Error('Invalid stop metadata')
  return {event:'producer-engine-stop',reason,runId,phase,success,atMs}
}
