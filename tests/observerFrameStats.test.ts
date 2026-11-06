import test from 'node:test'
import assert from 'node:assert/strict'
import {ObserverFrameStats} from '../tools/production-local/runtime/observer-frame-stats.js'
test('RTC decode counts cannot inflate validated frame observations',()=>{
 const stats=new ObserverFrameStats()
 for(let i=0;i<875;i++)stats.accept({revision:2,frame:2},{revision:24,frame:i},{revision:2,frame:0},i)
 assert.equal(stats.frames,875);assert.equal(stats.validFrames,875);assert.equal(stats.invalidFrames,0);assert.equal(stats.duplicateFrames,0)
})
test('duplicates, corrupt markers and provenance mismatches remain distinguishable and fail closed',()=>{
 const s=new ObserverFrameStats(),a={revision:2,frame:2},p={revision:24,frame:10},v={revision:2,frame:0}
 s.accept(a,p,v,1);s.accept(a,p,v,2);s.accept(a,null,v,3);s.accept(a,{...p,frame:11},{revision:1,frame:0},4)
 assert.equal(s.validFrames,2);assert.equal(s.duplicateFrames,1);assert.equal(s.invalidFrames,1);assert.equal(s.selectionMismatches,1)
})
test('frame wrap and fenced candidate changes do not create false marker skip counts',()=>{
 const s=new ObserverFrameStats(),a={revision:1,frame:1},v={revision:1,frame:0}
 s.accept(a,{revision:24,frame:65535},v,1);s.accept(a,{revision:24,frame:0},v,2);assert.equal(s.markerSkipped,0)
 s.accept(a,{revision:24,frame:3},v,3);assert.equal(s.markerSkipped,2)
 s.accept({revision:2,frame:2},{revision:24,frame:1000},{revision:2,frame:0},4);assert.equal(s.markerSkipped,2);assert.equal(s.selectionMismatches,0)
})
