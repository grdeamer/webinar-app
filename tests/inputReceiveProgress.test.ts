import test from 'node:test'
import assert from 'node:assert/strict'
import {InputReceiveProgress} from '../lib/production/inputReceiveProgress.ts'
const binding={participantIdentity:'source-camera-a',trackSid:'TR_file',generation:2,boundAtMs:0}
const report=(atMs:number,frames:number)=>({primary:{atMs,inputFrames:{'source-camera-a':frames},inputTrackSids:{'source-camera-a':'TR_file'}}})
test('actual decoder advancement stays healthy independently of delayed HTTP telemetry',()=>{
 const p=new InputReceiveProgress()
 assert.equal(p.observe(binding,'camera-a','TR_file',report(10000,30),'primary',10000),null)
 const evidence=p.observe(binding,'camera-a','TR_file',report(11000,60),'primary',11000)
 assert.equal(evidence?.atMs,11000);assert.equal(evidence?.frames,60)
 // Cached or frozen reports cannot refresh progress; the same 2.5s limit applies.
 assert.equal(p.observe(binding,'camera-a','TR_file',report(14000,60),'primary',14000),null)
})
test('unowned publications, generation changes and reset counters cannot fake freshness',()=>{
 const p=new InputReceiveProgress();p.observe(binding,'camera-a','TR_file',report(10000,30),'primary',10000)
 assert.equal(p.observe({...binding,trackSid:'TR_other'},'camera-a','TR_file',report(11000,60),'primary',11000),null)
 assert.equal(p.observe({...binding,generation:3},'camera-a','TR_file',report(12000,90),'primary',12000),null)
 assert.equal(p.observe({...binding,generation:3},'camera-a','TR_file',report(13000,5),'primary',13000),null)
 assert.equal(p.observe({...binding,generation:3},'camera-a','TR_file',report(14000,35),'primary',14000)?.frames,35)
})

test('decoded frames from a different publication cannot preserve the owned lease',()=>{
 const p=new InputReceiveProgress();p.observe(binding,'camera-a','TR_file',report(10000,30),'primary',10000)
 const wrong=report(11000,60);wrong.primary.inputTrackSids['source-camera-a']='TR_other'
 assert.equal(p.observe(binding,'camera-a','TR_file',wrong,'primary',11000),null)
})
