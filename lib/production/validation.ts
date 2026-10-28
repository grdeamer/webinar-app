import { PRODUCER_MAX_BLOCKS, PRODUCER_MAX_COMPOSITION_BYTES } from "../live/producerControl.ts"
import { ProductionError, type AudioMix, type BroadcastScope, type CommandRequest, type Composition, type JsonObject, type JsonValue, type ProductionCommand } from "./contracts.ts"

function invalid(message: string): never { throw new ProductionError("INVALID_COMMAND", message) }

export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid("Expected an object")
  if (![Object.prototype, null].includes(Object.getPrototypeOf(value))) invalid("Expected a plain JSON object")
  return value as Record<string, unknown>
}

function keys(value: Record<string, unknown>, names: string[]): void {
  if (Object.keys(value).some(key => !names.includes(key))) invalid("Unknown command fields")
}

export function identifier(value: unknown): string {
  if (typeof value !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,127}$/.test(value) ||
    Object.hasOwn(Object.prototype, value) || value === "prototype") invalid("Invalid identifier")
  return value
}

function label(value: unknown): string {
  if (typeof value !== "string" || !value.trim() || value.length > 200) invalid("Invalid label")
  return value.trim()
}

function mediaIdentifier(value: unknown): string {
  if (typeof value !== "string" || !value.trim() || value.length > 512 || /[\u0000-\u001f]/.test(value)) invalid("Invalid media identifier")
  return value
}

function number(value: unknown, min: number, max = Number.MAX_SAFE_INTEGER): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) invalid("Number outside permitted range")
  return value
}

export function revision(value: unknown): number {
  const parsed = number(value, 0, Number.MAX_SAFE_INTEGER - 1)
  if (!Number.isSafeInteger(parsed)) invalid("A safe integer revision is required")
  return parsed
}

function bool(value: unknown): boolean {
  if (typeof value !== "boolean") invalid("Expected a boolean")
  return value
}

function choice<T extends string>(value: unknown, values: readonly T[]): T {
  if (typeof value !== "string" || !values.includes(value as T)) invalid("Unsupported option")
  return value as T
}

function array(value: unknown, max = PRODUCER_MAX_BLOCKS): unknown[] {
  if (!Array.isArray(value) || value.length > max) invalid("Invalid or oversized list")
  return value
}

export function jsonValue(value: unknown, depth = 0): JsonValue {
  if (depth > 12) invalid("JSON is too deeply nested")
  if (value === null) return null
  if (typeof value === "string" || typeof value === "boolean") return value
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (Array.isArray(value)) return value.map(item => jsonValue(item, depth + 1))
  const record = object(value)
  const result: JsonObject = {}
  for (const [key, item] of Object.entries(record)) {
    if (["__proto__", "constructor", "prototype"].includes(key)) invalid("Unsafe object key")
    result[key] = jsonValue(item, depth + 1)
  }
  return result
}

export function parseScope(value: unknown): BroadcastScope {
  const x = object(value); keys(x, ["broadcastId", "eventId", "sessionId"])
  return { broadcastId: identifier(x.broadcastId), eventId: identifier(x.eventId), sessionId: x.sessionId === null ? null : identifier(x.sessionId) }
}

export function parseComposition(value: unknown): Composition {
  const x = object(value); keys(x, ["sceneId", "layers"])
  const layers = array(x.layers).map(item => {
    const layer = object(item); keys(layer, ["id", "kind", "sourceId", "props"])
    const props = jsonValue(object(layer.props)) as JsonObject
    if (typeof props.src === "string" && /^(blob:|data:)/i.test(props.src.trim())) invalid("Local object URLs cannot be durable media assets")
    return {
      id: identifier(layer.id),
      kind: choice(layer.kind, ["camera", "screen", "video", "image", "text", "pdf", "audio"] as const),
      sourceId: layer.sourceId === null ? null : identifier(layer.sourceId), props,
    }
  })
  if (new Set(layers.map(layer => layer.id)).size !== layers.length) invalid("Duplicate layer identifiers")
  return { sceneId: x.sceneId === null ? null : identifier(x.sceneId), layers }
}

export function parseAudio(value: unknown): AudioMix {
  const x = object(value); keys(x, ["masterGainDb", "muted", "channels"])
  const channels = array(x.channels).map(item => {
    const channel = object(item); keys(channel, ["sourceId", "gainDb", "muted", "solo"])
    return { sourceId: identifier(channel.sourceId), gainDb: number(channel.gainDb, -96, 12), muted: bool(channel.muted), solo: bool(channel.solo) }
  })
  if (new Set(channels.map(channel => channel.sourceId)).size !== channels.length) invalid("Duplicate audio channels")
  return { masterGainDb: number(x.masterGainDb, -96, 12), muted: bool(x.muted), channels }
}

function parseCommand(value: unknown): ProductionCommand {
  const x = object(value)
  switch (x.type) {
    case "REGISTER_SOURCE": {
      keys(x, ["type", "source"])
      const source = object(x.source); keys(source, ["sourceId", "label", "kind", "fallback"])
      return { type: x.type, source: { sourceId: identifier(source.sourceId), label: label(source.label), kind: choice(source.kind, ["camera", "screen", "media", "audio"] as const), fallback: choice(source.fallback, ["slate", "hold-last"] as const) } }
    }
    case "BIND_SOURCE":
      keys(x, ["type", "sourceId", "participantIdentity", "trackSid"])
      return { type: x.type, sourceId: identifier(x.sourceId), participantIdentity: mediaIdentifier(x.participantIdentity), trackSid: mediaIdentifier(x.trackSid) }
    case "UNBIND_SOURCE":
      keys(x, ["type", "sourceId", "expectedGeneration"])
      return { type: x.type, sourceId: identifier(x.sourceId), expectedGeneration: revision(x.expectedGeneration) }
    case "SET_PREVIEW":
      keys(x, ["type", "composition"])
      return { type: x.type, composition: parseComposition(x.composition) }
    case "TAKE": {
      keys(x, ["type", "transition"])
      const transition = object(x.transition); keys(transition, ["type", "durationMs"])
      const type = choice(transition.type, ["cut", "fade", "warp", "curtain"] as const)
      const durationMs = number(transition.durationMs, type === "cut" ? 0 : 200, type === "cut" ? 0 : 2500)
      return { type: x.type, transition: { type, durationMs } }
    }
    case "SET_AUDIO":
      keys(x, ["type", "bus", "audio"])
      return { type: x.type, bus: choice(x.bus, ["preview", "program"] as const), audio: parseAudio(x.audio) }
    case "SET_PLAYBACK":
      keys(x, ["type", "bus", "layerId", "positionMs", "paused", "loop"])
      return { type: x.type, bus: choice(x.bus, ["preview", "program"] as const), layerId: identifier(x.layerId), positionMs: number(x.positionMs, 0), paused: bool(x.paused), loop: bool(x.loop) }
    case "SAVE_SCENE":
      keys(x, ["type", "sceneId", "name", "expectedSceneVersion"])
      return { type: x.type, sceneId: identifier(x.sceneId), name: label(x.name), expectedSceneVersion: x.expectedSceneVersion === null ? null : revision(x.expectedSceneVersion) }
    case "LOAD_SCENE":
      keys(x, ["type", "sceneId", "sceneVersion"])
      return { type: x.type, sceneId: identifier(x.sceneId), sceneVersion: revision(x.sceneVersion) }
    case "SET_LIVE":
      keys(x, ["type", "live"])
      return { type: x.type, live: bool(x.live) }
    default: return invalid("Unsupported production command")
  }
}

export function parseCommandRequest(value: unknown): CommandRequest {
  let encoded: string
  try { encoded = JSON.stringify(value) } catch { return invalid("Command must be JSON") }
  if (!encoded || new TextEncoder().encode(encoded).byteLength > PRODUCER_MAX_COMPOSITION_BYTES) invalid("Command exceeds size limit")
  const x = object(value); keys(x, ["schemaVersion", "scope", "commandId", "expectedRevision", "command"])
  if (x.schemaVersion !== 1) invalid("Unsupported production schema version")
  return { schemaVersion: 1, scope: parseScope(x.scope), commandId: identifier(x.commandId), expectedRevision: revision(x.expectedRevision), command: parseCommand(x.command) }
}
