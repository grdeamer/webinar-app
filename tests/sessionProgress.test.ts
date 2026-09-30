import assert from 'node:assert/strict'
import test from 'node:test'
import { sessionProgress, timelineGroups } from '../lib/page-editor/sessionProgress.ts'
const session = { id: 'one', title: 'Welcome', start_at: '2026-09-30T11:00:00-04:00', end_at: '2026-09-30T12:00:00-04:00' }
const at = (time: string) => Date.parse(`2026-09-30T${time}:00-04:00`)
test('session progress follows elapsed time and clamps at boundaries', () => {
  assert.equal(sessionProgress(session, at('10:45')).fraction, 0)
  assert.equal(sessionProgress(session, at('11:00')).fraction, 0)
  assert.equal(sessionProgress(session, at('11:30')).fraction, .5)
  assert.equal(sessionProgress(session, at('11:30')).label, '30 min remaining')
  assert.equal(sessionProgress(session, at('12:00')).fraction, 1)
  assert.equal(sessionProgress({ ...session, status: 'live' }, at('12:15')).label, 'Over scheduled time')
})
test('milestones, cancelled and invalid sessions never divide by zero or advance', () => {
  assert.equal(sessionProgress({ ...session, end_at: session.start_at }, at('11:30')).label, 'Milestone')
  assert.equal(sessionProgress({ ...session, end_at: 'bad' }, at('11:30')).active, false)
  assert.equal(sessionProgress({ ...session, end_at: '2026-09-30T10:00:00-04:00' }, at('11:30')).fraction, 0)
  assert.equal(sessionProgress({ ...session, status: 'cancelled' }, at('11:30')).fraction, 0)
  assert.equal(sessionProgress({ ...session, status: 'complete' }, at('11:30')).fraction, 1)
})
test('track grouping preserves parallel sessions and filters without mutating source', () => {
  const input = [{ ...session, track: 'Main' }, { ...session, id: 'two', track: 'Clinical' }, { ...session, id: 'three', track: ' main ' }, { ...session, id: 'four' }]
  assert.deepEqual(timelineGroups(input).map(g => [g.name, g.items.length]), [['Main', 2], ['Clinical', 1], ['General', 1]])
  assert.equal(timelineGroups(input, 'MAIN')[0].items.length, 2)
  assert.equal(timelineGroups(input, 'missing').length, 0)
  assert.equal("track" in input[2] && input[2].track, ' main ')
})

test('timeline component settings survive serialization and normalization', async () => {
  const { normalizeEventPageSections } = await import('../lib/page-editor/normalizeEventPageSections.ts')
  const [section] = normalizeEventPageSections([{ id: 'timeline', type: 'system', config: {}, blocks: [{ id: 'block', type: 'system_component', props: { componentKey: 'live_timeline', timelineTrack: 'Clinical', showRemaining: false, accentColor: '#cc0000' } }] }])
  const block = section.blocks?.[0]
  assert.ok(block?.type === 'system_component')
  assert.equal(block.props.componentKey, 'live_timeline')
  assert.equal(block.props.timelineTrack, 'Clinical')
  assert.equal(block.props.showRemaining, false)
})
