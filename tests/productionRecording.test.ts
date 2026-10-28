import assert from "node:assert/strict"
import test from "node:test"
import { appendFileSync, mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { LocalProgramRecording } from "../lib/production/localRecording.ts"

test("local Program recordings are opt-in, ordered and downloadable only after completion", t => {
  const dir = mkdtempSync(join(tmpdir(), "jupiter-recording-")); t.after(() => rmSync(dir, { recursive: true, force: true }))
  const recording = new LocalProgramRecording(dir)
  assert.equal(recording.job, null)
  const job = recording.start(1000)
  assert.throws(() => recording.downloadable(job.id), /complete/)
  assert.throws(() => recording.append(job.id, 1, Buffer.from("wrong"), 1500), /Unexpected/)
  assert.throws(() => recording.append("../../escape", 0, Buffer.from("wrong"), 1500), /Unexpected/)
  recording.append(job.id, 0, Buffer.from("first"), 1500)
  recording.append(job.id, 1, Buffer.from("second"), 2000)
  recording.finish(job.id, 2100)
  assert.equal(readFileSync(recording.downloadable(job.id), "utf8"), "firstsecond")
  assert.equal(recording.job?.status, "complete")
})

test('finished Program provenance persists revision evidence and fails on publication replacement', t => {
  const dir = mkdtempSync(join(tmpdir(), 'jupiter-recording-origin-')); t.after(() => rmSync(dir, { recursive: true, force: true }))
  const recording = new LocalProgramRecording(dir)
  const origin = { runId: 'local-run', broadcastId: 'local-broadcast', generation: 1, publisherIdentity: 'program-engine-1', videoTrackSid: 'TR_video', audioTrackSid: 'TR_audio', programRevision: 1, deliveryRevision: 2 }
  const job = recording.start(Date.now(), origin)
  recording.observe({ ...origin, decodedRevision: 1 }); recording.observe({ ...origin, decodedRevision: 2 }); recording.observe({ ...origin, decodedRevision: 2 })
  recording.append(job.id, 0, Buffer.from('finished Program')); recording.finish(job.id)
  const reopened = new LocalProgramRecording(dir)
  assert.deepEqual(reopened.job?.origin, origin); assert.deepEqual(reopened.job?.observedRevisions, [1, 2])
  reopened.start(Date.now(), origin)
  reopened.observe({ ...origin, generation: 2, videoTrackSid: 'TR_replacement', decodedRevision: 3 })
  assert.equal(reopened.job?.status, 'failed'); assert.match(reopened.job?.reason ?? '', /publication changed/)
  assert.equal(readFileSync(reopened.downloadable(job.id), 'utf8'), 'finished Program')
})

test('recording journals survive host restarts and fail interrupted or altered files closed', t => {
  const dir = mkdtempSync(join(tmpdir(), 'jupiter-recording-restart-')); t.after(() => rmSync(dir, { recursive: true, force: true }))
  const first = new LocalProgramRecording(dir), complete = first.start()
  first.append(complete.id, 0, Buffer.from('completed media')); first.finish(complete.id)
  const second = new LocalProgramRecording(dir)
  assert.equal(second.job?.status, 'complete'); assert.equal(readFileSync(second.downloadable(complete.id), 'utf8'), 'completed media')
  const interrupted = second.start(); second.append(interrupted.id, 0, Buffer.from('incomplete media'))
  const third = new LocalProgramRecording(dir)
  assert.equal(third.job?.status, 'failed'); assert.match(third.job?.reason ?? '', /interrupted/)
  assert.throws(() => third.downloadable(interrupted.id), /complete/)
  assert.equal(third.history.length, 2)
  appendFileSync(third.path(complete.id), 'tamper')
  assert.throws(() => third.downloadable(complete.id), /complete/)
  const fourth = new LocalProgramRecording(dir)
  assert.equal(fourth.history[0].status, 'failed')
})

test("expired recording uploads are failed rather than claimed complete", t => {
  const dir = mkdtempSync(join(tmpdir(), "jupiter-recording-")); t.after(() => rmSync(dir, { recursive: true, force: true }))
  const recording = new LocalProgramRecording(dir); const job = recording.start(1000)
  assert.throws(() => recording.append(job.id, 0, Buffer.from("late"), 187000), /limit/)
  assert.equal(recording.job?.status, "failed")
  assert.throws(() => recording.downloadable(job.id), /complete/)
})
