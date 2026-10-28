export type MediaReport = {
  appliedRevision: number
  framesRendered: number
  framesSent: number
  audioPackets: number
  decodedFrames: number
  decodedRevision: number | null
  markerFrame: number | null
  width: number
  height: number
  error: string | null
  audioRms: number
  contentSource: string | null
  inputFrames: Record<string, number>
  transitionFrames: number
  generation: number
  firstDecodedAtMs: number
  lastDecodedAtMs: number
  sourceWarnings: string[]
  assetPositions: Record<string, number>
  publisherIdentity: string | null
  videoTrackSid: string | null
  audioTrackSid: string | null
}

export type MediaProgress = {
  report: MediaReport
  reportedAtMs: number
  progressedAtMs: number
  fps: number
}

function count(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) throw new Error("Invalid media counter")
  return value
}

export function parseMediaReport(value: unknown): MediaReport {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid media report")
  const x = value as Record<string, unknown>
  const inputs: Record<string, number> = {}
  const positions: Record<string, number> = {}
  if (x.assetPositions && typeof x.assetPositions === 'object' && !Array.isArray(x.assetPositions)) {
    for (const [key, value] of Object.entries(x.assetPositions).slice(0, 200)) {
      if (!/^[\w-]{1,120}$/.test(key) || key in Object.prototype) throw new Error('Invalid asset position')
      positions[key] = count(value)
    }
  }
  if (x.inputFrames && typeof x.inputFrames === "object") {
    if (Array.isArray(x.inputFrames) || Object.keys(x.inputFrames).length > 200) throw new Error("Invalid input counters")
    for (const [key, value] of Object.entries(x.inputFrames)) {
      if (!/^[\w-]{1,120}$/.test(key) || key in Object.prototype) throw new Error("Invalid input counter")
      inputs[key] = count(value)
    }
  }
  return {
    appliedRevision: count(x.appliedRevision), framesRendered: count(x.framesRendered),
    framesSent: count(x.framesSent), audioPackets: count(x.audioPackets), decodedFrames: count(x.decodedFrames),
    decodedRevision: x.decodedRevision === null ? null : count(x.decodedRevision),
    markerFrame: x.markerFrame === null ? null : count(x.markerFrame),
    width: count(x.width), height: count(x.height),
    error: typeof x.error === "string" ? x.error.slice(0, 200) : null,
    audioRms: typeof x.audioRms === "number" && Number.isFinite(x.audioRms) ? Math.max(0, Math.min(1, x.audioRms)) : 0,
    contentSource: ["camera-a", "camera-b", "slate", "transition"].includes(String(x.contentSource)) ? String(x.contentSource) : null,
    inputFrames: inputs,
    transitionFrames: count(x.transitionFrames ?? 0), generation: count(x.generation ?? 0),
    firstDecodedAtMs: count(x.firstDecodedAtMs ?? 0), lastDecodedAtMs: count(x.lastDecodedAtMs ?? 0),
    sourceWarnings: Array.isArray(x.sourceWarnings) ? x.sourceWarnings.slice(0, 20).filter((item): item is string => typeof item === 'string').map(item => item.slice(0, 140)) : [],
    assetPositions: positions,
    publisherIdentity: typeof x.publisherIdentity === 'string' && /^program-engine-\d+$/.test(x.publisherIdentity) ? x.publisherIdentity : null,
    videoTrackSid: typeof x.videoTrackSid === 'string' && /^TR_[\w-]+$/.test(x.videoTrackSid) ? x.videoTrackSid : null,
    audioTrackSid: typeof x.audioTrackSid === 'string' && /^TR_[\w-]+$/.test(x.audioTrackSid) ? x.audioTrackSid : null,
  }
}

export function updateMediaProgress(previous: MediaProgress | null, report: MediaReport, nowMs: number, observer: boolean): MediaProgress {
  const before = previous ? (observer ? previous.report.decodedFrames : previous.report.framesSent) : 0
  const current = observer ? report.decodedFrames : report.framesSent
  if (previous && current < before) throw new Error("Media counters moved backwards")
  const progressed = current > before && (!observer || report.markerFrame !== previous?.report.markerFrame)
  return {
    report, reportedAtMs: nowMs,
    progressedAtMs: progressed ? nowMs : previous?.progressedAtMs ?? 0,
    fps: previous && nowMs > previous.reportedAtMs ? Math.round((current - before) * 10000 / (nowMs - previous.reportedAtMs)) / 10 : 0,
  }
}

export function mediaIsFresh(progress: MediaProgress | null, nowMs: number, maxAgeMs = 4000): boolean {
  return Boolean(progress && progress.progressedAtMs > 0 && nowMs - progress.progressedAtMs < maxAgeMs && nowMs - progress.reportedAtMs < maxAgeMs)
}
