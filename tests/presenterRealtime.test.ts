import assert from "node:assert/strict"
import test from "node:test"
import {
  decodePresenterSignal,
  encodePresenterSignal,
  type PresenterSignalEnvelope,
} from "../lib/live/presenterRealtime.ts"

test("presenter realtime program source round-trips", () => {
  const signal: PresenterSignalEnvelope = {
    version: 1,
    kind: "program-source",
    sessionId: "session-1",
    payload: {
      mode: "cut",
      sourceType: "camera",
      participantIdentity: "speaker-1",
      screenShareParticipantIdentity: null,
      screenShareTrackId: null,
      layout: "single",
      isLive: true,
      updatedAt: 123,
    },
  }

  assert.deepEqual(decodePresenterSignal(encodePresenterSignal(signal)), signal)
})

test("presenter realtime next-content cue round-trips", () => {
  const signal: PresenterSignalEnvelope = {
    version: 1,
    kind: "next-content",
    sessionId: "session-2",
    payload: {
      type: "slide",
      title: "Keynote · Slide 4",
      mode: "preview",
      updatedAt: 456,
    },
  }

  assert.deepEqual(decodePresenterSignal(encodePresenterSignal(signal)), signal)
})

test("presenter realtime rejects malformed or unrelated data", () => {
  assert.equal(decodePresenterSignal(new TextEncoder().encode("not json")), null)
  assert.equal(
    decodePresenterSignal(
      new TextEncoder().encode(
        JSON.stringify({ version: 1, kind: "program-source", sessionId: "s", payload: {} })
      )
    ),
    null
  )
})
