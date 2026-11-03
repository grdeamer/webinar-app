import test from 'node:test'
import assert from 'node:assert/strict'
import {PresentationTickets} from '../lib/production/presentationTickets.ts'
import {presentationMetadata} from '../lib/producer/presentationMetadata.ts'
const input={name:'slides.pptx',bytes:100,origin:'https://app.jupiter.events',runId:'test-run'}
test('presentation grants are single-use, bounded and scoped to origin and runtime',()=>{
 const tickets=new PresentationTickets(),now=Date.now(),grant=tickets.issue(input,now)
 assert.throws(()=>tickets.consume(grant.ticket,'https://evil.test',input.runId,now))
 assert.throws(()=>tickets.consume(grant.ticket,input.origin,'old-run',now))
 assert.equal(tickets.consume(grant.ticket,input.origin,input.runId,now).name,input.name)
 assert.throws(()=>tickets.consume(grant.ticket,input.origin,input.runId,now))
 const expired=tickets.issue(input,now);assert.throws(()=>tickets.consume(expired.ticket,input.origin,input.runId,now+90001))
 for(const value of [{...input,name:'macro.pptm'},{...input,bytes:50*1024*1024+1},{...input,origin:'https://app.jupiter.events.attacker.test'}])assert.throws(()=>tickets.issue(value,now))
})
test('slide metadata has bounded PNG thumbnails and preserves the slide count',()=>{
 const deck={originalName:'slides.pptx',pageCount:1,thumbnails:['data:image/png;base64,aGVsbG8=']}
 assert.deepEqual(presentationMetadata(deck),deck)
 for(const x of [{...deck,pageCount:101},{...deck,thumbnails:['javascript:alert(1)']},{...deck,pageCount:2},{...deck,thumbnails:['data:image/png;base64,'+'A'.repeat(50001)]}])assert.throws(()=>presentationMetadata(x))
})
