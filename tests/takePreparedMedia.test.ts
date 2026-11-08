import assert from 'node:assert/strict'
import test from 'node:test'
import { takePreparedMedia } from '../lib/producer/takePreparedMedia.ts'

function file(options: { ended?: boolean; paused?: boolean } = {}) {
  let plays = 0
  const element = { ended: options.ended ?? false, paused: options.paused ?? false, loop: true,
    get currentTime() { return 17 }, set currentTime(_value: number) { throw Error('TAKE must not seek') },
    async play() { plays++; this.paused = false },
  }
  return { element, plays: () => plays }
}
test('TAKE preserves warm video playhead and does not wait on play for playing files', async () => {
  const a = file(), b = file()
  await takePreparedMedia([{element:a.element,loop:true},{element:b.element,loop:false}])
  assert.equal(a.element.currentTime,17); assert.equal(a.plays(),0); assert.equal(b.plays(),0)
  assert.equal(a.element.loop,true); assert.equal(b.element.loop,false)
})
test('ended input rejects before another canvas input is changed', async () => {
  const a = file({paused:true}), b = file({ended:true})
  await assert.rejects(takePreparedMedia([{element:a.element,loop:false},{element:b.element,loop:false}]),/finished/)
  assert.equal(a.element.loop,true); assert.equal(a.plays(),0)
})
test('paused prepared input resumes without seeking', async () => {
  const a = file({paused:true})
  await takePreparedMedia([{element:a.element,loop:true}]); assert.equal(a.plays(),1)
})
