import assert from 'node:assert/strict'
import test from 'node:test'
import {DirectTakeTickets,DirectTakeDenied} from '../lib/production/directTakeTickets.ts'
import {initialProductionState} from '../lib/production/state.ts'
import {commitProductionCommand} from '../lib/production/commandService.ts'
import {LocalSqliteProductionStore} from '../lib/production/localSqliteStore.ts'
const scope={broadcastId:'b',eventId:'e',sessionId:'s'},origin='https://app.jupiter.events'
function setup(t:{after:(fn:()=>void)=>void}){
 let now=100000,ready=true,running=true,runId='run-one',commits=0
 const store=new LocalSqliteProductionStore(':memory:');t.after(()=>store.close());store.initialize(scope,now)
 function commit(command:unknown){const s=store.read(scope);return commitProductionCommand(store,{schemaVersion:1,scope,commandId:crypto.randomUUID(),expectedRevision:s.revision,command},{actorId:'operator',scope},now)}
 commit({type:'SET_PREVIEW',composition:{sceneId:null,layers:[{id:'prepared-canvas',kind:'text',sourceId:null,props:{text:'ready'}}]}});commit({type:'SET_LIVE',live:true})
 const tickets=new DirectTakeTickets({snapshot:()=>({runId,running,expiresAtMs:200000,state:store.read(scope)}),ready:()=>ready,commit:(actorId,commandId,revision,at)=>{commits++;return commitProductionCommand(store,{schemaVersion:1,scope,commandId,expectedRevision:revision,command:{type:'TAKE_AND_ENABLE_OUTPUT'}},{actorId,scope},at)}},[origin],()=>now)
 const issue=()=>tickets.issue(origin,'operator',{runId,expectedRevision:store.read(scope).revision,role:'source-a',trackSid:'TR_current',composition:store.read(scope).preview.composition})
 return {tickets,issue,commit,store,setNow:(n:number)=>{now=n},setReady:(r:boolean)=>{ready=r},setRunning:(r:boolean)=>{running=r},setRun:(r:string)=>{runId=r},commits:()=>commits}
}
function denied(code:string){return (error:unknown)=>error instanceof DirectTakeDenied&&error.code===code}
test('prepared direct grant commits exactly one fixed CUT and preserves idempotent acknowledgement',t=>{
 const f=setup(t),grant=f.issue(),request={ticket:grant.ticket,commandId:grant.commandId,action:'take'}
 assert.equal(grant.expiresAtMs,105000)
 assert.deepEqual(f.tickets.execute(origin,{...request,action:'prepare'}),{prepared:true,expiresAtMs:105000})
 const result=f.tickets.execute(origin,request);assert.ok('receipt' in result)
 assert.deepEqual(result.receipt.command,{type:'TAKE_AND_ENABLE_OUTPUT'})
 assert.equal(f.store.read(scope).program.composition.layers[0].id,'prepared-canvas')
 f.tickets.execute(origin,request);assert.equal(f.commits(),1)
})
test('expired, wrong origin, changed mix, changed run and stale decoders cannot execute a grant',t=>{
 const f=setup(t),grant=f.issue(),request={ticket:grant.ticket,commandId:grant.commandId,action:'take'}
 assert.throws(()=>f.tickets.execute('https://elsewhere.invalid',request),denied('TAKE_DENIED'))
 f.setReady(false);assert.throws(()=>f.tickets.execute(origin,request),denied('INPUT_NOT_READY'));f.setReady(true)
 f.setRun('replacement');assert.throws(()=>f.tickets.execute(origin,request),denied('TAKE_GRANT_EXPIRED'));f.setRun('run-one')
 f.setNow(105000);assert.throws(()=>f.tickets.execute(origin,request));f.setNow(100000)
 const next=f.issue();f.commit({type:'SET_AUDIO',bus:'preview',audio:{masterGainDb:-6,muted:true,channels:[]}})
 assert.throws(()=>f.tickets.execute(origin,{ticket:next.ticket,commandId:next.commandId,action:'take'}),denied('PREVIEW_CHANGED'))
 assert.equal(f.commits(),0)
})
test('capabilities cannot be widened to record, start, arbitrary commands or different command IDs',t=>{
 const f=setup(t),grant=f.issue(),request={ticket:grant.ticket,commandId:grant.commandId,action:'take'}
 for(const body of [{...request,action:'record'},{...request,action:'start'},{...request,command:{type:'SET_LIVE',live:true}},{...request,commandId:crypto.randomUUID()}])assert.throws(()=>f.tickets.execute(origin,body))
 assert.equal(f.commits(),0)
 f.tickets.stop();assert.throws(()=>f.tickets.execute(origin,request));assert.throws(()=>f.issue())
})
test('grant issuance requires exact prepared composition, live runtime and bounded origins',t=>{
 const f=setup(t),state=f.store.read(scope)
 assert.throws(()=>f.tickets.issue(origin,'operator',{runId:'run-one',expectedRevision:state.revision,role:'source-a',trackSid:'TR_current',composition:initialProductionState(scope,100).preview.composition}),denied('PREVIEW_CHANGED'))
 f.setRunning(false);assert.throws(()=>f.issue())
 assert.throws(()=>new DirectTakeTickets({} as never,['https://app.jupiter.events/untrusted']))
 assert.throws(()=>new DirectTakeTickets({} as never,[]))
})
