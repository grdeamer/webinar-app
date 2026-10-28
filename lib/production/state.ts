import { ProductionError, type AudioMix, type BroadcastScope, type Composition, type ProductionBus, type ProductionCommand, type ProductionState } from "./contracts.ts"

export function emptyBus(): ProductionBus {
  return { composition: { sceneId: null, layers: [] }, audio: { masterGainDb: -6, muted: false, channels: [] }, playback: {} }
}

export function initialProductionState(scope: BroadcastScope, nowMs: number): ProductionState {
  return { schemaVersion: 1, scope: structuredClone(scope), revision: 0, preview: emptyBus(), program: emptyBus(), sources: {}, bindings: {}, bindingGenerations: {}, scenes: {}, desiredLifecycle: "off-air", transition: null, updatedAtMs: nowMs }
}

export function scopesMatch(a: BroadcastScope, b: BroadcastScope): boolean {
  return a.broadcastId === b.broadcastId && a.eventId === b.eventId && a.sessionId === b.sessionId
}

function requireSource(state: ProductionState, sourceId: string): void {
  if (!Object.hasOwn(state.sources, sourceId)) throw new ProductionError("SOURCE_NOT_FOUND", `Unknown source: ${sourceId}`)
}

function validateCompositionSources(state: ProductionState, composition: Composition): void {
  for (const layer of composition.layers) {
    if (layer.sourceId) requireSource(state, layer.sourceId)
    if (layer.kind === "camera" || layer.kind === "screen") {
      if (layer.sourceId && state.sources[layer.sourceId]?.kind !== layer.kind) {
        throw new ProductionError("INVALID_COMMAND", "Live layers need a matching logical source")
      }
    }
  }
}

function validateAudioSources(state: ProductionState, audio: AudioMix): void {
  for (const channel of audio.channels) requireSource(state, channel.sourceId)
}

/** Pure state transition, called inside the store's atomic command transaction. */
export function applyProductionCommand(current: ProductionState, command: ProductionCommand, nowMs: number): ProductionState {
  const state = structuredClone(current)
  switch (command.type) {
    case "REGISTER_SOURCE":
      if (Object.hasOwn(state.sources, command.source.sourceId)) throw new ProductionError("INVALID_COMMAND", "Source is already registered")
      if (Object.keys(state.sources).length >= 200) throw new ProductionError("INVALID_COMMAND", "Source limit reached")
      state.sources[command.source.sourceId] = structuredClone(command.source)
      state.bindings[command.source.sourceId] = null
      state.bindingGenerations[command.source.sourceId] = 0
      break
    case "BIND_SOURCE": {
      requireSource(state, command.sourceId)
      const generation = state.bindingGenerations[command.sourceId] + 1
      state.bindingGenerations[command.sourceId] = generation
      state.bindings[command.sourceId] = { participantIdentity: command.participantIdentity, trackSid: command.trackSid, generation, boundAtMs: nowMs }
      break
    }
    case "UNBIND_SOURCE":
      requireSource(state, command.sourceId)
      if (state.bindings[command.sourceId]?.generation !== command.expectedGeneration) throw new ProductionError("BINDING_CONFLICT", "A replacement source is already bound")
      state.bindings[command.sourceId] = null
      break
    case "SET_PREVIEW":
      validateCompositionSources(state, command.composition)
      state.preview.composition = structuredClone(command.composition)
      state.preview.playback = {}
      break
    case "TAKE":
      validateCompositionSources(state, state.preview.composition)
      validateAudioSources(state, state.preview.audio)
      // Same Preview -> Program commit semantics as producer_take; never auto-go-live.
      state.transition = { ...command.transition, startedAtMs: nowMs, from: structuredClone(state.program), toRevision: state.revision + 1 }
      state.program = structuredClone(state.preview)
      break
    case "SET_AUDIO":
      validateAudioSources(state, command.audio)
      state[command.bus].audio = structuredClone(command.audio)
      break
    case "SET_PLAYBACK": {
      const layer = state[command.bus].composition.layers.find(item => item.id === command.layerId)
      if (!layer || !["video", "audio"].includes(layer.kind)) throw new ProductionError("INVALID_COMMAND", "Playback requires a video or audio layer")
      state[command.bus].playback[command.layerId] = { positionMs: command.positionMs, anchorTimeMs: nowMs, paused: command.paused, loop: command.loop }
      break
    }
    case "SAVE_SCENE": {
      const previous = state.scenes[command.sceneId]
      if ((previous?.version ?? null) !== command.expectedSceneVersion) throw new ProductionError("SCENE_CONFLICT", "Scene definition changed; reload before saving")
      if (!previous && Object.keys(state.scenes).length >= 200) throw new ProductionError("INVALID_COMMAND", "Scene limit reached")
      state.scenes[command.sceneId] = { sceneId: command.sceneId, name: command.name, version: (previous?.version ?? 0) + 1, composition: { ...structuredClone(state.preview.composition), sceneId: command.sceneId }, audio: structuredClone(state.preview.audio) }
      break
    }
    case "LOAD_SCENE": {
      const scene = state.scenes[command.sceneId]
      if (!scene || scene.version !== command.sceneVersion) throw new ProductionError("SCENE_CONFLICT", "Requested scene version is unavailable")
      state.preview = { composition: structuredClone(scene.composition), audio: structuredClone(scene.audio), playback: {} }
      break
    }
    case "SET_LIVE":
      state.desiredLifecycle = command.live ? "live" : "off-air"
      break
  }
  state.revision++
  state.updatedAtMs = nowMs
  return state
}
