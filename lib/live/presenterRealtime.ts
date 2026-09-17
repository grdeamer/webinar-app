export const PRESENTER_SIGNAL_TOPIC = "jupiter.presenter.v1"
export const PRESENTER_SIGNAL_EVENT = "jupiter:producer-presenter-signal"

export type PresenterProgramSource = {
  mode: "cut" | "auto"
  transitionType?: string
  transitionDurationMs?: number
  sourceType: "camera" | "screen" | "media" | "empty"
  participantIdentity: string | null
  screenShareParticipantIdentity: string | null
  screenShareTrackId: string | null
  mediaUrl?: string | null
  mediaType?: "image" | "video" | null
  mediaLabel?: string | null
  programBlocks?: unknown[]
  layout: string | null
  isLive: boolean
  updatedAt: number
}

export type PresenterNextContent = {
  type: "slide" | "screen" | "empty"
  title: string
  subtitle?: string
  mode?: "preview" | "program"
  updatedAt: number
}

export type PresenterSignalEnvelope =
  | {
      version: 1
      kind: "program-source"
      sessionId: string
      payload: PresenterProgramSource
    }
  | {
      version: 1
      kind: "next-content"
      sessionId: string
      payload: PresenterNextContent
    }

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function isProgramSource(value: unknown): value is PresenterProgramSource {
  if (!isRecord(value)) return false
  return (
    (value.mode === "cut" || value.mode === "auto") &&
    (value.sourceType === "camera" ||
      value.sourceType === "screen" ||
      value.sourceType === "media" ||
      value.sourceType === "empty") &&
    typeof value.isLive === "boolean" &&
    typeof value.updatedAt === "number"
  )
}

function isNextContent(value: unknown): value is PresenterNextContent {
  if (!isRecord(value)) return false
  return (
    (value.type === "slide" || value.type === "screen" || value.type === "empty") &&
    typeof value.title === "string" &&
    typeof value.updatedAt === "number"
  )
}

export function encodePresenterSignal(envelope: PresenterSignalEnvelope): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(envelope))
}

export function decodePresenterSignal(data: Uint8Array): PresenterSignalEnvelope | null {
  try {
    const value = JSON.parse(new TextDecoder().decode(data)) as unknown
    if (!isRecord(value) || value.version !== 1 || typeof value.sessionId !== "string") {
      return null
    }

    if (value.kind === "program-source" && isProgramSource(value.payload)) {
      return value as PresenterSignalEnvelope
    }

    if (value.kind === "next-content" && isNextContent(value.payload)) {
      return value as PresenterSignalEnvelope
    }
  } catch {
    // Ignore malformed or unrelated room data.
  }

  return null
}

export function dispatchPresenterSignal(envelope: PresenterSignalEnvelope): void {
  if (typeof window === "undefined") return
  window.dispatchEvent(
    new CustomEvent<PresenterSignalEnvelope>(PRESENTER_SIGNAL_EVENT, {
      detail: envelope,
    })
  )
}

export function relayPresenterSignalToBrowser(envelope: PresenterSignalEnvelope): void {
  if (typeof window === "undefined") return

  const channelKey =
    envelope.kind === "program-source"
      ? `jupiter:program-source:${envelope.sessionId}`
      : `jupiter:presenter-next:${envelope.sessionId}`

  try {
    window.localStorage.setItem(channelKey, JSON.stringify(envelope.payload))
    const channel = new BroadcastChannel(channelKey)
    channel.postMessage(envelope.payload)
    channel.close()
  } catch {
    // The LiveKit message has already arrived; storage is only the local UI relay.
  }
}
