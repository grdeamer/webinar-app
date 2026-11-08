import {randomBytes,randomUUID} from 'node:crypto'
import type {CommitResult,Composition,ProductionState} from './contracts.ts'
import {identifier} from './validation.ts'

type Role='source-a'|'source-b'
export type DirectTakeGrant={ticket:string;commandId:string;runId:string;expectedRevision:number;expiresAtMs:number}
export type DirectTakeInput={runId:string;expectedRevision:number;role:Role;trackSid:string;composition:Composition}
export type DirectTakePort={
 snapshot:()=>{runId:string;running:boolean;expiresAtMs:number;state:ProductionState}
 ready:(role:Role,sid:string,now:number)=>boolean
 commit:(actorId:string,commandId:string,revision:number,now:number)=>CommitResult
}
type Entry=DirectTakeGrant&{origin:string;actorId:string;role:Role;trackSid:string;composition:Composition;result?:CommitResult}
export class DirectTakeDenied extends Error { readonly code:string;constructor(code:string){super(code);this.code=code} }
function equal(a:unknown,b:unknown):boolean{
 if(a===b)return true
 if(Array.isArray(a)&&Array.isArray(b))return a.length===b.length&&a.every((v,i)=>equal(v,b[i]))
 if(a&&b&&typeof a==='object'&&typeof b==='object'&&!Array.isArray(a)&&!Array.isArray(b)){
  const av=a as Record<string,unknown>,bv=b as Record<string,unknown>,left=Object.keys(av),right=Object.keys(bv)
  return left.length===right.length&&left.every(k=>Object.hasOwn(bv,k)&&equal(av[k],bv[k]))
 }
 return false
}
/** Issued only behind the existing authenticated event-operator route. A grant
 * can commit exactly one prepared CUT; it cannot edit, start, stop or record. */
export class DirectTakeTickets {
 private readonly entries=new Map<string,Entry>()
 private stopped=false
 private readonly port:DirectTakePort
 private readonly origins:readonly string[]
 private readonly clock:()=>number
 constructor(port:DirectTakePort,origins:readonly string[],clock=Date.now){
  this.port=port;this.origins=origins;this.clock=clock
  if(!origins.length||origins.some(origin=>{try{const u=new URL(origin);return u.origin!==origin||u.username||u.password||!(u.protocol==='https:'||(u.protocol==='http:'&&['127.0.0.1','localhost'].includes(u.hostname)))}catch{return true}}))throw new Error('Explicit direct TAKE origins required')
 }
 allowedOrigin(origin:string){return !this.stopped&&this.origins.includes(origin)}
 private prune(now:number){for(const [key,value] of this.entries)if(now>=value.expiresAtMs+(value.result?30000:0))this.entries.delete(key)}
 private validate(entry:Entry,now:number){
  const s=this.port.snapshot()
  if(this.stopped||!s.running||s.runId!==entry.runId||now>=s.expiresAtMs||now>=entry.expiresAtMs)throw new DirectTakeDenied('TAKE_GRANT_EXPIRED')
  if(s.state.revision!==entry.expectedRevision||!equal(s.state.preview.composition,entry.composition))throw new DirectTakeDenied('PREVIEW_CHANGED')
  if(!this.port.ready(entry.role,entry.trackSid,now))throw new DirectTakeDenied('INPUT_NOT_READY')
 }
 issue(origin:string,actorId:string,input:DirectTakeInput):DirectTakeGrant{
  const now=this.clock();this.prune(now)
  if(!this.allowedOrigin(origin))throw new DirectTakeDenied('ORIGIN_DENIED')
  identifier(actorId)
  if(!input||!['source-a','source-b'].includes(input.role)||!/^TR_[\w-]{1,128}$/.test(input.trackSid)||!Number.isSafeInteger(input.expectedRevision)||input.expectedRevision<0)throw new DirectTakeDenied('INVALID_PREPARED_TAKE')
  const s=this.port.snapshot()
  const entry:Entry={ticket:randomBytes(32).toString('hex'),commandId:randomUUID(),origin,actorId,runId:input.runId,expectedRevision:input.expectedRevision,expiresAtMs:Math.min(now+5000,s.expiresAtMs),role:input.role,trackSid:input.trackSid,composition:structuredClone(input.composition)}
  this.validate(entry,now)
  if(this.entries.size>=64)throw new DirectTakeDenied('TAKE_GRANT_LIMIT')
  this.entries.set(entry.ticket,entry)
  return {ticket:entry.ticket,commandId:entry.commandId,runId:entry.runId,expectedRevision:entry.expectedRevision,expiresAtMs:entry.expiresAtMs}
 }
 private entry(origin:string,body:unknown){
  if(!this.allowedOrigin(origin)||!body||typeof body!=='object'||Array.isArray(body))throw new DirectTakeDenied('TAKE_DENIED')
  const x=body as Record<string,unknown>
  if(Object.keys(x).some(key=>!['ticket','commandId','action'].includes(key))||!['prepare','take'].includes(String(x.action))||typeof x.ticket!=='string'||!/^[a-f0-9]{64}$/.test(x.ticket))throw new DirectTakeDenied('INVALID_TAKE_REQUEST')
  const entry=this.entries.get(x.ticket)
  if(!entry||entry.origin!==origin||entry.commandId!==x.commandId)throw new DirectTakeDenied('TAKE_DENIED')
  return entry
 }
 execute(origin:string,body:unknown):CommitResult|{prepared:true;expiresAtMs:number}{
  const now=this.clock();this.prune(now)
  const entry=this.entry(origin,body),action=(body as {action:string}).action
  if(action==='prepare'){this.validate(entry,now);return {prepared:true,expiresAtMs:entry.expiresAtMs}}
  if(entry.result){
   const s=this.port.snapshot()
   if(!s.running||s.runId!==entry.runId||now>=s.expiresAtMs)throw new DirectTakeDenied('TAKE_GRANT_EXPIRED')
   return {...structuredClone(entry.result),replayed:true}
  }
  this.validate(entry,now)
  // No await between final validation and the store's atomic revision check.
  entry.result=this.port.commit(entry.actorId,entry.commandId,entry.expectedRevision,now)
  return structuredClone(entry.result)
 }
 stop(){this.stopped=true;this.entries.clear()}
}
