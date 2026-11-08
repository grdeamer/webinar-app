import assert from 'node:assert/strict'
import test from 'node:test'
import {observationPatch} from '../lib/zoom-bridge/observationWrites.ts'
const now=1800000000000
const stopped={status:'stopped',revision:'r1',camera:false}
test('unchanged stopped reports create zero writes regardless of stale controller time or JSON key order',()=>{
 const row={desired_running:false,observed:{camera:false,revision:'r1',status:'stopped'},last_seen:new Date(now-900000).toISOString()}
 for(let i=0;i<1800;i++)assert.equal(observationPatch(row,stopped,now+i*2000),null)
})
test('inactive transitions and source changes persist immediately, active heartbeats retain the two-second cadence',()=>{
 const row={desired_running:false,observed:{status:'joined'},last_seen:new Date(now).toISOString()}
 assert.deepEqual(observationPatch(row,stopped,now),{observed:stopped,last_seen:new Date(now).toISOString()})
 for(const desired_running of [false,true]){
  const observed={status:desired_running?'paused':'joined',revision:'r1'}
  const current={desired_running,observed,last_seen:new Date(now).toISOString()}
  assert.equal(observationPatch(current,observed,now+500),null)
  assert.deepEqual(observationPatch(current,observed,now+2000),{last_seen:new Date(now+2000).toISOString()})
 }
})
test('active state, media loss, revision and errors are never suppressed, and restart/clock anomalies renew safely',()=>{
 const row={desired_running:true,observed:{status:'joined',video:true},last_seen:new Date(now).toISOString()}
 for(const observed of [{status:'failed',error:'Worker stalled.'},{status:'joined',video:false},{status:'joined',video:true,revision:'next'}])assert.ok(observationPatch(row,observed,now+1)?.observed)
 for(const last_seen of [null,'invalid',new Date(now+1000).toISOString()])assert.ok(observationPatch({...row,last_seen},row.observed,now))
})
test('one simulated hour of three stopped satellites and a stopped source avoids 7200 redundant writes; active leases still write',()=>{
 const rows=Array.from({length:4},()=>({desired_running:false,observed:stopped,last_seen:new Date(now).toISOString()}))
 let writes=0
 for(let tick=1;tick<=1800;tick++)for(const row of rows)if(observationPatch(row,stopped,now+tick*2000))writes++
 assert.equal(writes,0)
 let activeWrites=0;let row:{desired_running:boolean;observed:Record<string,unknown>;last_seen:string|null}={...rows[0],desired_running:true}
 for(let tick=1;tick<=1800;tick++){const patch=observationPatch(row,stopped,now+tick*2000);if(patch){activeWrites++;row={...row,...patch}}}
 assert.equal(activeWrites,1800)
})
