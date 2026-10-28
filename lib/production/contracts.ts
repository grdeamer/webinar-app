/** Phase 1 contract. Desired state is not proof that media is on air. */
export const PRODUCTION_SCHEMA_VERSION = 1 as const

export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue }
export type JsonObject = { [key: string]: JsonValue }

export type BroadcastScope = {
  broadcastId: string
  eventId: string
  sessionId: string | null
}

export type ProductionSource = {
  sourceId: string
  label: string
  kind: "camera" | "screen" | "media" | "audio"
  fallback: "slate" | "hold-last"
}

/** Ephemeral publications are bindings, never scene/source identifiers. */
export type SourceBinding = {
  participantIdentity: string
  trackSid: string
  generation: number
  boundAtMs: number
} | null

export type ProductionLayer = {
  id: string
  kind: "camera" | "screen" | "video" | "image" | "text" | "pdf" | "audio"
  sourceId: string | null
  props: JsonObject
}

export type Composition = { sceneId: string | null; layers: ProductionLayer[] }
export type AudioMix = {
  masterGainDb: number
  muted: boolean
  channels: { sourceId: string; gainDb: number; muted: boolean; solo: boolean }[]
}

export type PlaybackIntent = {
  positionMs: number
  anchorTimeMs: number
  paused: boolean
  loop: boolean
}

export type ProductionBus = {
  composition: Composition
  audio: AudioMix
  playback: Record<string, PlaybackIntent>
}

/** Saved definitions exclude connection bindings, live state and running clocks. */
export type SceneDefinition = {
  sceneId: string
  name: string
  version: number
  composition: Composition
  audio: AudioMix
}

export type ProductionState = {
  schemaVersion: typeof PRODUCTION_SCHEMA_VERSION
  scope: BroadcastScope
  revision: number
  preview: ProductionBus
  program: ProductionBus
  sources: Record<string, ProductionSource>
  bindings: Record<string, SourceBinding>
  bindingGenerations: Record<string, number>
  scenes: Record<string, SceneDefinition>
  desiredLifecycle: "off-air" | "live"
  transition: {
    type: "cut" | "fade" | "warp" | "curtain"
    durationMs: number
    startedAtMs: number
    from: ProductionBus
    toRevision: number
  } | null
  updatedAtMs: number
}

/** Future engine reports. Producers cannot create these acknowledgements. */
export type EngineObservation = {
  broadcastId: string
  generation: number
  appliedRevision: number | null
  observedRevision: number | null
  heartbeatAtMs: number
  videoFramesSent: number
  audioSamplesSent: number | null
  status: "starting" | "healthy" | "degraded" | "stopped"
}

export type ProductionCommand =
  | { type: "REGISTER_SOURCE"; source: ProductionSource }
  | { type: "BIND_SOURCE"; sourceId: string; participantIdentity: string; trackSid: string }
  | { type: "UNBIND_SOURCE"; sourceId: string; expectedGeneration: number }
  | { type: "SET_PREVIEW"; composition: Composition }
  | { type: "TAKE"; transition: { type: "cut" | "fade" | "warp" | "curtain"; durationMs: number } }
  | { type: "SET_AUDIO"; bus: "preview" | "program"; audio: AudioMix }
  | { type: "SET_PLAYBACK"; bus: "preview" | "program"; layerId: string; positionMs: number; paused: boolean; loop: boolean }
  | { type: "SAVE_SCENE"; sceneId: string; name: string; expectedSceneVersion: number | null }
  | { type: "LOAD_SCENE"; sceneId: string; sceneVersion: number }
  | { type: "SET_LIVE"; live: boolean }

export type CommandRequest = {
  schemaVersion: typeof PRODUCTION_SCHEMA_VERSION
  scope: BroadcastScope
  commandId: string
  expectedRevision: number
  command: ProductionCommand
}

/** Supplied by a trusted boundary, never accepted from a command payload. */
export type CommandActor = { actorId: string; scope: BroadcastScope }

export type CommandReceipt = {
  commandId: string
  actorId: string
  expectedRevision: number
  revision: number
  committedAtMs: number
  command: ProductionCommand
  fingerprint: string
}

export type CommitResult = {
  receipt: CommandReceipt
  currentState: ProductionState
  replayed: boolean
  engine: EngineObservation | null
}

/** Remote-capable boundary: a Postgres RPC adapter can implement this asynchronously. */
export interface ProductionCommandGateway {
  read(scope: BroadcastScope, actor: CommandActor): Promise<{ state: ProductionState; engine: EngineObservation | null }>
  commit(input: unknown, actor: CommandActor): Promise<CommitResult>
  commands(scope: BroadcastScope, actor: CommandActor, afterRevision?: number, limit?: number): Promise<CommandReceipt[]>
}

export type ProductionErrorCode = "INVALID_COMMAND" | "SCOPE_MISMATCH" | "REVISION_CONFLICT" |
  "COMMAND_ID_REUSED" | "SOURCE_NOT_FOUND" | "SCENE_CONFLICT" | "BINDING_CONFLICT" | "NOT_FOUND"

export class ProductionError extends Error {
  code: ProductionErrorCode
  constructor(code: ProductionErrorCode, message: string) {
    super(message)
    this.name = "ProductionError"
    this.code = code
  }
}
