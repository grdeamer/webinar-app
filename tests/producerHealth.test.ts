import assert from "node:assert/strict"
import test from "node:test"

import { getProducerHealthSnapshot } from "../app/admin/events/[id]/producer/producerHealthUtils.ts"
import type { ProducerParticipant, StageState } from "../app/admin/events/[id]/producer/producerRoomTypes.ts"
import type { PreviewBlock } from "../app/admin/events/[id]/producer/useProducerBlocks.ts"

function makeBlock(overrides: Partial<PreviewBlock> = {}): PreviewBlock {
  return {
    id: "source-1",
    type: "image",
    x: 0,
    y: 0,
    width: 640,
    height: 360,
    zIndex: 1,
    src: "/holding.jpg",
    ...overrides,
  }
}

function makeStage(overrides: Partial<StageState> = {}): StageState {
  return {
    event_id: "event-1",
    room_id: "room-1",
    is_live: false,
    auto_director_enabled: false,
    layout: "solo",
    stage_participant_ids: [],
    primary_participant_id: null,
    pinned_participant_id: null,
    screen_share_participant_id: null,
    screen_share_track_id: null,
    scene_version: 1,
    headline: null,
    message: null,
    updated_by: null,
    updated_at: "2026-08-15T12:00:00.000Z",
    ...overrides,
  }
}

function makeParticipant(overrides: Partial<ProducerParticipant> = {}): ProducerParticipant {
  return {
    identity: "presenter-1",
    name: "Presenter",
    joinedAt: "2026-08-15T12:00:00.000Z",
    state: "active",
    isPublisher: true,
    cameraEnabled: true,
    micEnabled: true,
    screenShareEnabled: false,
    tracks: [{ sid: "camera-1", name: "camera", source: "CAMERA" }],
    ...overrides,
  }
}

test("healthy transport and media permit TAKE", () => {
  const snapshot = getProducerHealthSnapshot({
    transportHealth: "connected",
    syncWarning: null,
    participants: [],
    previewState: makeStage(),
    programState: makeStage(),
    previewBlocks: [makeBlock()],
    programBlocks: [makeBlock()],
  })

  assert.equal(snapshot.overall, "healthy")
  assert.equal(snapshot.canTake, true)
  assert.equal(snapshot.takeBlockReason, null)
})

test("disconnected transport blocks TAKE without discarding Preview", () => {
  const previewBlocks = [makeBlock()]
  const snapshot = getProducerHealthSnapshot({
    transportHealth: "degraded",
    syncWarning: null,
    participants: [],
    previewState: makeStage(),
    programState: makeStage(),
    previewBlocks,
    programBlocks: [makeBlock()],
  })

  assert.equal(snapshot.canTake, false)
  assert.equal(snapshot.previewReady, true)
  assert.match(snapshot.takeBlockReason ?? "", /Reconnect/)
})

test("stale stage routes and unavailable camera slots block TAKE", () => {
  const disconnectedParticipant = makeParticipant({
    identity: "other-presenter",
  })
  const snapshot = getProducerHealthSnapshot({
    transportHealth: "connected",
    syncWarning: null,
    participants: [disconnectedParticipant],
    previewState: makeStage({ stage_participant_ids: ["presenter-1"] }),
    programState: makeStage(),
    previewBlocks: [
      makeBlock({
        type: "camera-slot",
        src: null,
        assignedParticipantId: "presenter-1",
      }),
    ],
    programBlocks: [makeBlock()],
  })

  assert.equal(snapshot.canTake, false)
  assert.equal(snapshot.stageReady, false)
  assert.equal(snapshot.issues.some((issue) => issue.id === "missing-stage-source"), true)
  assert.equal(snapshot.issues.some((issue) => issue.id === "camera-slot"), true)
})
