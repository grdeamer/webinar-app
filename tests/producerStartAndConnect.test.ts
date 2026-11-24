import assert from 'node:assert/strict'
import test from 'node:test'
import { startAndConnect } from '../lib/producer/startAndConnect.ts'

function fixture() {
  let now = 1000, reads = 0, starts = 0, connections = 0
  const controller = new AbortController(), messages: string[] = []
  const port = {
    prepare: async () => { starts++; return {stopAtMs:1_801_000, recordingEnabled:false} },
    status: async () => { reads++; return {runtime:{running:reads >= 3, expiresAtMs:1_200_000, recordingEnabled:false}} },
    connect: async () => { connections++ }, now: () => now,
    wait: async () => { now += 2000 }, signal:controller.signal,
    progress: (message:string) => { messages.push(message) },
  }
  return {port, controller, counts:()=>({starts,reads,connections}), messages}
}

test('one explicit start waits through boot/status failures, then connects once without extending shutdown', async () => {
  const f=fixture(), status=f.port.status
  f.port.status=async()=>{const s=await status();if(f.counts().reads===1)throw Error('booting');return s}
  await startAndConnect(f.port)
  assert.deepEqual(f.counts(),{starts:1,reads:3,connections:1})
  assert.match(f.messages.at(-1)!,/TAKE will enable when Preview is ready/)
})

test('failed paid start cannot poll or connect or automatically retry',async()=>{
  const f=fixture();f.port.prepare=async()=>{throw Error('capacity unavailable')}
  await assert.rejects(startAndConnect(f.port),/capacity unavailable/)
  assert.deepEqual(f.counts(),{starts:0,reads:0,connections:0})
})

test('missing shutdown or recording enabled fails closed before connecting',async()=>{
  for(const unsafe of [{stopAtMs:0,recordingEnabled:false},{stopAtMs:1_801_000,recordingEnabled:true}]){
    const f=fixture();f.port.prepare=async()=>unsafe
    await assert.rejects(startAndConnect(f.port),/not confirmed/)
    assert.equal(f.counts().connections,0)
  }
  const f=fixture();f.port.status=async()=>({runtime:{running:true,expiresAtMs:1_200_000,recordingEnabled:true}})
  await assert.rejects(startAndConnect(f.port),/Recording must be off/)
  assert.equal(f.counts().connections,0)
})

test('cancellation during boot prevents a late connection',async()=>{
  const f=fixture();f.port.wait=async()=>{f.controller.abort()}
  await assert.rejects(startAndConnect(f.port),{name:'AbortError'})
  assert.deepEqual(f.counts(),{starts:1,reads:1,connections:0})
})

test('readiness timeout does not restart and respects the existing near-term shutdown',async()=>{
  const f=fixture();f.port.prepare=async()=>({stopAtMs:14_000,recordingEnabled:false})
  f.port.status=async()=>({runtime:{running:false,expiresAtMs:1_200_000,recordingEnabled:false}})
  await assert.rejects(startAndConnect(f.port),/startup timed out/)
  assert.equal(f.counts().connections,0)
  assert.ok(f.port.now()<14_000)
})

test('one click waits for the old shutdown to clear before starting EC2', async () => {
  const f = fixture()
  const prepare = f.port.prepare
  let infrastructureReads = 0
  await startAndConnect({
    ...f.port,
    prepare: async () => infrastructureReads === 0
      ? { code: 'shutdown_pending', stopAtMs: 2_000 }
      : prepare(),
    infrastructure: async () => ({
      state: 'stopped',
      stopAtMs: ++infrastructureReads === 1 ? 2_000 : null,
    }),
  })
  assert.equal(infrastructureReads, 2)
  assert.deepEqual(f.counts(), { starts: 1, reads: 3, connections: 1 })
  assert.ok(f.messages.some(message => message.includes('Previous automatic shutdown in 1s')))
})
