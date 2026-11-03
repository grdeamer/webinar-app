import test from 'node:test'
import assert from 'node:assert/strict'
import { presentationExtension, validatePresentationHeader, clampPresentationSlide } from '../lib/producer/presentationFiles.ts'
test('only ordinary PPTX and legacy PPT are accepted with matching binary headers',()=>{
 assert.equal(presentationExtension('Deck.PPTX'),'pptx')
 assert.equal(validatePresentationHeader('deck.pptx',new Uint8Array([80,75,3,4])),'pptx')
 assert.equal(validatePresentationHeader('deck.ppt',new Uint8Array([208,207,17,224,161,177,26,225])),'ppt')
 assert.throws(()=>validatePresentationHeader('macro.pptm',new Uint8Array([80,75,3,4])),/macro-enabled/)
 assert.throws(()=>validatePresentationHeader('fake.pptx',new Uint8Array([1,2,3])),/contents/)
 assert.throws(()=>validatePresentationHeader('empty.ppt',new Uint8Array()),/50 MB/)
})
test('slide navigation is bounded and rejects excessive decks',()=>{
 assert.equal(clampPresentationSlide(0,3),1);assert.equal(clampPresentationSlide(4,3),3)
 assert.equal(clampPresentationSlide(NaN,3),1);assert.equal(clampPresentationSlide(2,3),2)
 for(const count of [0,101,NaN,1.5])assert.throws(()=>clampPresentationSlide(1,count),/1–100/)
})
