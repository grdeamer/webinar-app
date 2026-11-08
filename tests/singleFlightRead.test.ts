import assert from 'node:assert/strict'
import test from 'node:test'
import {singleFlightRead} from '../lib/producer/singleFlightRead.ts'
test('concurrent consumers share one read, but later reads and other event sessions never reuse it',async()=>{
 const read=singleFlightRead<number>();let calls=0,release:(n:number)=>void=()=>{}
 const load=()=>{calls++;return new Promise<number>(resolve=>{release=resolve})}
 const a=read('event-a/session/status',load),b=read('event-a/session/status',load);await Promise.resolve();assert.equal(calls,1);release(4);assert.deepEqual(await Promise.all([a,b]),[4,4])
 assert.equal(await read('event-a/session/status',async()=>++calls),2)
 assert.equal(await read('event-b/session/status',async()=>++calls),3)
})
test('a failed read is not cached or retried; a subsequent explicit read can recover',async()=>{
 const read=singleFlightRead<number>();let calls=0
 const fail=()=>{calls++;throw Error('offline')}
 const a=read('status',fail),b=read('status',fail);await Promise.all([assert.rejects(a,/offline/),assert.rejects(b,/offline/)]);assert.equal(calls,1)
 assert.equal(await read('status',async()=>8),8)
})
