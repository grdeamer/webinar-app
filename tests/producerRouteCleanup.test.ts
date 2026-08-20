import assert from "node:assert/strict"
import test from "node:test"

import {
  clearStaleCameraSlotAssignments,
  getStaleProducerRouteIds,
} from "../app/admin/events/[id]/producer/producerRouteCleanupUtils.ts"
import type { StageState } from "../app/admin/events/[id]/producer/producerRoomTypes.ts"
import type { PreviewBlock } from "../app/admin/events/[id]/producer/useProducerBlocks.ts"

const previewState = {
  stage_participant_ids: ["connected", "disconnected"],
} as StageState

test("finds disconnected stage and camera-slot routes without duplicating identities", () => {
  const blocks = [
    { id: "camera", type: "camera-slot", assignedParticipantId: "disconnected" },
    { id: "other-camera", type: "camera-slot", assignedParticipantId: "camera-only" },
  ] as PreviewBlock[]

  assert.deepEqual(
    getStaleProducerRouteIds({
      connectedParticipantIds: new Set(["connected"]),
      previewState,
      previewBlocks: blocks,
    }),
    ["disconnected", "camera-only"],
  )
})

test("clears only camera slots assigned to stale participants", () => {
  const blocks = [
    {
      id: "stale-camera",
      type: "camera-slot",
      assignedParticipantId: "disconnected",
      assignedTrackSid: "track-1",
      assignedParticipantAccent: "#38bdf8",
    },
    {
      id: "healthy-camera",
      type: "camera-slot",
      assignedParticipantId: "connected",
      assignedTrackSid: "track-2",
    },
  ] as PreviewBlock[]

  const cleaned = clearStaleCameraSlotAssignments(blocks, new Set(["disconnected"]))

  assert.equal(cleaned[0]?.assignedParticipantId, null)
  assert.equal(cleaned[0]?.assignedTrackSid, null)
  assert.equal(cleaned[0]?.assignedParticipantAccent, null)
  assert.equal(cleaned[1]?.assignedParticipantId, "connected")
})
