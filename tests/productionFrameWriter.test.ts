import test from 'node:test'
import assert from 'node:assert/strict'
import { BoundedFrameWriter } from '../tools/production-local/runtime/frame-writer.js'
const tick = () => new Promise(resolve => setTimeout(resolve, 0))
function frame(id: number) { return { id, closed: false, close() { this.closed = true } } }
test('explicit frames retain order; pending old-authority frames are fenced and released', async () => {
  let release: () => void = () => {}, generation = 1
  const seen: number[] = [], errors: unknown[] = []
  const writer = new BoundedFrameWriter<number>({ write: async f => { seen.push((f as ReturnType<typeof frame>).id); if (seen.length === 1) await new Promise<void>(resolve => { release = resolve }) }, abort: async () => {} }, g => g === generation, error => errors.push(error))
  const a = frame(1), b = frame(2), c = frame(3)
  writer.enqueue(a, 1); writer.enqueue(b, 1); generation = 2; writer.enqueue(c, 2)
  assert.equal(b.closed, true); release(); await tick()
  assert.deepEqual(seen, [1, 3]); assert.ok(a.closed && c.closed); assert.equal(writer.counters().fenced, 1); assert.deepEqual(errors, [])
  writer.stop(); const d = frame(4); writer.enqueue(d, 2); assert.equal(d.closed, true)
})
test('a blocked writer fails closed on its deadline and releases queued frames', async () => {
  const errors: unknown[] = [], a = frame(1), b = frame(2)
  const writer = new BoundedFrameWriter({ write: () => new Promise(() => {}), abort: async () => {} }, () => true, error => errors.push(error), { deadlineMs: 10 })
  writer.enqueue(a, 1); writer.enqueue(b, 1); await new Promise(resolve => setTimeout(resolve, 30))
  assert.equal(errors.length, 1); assert.match(String(errors[0]), /deadline/); assert.ok(a.closed && b.closed)
})
test('frame backlog is bounded; overflow stops rather than silently dropping valid pictures', () => {
  const errors: unknown[] = [], frames = [frame(1), frame(2), frame(3)]
  const writer = new BoundedFrameWriter({ write: () => new Promise(() => {}), abort: async () => {} }, () => true, error => errors.push(error), { limit: 2, deadlineMs: 10 })
  for (const f of frames) writer.enqueue(f, 1)
  assert.equal(errors.length, 1); assert.match(String(errors[0]), /backlog/); assert.ok(frames[1].closed && frames[2].closed); assert.equal(writer.counters().maxPending, 2)
})
