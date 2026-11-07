import assert from 'node:assert/strict'
import test from 'node:test'
import {assertPreparedPreview,preparedProgramConfirmed} from '../lib/producer/preparedProgramTake.ts'
import {libraryEngineComposition} from '../lib/producer/libraryEngineComposition.ts'
import type {PreviewBlock} from '../app/admin/events/[id]/producer/useProducerBlocks.ts'
const block={id:'canvas',type:'video',x:0,y:0,width:640,height:360} as PreviewBlock
const blue=libraryEngineComposition(block,'camera-a','library-blue'),old=libraryEngineComposition(block,'camera-a','library-orange')
const receipt={runId:'current',revision:12,key:'blue-canvas',composition:blue}
test('a different prepared canvas is rejected even when it reuses the same input and geometry',()=>{
 assert.doesNotThrow(()=>assertPreparedPreview({runtime:{runId:'current'},state:{preview:{composition:blue}}},'current',blue))
 assert.throws(()=>assertPreparedPreview({runtime:{runId:'current'},state:{preview:{composition:old}}},'current',blue),/Preview changed/)
 assert.throws(()=>assertPreparedPreview({runtime:{runId:'replacement'},state:{preview:{composition:blue}}},'current',blue),/Preview changed/)
})
test('accepted TAKE and saved room blocks alone cannot label Program matched',()=>{
 const now=100000,status={runtime:{runId:'current',running:true,observer:{atMs:now,lastGoodAtMs:now,revision:12,selectionMismatches:0,width:1920,height:1080}},state:{desiredLifecycle:'live',program:{composition:blue}}}
 assert.equal(preparedProgramConfirmed(status,receipt,now),true)
 for(const change of [{revision:11},{atMs:now-3000},{lastGoodAtMs:now-3000},{selectionMismatches:1},{width:1280}])assert.equal(preparedProgramConfirmed({...status,runtime:{...status.runtime,observer:{...status.runtime.observer,...change}}},receipt,now),false)
 assert.equal(preparedProgramConfirmed({...status,state:{...status.state,program:{composition:old}}},receipt,now),false)
 assert.equal(preparedProgramConfirmed({...status,runtime:{...status.runtime,runId:'other'}},receipt,now),false)
 assert.equal(preparedProgramConfirmed({...status,state:{...status.state,desiredLifecycle:'idle'}},receipt,now),false)
})

test('fast TAKE uses only a recent status with current runtime, exact cue and fresh dual decoder evidence',async()=>{
 const {freshPreparedTakeStatus}=await import('../lib/producer/preparedProgramTake.ts')
 const now=100000,sid='TR-current'
 const status={runtime:{runId:'current',running:true,expiresAtMs:now+10000,sourceReceiveMedia:{'source-a':{trackSid:sid,generation:2,atMs:now-100}},candidateMedia:Object.fromEntries(['primary','standby'].map(id=>[id,{atMs:now-100,inputTrackSids:{'source-camera-a':sid},inputFrames:{'source-camera-a':10}}]))},state:{revision:12,preview:{composition:blue},bindings:{'camera-a':{trackSid:sid,generation:2}}}}
 assert.equal(freshPreparedTakeStatus(status,now-500,'current',blue,'source-a',sid,now),true)
 for(const at of [now-1000,now+1])assert.equal(freshPreparedTakeStatus(status,at,'current',blue,'source-a',sid,now),false)
 assert.equal(freshPreparedTakeStatus(status,now,'replacement',blue,'source-a',sid,now),false)
 assert.equal(freshPreparedTakeStatus(status,now,'current',old,'source-a',sid,now),false)
 assert.equal(freshPreparedTakeStatus(status,now,'current',blue,'source-a','TR-replacement',now),false)
 const stale=structuredClone(status);stale.runtime.candidateMedia.standby.atMs=now-2600
 assert.equal(freshPreparedTakeStatus(stale,now,'current',blue,'source-a',sid,now),false)
 const expired=structuredClone(status);expired.runtime.expiresAtMs=now
 assert.equal(freshPreparedTakeStatus(expired,now,'current',blue,'source-a',sid,now),false)
})
