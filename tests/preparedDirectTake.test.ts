import assert from 'node:assert/strict'
import test from 'node:test'
import type {DirectTakeInput} from '../lib/production/directTakeTickets.ts'
import {prepareDirectTake,commitDirectTake,directTakeIsCurrent} from '../lib/producer/preparedDirectTake.ts'
const input:DirectTakeInput={runId:'current',expectedRevision:12,role:'source-a' as const,trackSid:'TR_current',composition:{sceneId:null,layers:[]}}
const url='https://producer-engine.jupiter.events/control'
function grant(){return {ticket:'0'.repeat(64),commandId:'11111111-1111-4111-8111-111111111111',runId:'current',expectedRevision:12,expiresAtMs:Date.now()+5000,url}}
test('direct control prewarms outside TAKE and sends only the prepared CUT once without cookies or redirects',async t=>{
 const original=globalThis.fetch;t.after(()=>{globalThis.fetch=original})
 const requests:{url:string;options:RequestInit}[]=[]
 const g=grant()
 globalThis.fetch=async(raw,options)=>{requests.push({url:String(raw),options:options!});const body=JSON.parse(String(options!.body));return Response.json(body.action==='prepare'?{prepared:true}:{receipt:{commandId:g.commandId,expectedRevision:12,revision:13,command:{type:'TAKE_AND_ENABLE_OUTPUT'}},currentState:{desiredLifecycle:'live'}})}
 const prepared=await prepareDirectTake(url,input,'cue',async()=>g,new AbortController().signal)
 assert.equal(requests.length,1);assert.equal(directTakeIsCurrent(prepared,'current',12,'cue','source-a','TR_current'),true)
 await commitDirectTake(prepared)
 assert.equal(requests.length,2)
 for(const request of requests){assert.equal(request.url,url);assert.equal(request.options.credentials,'omit');assert.equal(request.options.redirect,'error');assert.equal(request.options.referrerPolicy,'no-referrer');assert.equal((request.options.headers as Record<string,string>)['Content-Type'],'text/plain')}
 assert.equal(JSON.parse(String(requests[1].options.body)).action,'take')
})
test('untrusted destinations and expired/mismatched grants are rejected before their ticket is transmitted',async t=>{
 const original=globalThis.fetch;t.after(()=>{globalThis.fetch=original});let calls=0
 globalThis.fetch=async()=>{calls++;throw Error('Must not transmit')}
 for(const g of [{...grant(),url:'https://other.invalid/control'},{...grant(),expectedRevision:13},{...grant(),runId:'other'},{...grant(),expiresAtMs:Date.now()-1}])await assert.rejects(prepareDirectTake(url,input,'cue',async()=>g,new AbortController().signal))
 assert.equal(calls,0)
})
test('an ambiguous network failure is never retried or translated into a second proxy TAKE',async t=>{
 const original=globalThis.fetch;t.after(()=>{globalThis.fetch=original});let calls=0
 globalThis.fetch=async()=>{calls++;throw Error('Network lost after send')}
 await assert.rejects(commitDirectTake({url,grant:grant(),key:'cue',role:'source-a',trackSid:'TR_current'}),/delivery is unknown.*no second TAKE/)
 assert.equal(calls,1)
})
test('a changed cue or expired ticket cannot take a newer mix',()=>{
 const prepared={url,grant:grant(),key:'cue',role:'source-a' as const,trackSid:'TR_current'}
 assert.equal(directTakeIsCurrent(prepared,'current',13,'cue','source-a','TR_current'),false)
 assert.equal(directTakeIsCurrent(prepared,'current',12,'other-cue','source-a','TR_current'),false)
 assert.equal(directTakeIsCurrent(prepared,'current',12,'cue','source-a','TR_replacement'),false)
 assert.equal(directTakeIsCurrent(prepared,'current',12,'cue','source-a','TR_current',Date.now()+6000),false)
})
