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
