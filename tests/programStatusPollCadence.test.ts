import assert from 'node:assert/strict'
import test from 'node:test'
import {programStatusPollMs} from '../lib/producer/statusPollCadence.ts'
test('steady matched Program falls back to UI cadence; pending TAKE and new cues keep fast confirmation',()=>{
 assert.equal(programStatusPollMs(false,'canvas-a','canvas-a'),1500)
 assert.equal(programStatusPollMs(false,null,null),1500)
 assert.equal(programStatusPollMs(false,'canvas-b','canvas-a'),250)
 assert.equal(programStatusPollMs(true,'canvas-a','canvas-a'),250)
 assert.equal(3600000/programStatusPollMs(false,'a','a'),2400)
})
