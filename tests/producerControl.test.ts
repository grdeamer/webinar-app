import assert from "node:assert/strict"
import test from "node:test"

import {
  PRODUCER_MAX_BLOCKS,
  egressStatusLabel,
  isProducerCompositionTooLarge,
  isProducerConcurrencyError,
  isTerminalEgressStatus,
  normalizeProducerBlocks,
  parseExpectedProducerVersion,
} from "../lib/live/producerControl.ts"

test("producer compositions reject non-arrays and cap block count", () => {
  assert.equal(normalizeProducerBlocks({}), null)
  const blocks = Array.from({ length: PRODUCER_MAX_BLOCKS + 10 }, (_, id) => ({ id }))
  assert.equal(normalizeProducerBlocks(blocks)?.length, PRODUCER_MAX_BLOCKS)
})

test("producer composition size uses UTF-8 bytes", () => {
  assert.equal(isProducerCompositionTooLarge([{ label: "Jupiter" }]), false)
  assert.equal(isProducerCompositionTooLarge([{ label: "🪐".repeat(600_000) }]), true)
})

test("expected versions accept only non-negative safe integers", () => {
  assert.equal(parseExpectedProducerVersion(7), 7)
  assert.equal(parseExpectedProducerVersion("8"), 8)
  assert.equal(parseExpectedProducerVersion(null), null)
  assert.equal(parseExpectedProducerVersion(-1), null)
  assert.equal(parseExpectedProducerVersion(1.5), null)
})

test("database serialization conflicts are surfaced as operator conflicts", () => {
  assert.equal(isProducerConcurrencyError({ code: "40001" }), true)
  assert.equal(
    isProducerConcurrencyError({ message: "Preview changed on another console" }),
    true
  )
  assert.equal(isProducerConcurrencyError({ code: "23505", message: "duplicate" }), false)
})

test("LiveKit egress states distinguish active and terminal states", () => {
  assert.equal(egressStatusLabel(1), "active")
  assert.equal(egressStatusLabel(3), "complete")
  assert.equal(isTerminalEgressStatus(2), false)
  assert.equal(isTerminalEgressStatus(3), true)
  assert.equal(isTerminalEgressStatus(6), true)
})
