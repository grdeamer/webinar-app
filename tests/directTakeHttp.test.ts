import assert from 'node:assert/strict'
import test from 'node:test'
import {createServer} from 'node:http'
import {once} from 'node:events'
import {handleDirectTake,respondDirectTakeGrant} from '../lib/production/directTakeHttp.ts'
import {DirectTakeTickets} from '../lib/production/directTakeTickets.ts'
import {initialProductionState} from '../lib/production/state.ts'
const origin='https://app.jupiter.events'
test('direct endpoint accepts only origin-bound text POST capabilities; it exposes no cookies or public control',async t=>{
 const state=initialProductionState({broadcastId:'b',eventId:'e',sessionId:'s'},Date.now());state.desiredLifecycle='live'
 const tickets=new DirectTakeTickets({snapshot:()=>({runId:'run',running:true,expiresAtMs:Date.now()+10000,state}),ready:()=>true,commit:()=>{throw Error('Prepare must not commit')}},[origin])
 const grant=tickets.issue(origin,'operator',{runId:'run',expectedRevision:0,role:'source-a',trackSid:'TR_current',composition:state.preview.composition})
 const server=createServer(async(req,res)=>{if(!await handleDirectTake(req,res,tickets)){res.writeHead(404);res.end()}})
 server.listen(0,'127.0.0.1');await once(server,'listening')
 t.after(async()=>{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()))})
 const address=server.address();assert.ok(address&&typeof address==='object');const url=`http://127.0.0.1:${address.port}/control`
 const body=JSON.stringify({ticket:grant.ticket,commandId:grant.commandId,action:'prepare'})
 const allowed=await fetch(url,{method:'POST',headers:{Origin:origin,'Content-Type':'text/plain'},body})
 assert.equal(allowed.status,200);assert.equal((await allowed.json()).prepared,true)
 assert.equal(allowed.headers.get('access-control-allow-origin'),origin);assert.equal(allowed.headers.get('access-control-allow-credentials'),null);assert.equal(allowed.headers.get('cache-control'),'no-store')
 for(const supplied of ['https://attacker.invalid','null']){const denied=await fetch(url,{method:'POST',headers:{Origin:supplied,'Content-Type':'text/plain'},body});assert.equal(denied.status,403);assert.equal(denied.headers.get('access-control-allow-origin'),null)}
 const oversized=await fetch(url,{method:'POST',headers:{Origin:origin,'Content-Type':'text/plain'},body:'x'.repeat(2049)});assert.equal(oversized.status,409)
 assert.equal((await fetch(url,{method:'OPTIONS',headers:{Origin:origin}})).status,404)
 assert.equal((await fetch(url,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body})).status,404)
})

test('a stale prepared cue returns a rejection without stopping the control listener',async()=>{
 let ready=false
 const server=createServer((_req,res)=>respondDirectTakeGrant(res,()=>{if(!ready)throw new Error('INPUT_NOT_READY');return {prepared:true}}))
 server.listen(0,'127.0.0.1');await once(server,'listening')
 const address=server.address();assert.ok(address&&typeof address!=='string');const url=`http://127.0.0.1:${address.port}`
 try{const rejected=await fetch(url);assert.equal(rejected.status,409);assert.deepEqual(await rejected.json(),{error:'PREPARED_TAKE_NOT_READY'});ready=true;const accepted=await fetch(url);assert.equal(accepted.status,200);assert.deepEqual(await accepted.json(),{prepared:true})}
 finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()))}
})
