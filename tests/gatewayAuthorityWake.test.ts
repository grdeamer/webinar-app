import assert from 'node:assert/strict'
import test from 'node:test'
import { createRefreshPoll } from '../tools/production-local/runtime/refresh-poll.js'

test('critical revision wake during an in-flight read gets one immediate trailing read, without overlap', async () => {
  let calls=0,active=0,maxActive=0,release:()=>void=()=>{}
  const gate=new Promise<void>(resolve=>{release=resolve})
  const read=createRefreshPoll(async()=>{calls++;active++;maxActive=Math.max(maxActive,active);if(calls===1)await gate;active--})
  const first=read.poll();await read.poll();await read.poll(true);await read.poll(true)
  assert.equal(calls,1);release();await first;await Promise.resolve();await Promise.resolve()
  assert.equal(calls,2);assert.equal(maxActive,1);read.stop()
})
test('stopping while a critical wake is queued prevents further reads',async()=>{
  let calls=0,release:()=>void=()=>{}
  const gate=new Promise<void>(resolve=>{release=resolve})
  const read=createRefreshPoll(async()=>{calls++;await gate}),first=read.poll()
  await read.poll(true);read.stop();release();await first;await Promise.resolve();await read.poll(true)
  assert.equal(calls,1)
})
