import { ProductionError, type Composition } from "./contracts.ts"
import { jsonValue, object, parseComposition } from "./validation.ts"

/** Read-only import: preserves visual props; requires explicit durable source IDs. */
export function importLegacyComposition(blocks: unknown[], sourceIds: Record<string, string>, sceneId: string | null = null): Composition {
  return parseComposition({
    sceneId,
    layers: blocks.map(item => {
      const block = object(item)
      const { id, type, assignedParticipantId, ...visual } = block
      delete visual.assignedTrackSid
      let sourceId: string | null = null
      if (assignedParticipantId !== null && assignedParticipantId !== undefined) {
        if (typeof assignedParticipantId !== "string" || !Object.hasOwn(sourceIds, assignedParticipantId)) {
          throw new ProductionError("INVALID_COMMAND", "Legacy participant needs an explicit logical source mapping")
        }
        sourceId = sourceIds[assignedParticipantId]
      }
      // JSON serialization removes optional undefined props without losing styles.
      const props = jsonValue(JSON.parse(JSON.stringify(visual)))
      return { id, kind: type === "camera-slot" ? "camera" : type, sourceId, props }
    }),
  })
}
