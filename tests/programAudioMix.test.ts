import test from 'node:test'
import assert from 'node:assert/strict'
import { editProgramAudioMix } from '../lib/producer/programAudioMix.ts'
const mix={masterGainDb:-6,muted:false,channels:[{sourceId:'camera-a',gainDb:-12,muted:false,solo:false},{sourceId:'camera-b',gainDb:0,muted:false,solo:false}]}
test('Program mixer edits retain source IDs and never mutate confirmed state',()=>{
 const solo=editProgramAudioMix(mix,'camera-b','solo',true)
 assert.equal(solo.channels[1].solo,true);assert.equal(mix.channels[1].solo,false)
 assert.deepEqual(solo.channels[0],mix.channels[0])
 assert.equal(editProgramAudioMix(mix,null,'muted',true).muted,true)
 assert.equal(editProgramAudioMix(mix,'camera-a','gainDb',-18).channels[0].gainDb,-18)
})
test('mixer rejects unknown sources and invalid gain values',()=>{
 assert.throws(()=>editProgramAudioMix(mix,'wrong','muted',true),/Unknown/)
 for(const gain of [NaN,Infinity,-61,13])assert.throws(()=>editProgramAudioMix(mix,null,'gainDb',gain),/Gain/)
 assert.throws(()=>editProgramAudioMix(mix,null,'solo',true),/Master/)
 assert.throws(()=>editProgramAudioMix(mix,null,'muted',1),/true or false/)
})
