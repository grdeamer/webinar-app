import assert from 'node:assert/strict'
import test from 'node:test'
import {bindProgramMonitor,clearProgramMonitor,type ProgramMonitorBinding} from '../lib/producer/programMonitor.ts'

test('switching workspace tabs keeps the same Program stream; disconnect clears it rather than replaying stale output',()=>{
 const stream={} as MediaStream
 const first={srcObject:stream,play:async()=>{}} as HTMLVideoElement
 const next={srcObject:null,play:async()=>{}} as HTMLVideoElement
 const binding:ProgramMonitorBinding={element:first,stream:null}
 bindProgramMonitor(binding,null)
 assert.equal(first.srcObject,null)
 bindProgramMonitor(binding,next)
 assert.equal(next.srcObject,stream)
 clearProgramMonitor(binding)
 assert.equal(next.srcObject,null)
 bindProgramMonitor(binding,null)
 bindProgramMonitor(binding,first)
 assert.equal(first.srcObject,null)
 // A new monitor after disconnect must not recover a stale stream.
 const fresh={srcObject:null,play:async()=>{}} as HTMLVideoElement
 clearProgramMonitor(binding)
 bindProgramMonitor(binding,fresh)
 assert.equal(fresh.srcObject,null)
})
