export const broadcastProviders = ["youtube", "linkedin", "facebook", "vimeo", "custom"] as const

export type BroadcastProvider = (typeof broadcastProviders)[number]

export type BroadcastDestination = {
  id: string
  eventId: string
  provider: BroadcastProvider
  label: string
  serverUrl: string
  enabled: boolean
  reusable: boolean
  status: "ready" | "disabled" | "error"
  maskedStreamKey: string
  hasStreamKey: boolean
  lastTestedAt: string | null
  createdAt: string
  updatedAt: string
}

export type BroadcastRunDestination = {
  id: string
  destinationId: string | null
  provider: BroadcastProvider
  label: string
  status: "starting" | "active" | "stopped" | "complete" | "failed"
  error: string | null
}

export type BroadcastRun = {
  id: string
  egressId: string
  status: "starting" | "active" | "ending" | "complete" | "failed" | "aborted" | "limit_reached"
  qualityProfile: string
  recordingEnabled: boolean
  startedAt: string
  endedAt: string | null
  error: string | null
  destinations: BroadcastRunDestination[]
}

export const providerLabels: Record<BroadcastProvider, string> = {
  youtube: "YouTube",
  linkedin: "LinkedIn Live",
  facebook: "Facebook Live",
  vimeo: "Vimeo",
  custom: "Custom RTMP",
}

export function isBroadcastProvider(value: unknown): value is BroadcastProvider {
  return typeof value === "string" && broadcastProviders.includes(value as BroadcastProvider)
}

export function normalizeBroadcastServerUrl(value: unknown): string {
  if (typeof value !== "string") throw new Error("A stream server URL is required.")
  const normalized = value.trim().replace(/\/+$/, "")
  if (!/^rtmps?:\/\//i.test(normalized)) {
    throw new Error("The stream server must use rtmp:// or rtmps://.")
  }
  if (normalized.length > 1000) throw new Error("The stream server URL is too long.")
  return normalized
}

export function buildBroadcastOutputUrl(serverUrl: string, streamKey: string): string {
  const normalizedServer = normalizeBroadcastServerUrl(serverUrl)
  const normalizedKey = streamKey.trim().replace(/^\/+/, "")
  if (!normalizedKey) throw new Error("A stream key is required.")
  return `${normalizedServer}/${normalizedKey}`
}

export function maskBroadcastServerUrl(serverUrl: string): string {
  try {
    const parsed = new URL(serverUrl)
    return `${parsed.protocol}//${parsed.host}${parsed.pathname}`
  } catch {
    return "RTMP destination"
  }
}

export function sanitizeBroadcastError(error: unknown, sensitiveValues: string[] = []): string {
  let message = error instanceof Error ? error.message : typeof error === "string" ? error : "Broadcast operation failed."
  for (const value of sensitiveValues) {
    if (value) message = message.replaceAll(value, "[redacted RTMP destination]")
  }
  return message.replace(/rtmps?:\/\/[^\s,'"\])}]+/gi, "[redacted RTMP destination]")
}
