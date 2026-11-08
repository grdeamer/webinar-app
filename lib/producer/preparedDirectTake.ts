import type {Composition,CommitResult} from '../production/contracts'
import type {DirectTakeGrant,DirectTakeInput} from '../production/directTakeTickets'
export type PreparedDirectTake={grant:DirectTakeGrant;url:string;key:string;role:'source-a'|'source-b';trackSid:string}
type Issue=(input:DirectTakeInput)=>Promise<DirectTakeGrant&{url:string}>
export async function prepareDirectTake(url:string,input:DirectTakeInput,key:string,issue:Issue,signal:AbortSignal):Promise<PreparedDirectTake>{
 const expected=new URL(url)
 if(expected.href!==url||expected.username||expected.password||expected.search||expected.hash||!(expected.protocol==='https:'||(expected.protocol==='http:'&&['127.0.0.1','localhost'].includes(expected.hostname))))throw Error('Invalid direct TAKE endpoint')
 const grant=await issue(input)
 signal.throwIfAborted()
 if(grant.url!==url||grant.runId!==input.runId||grant.expectedRevision!==input.expectedRevision||!/^[a-f0-9]{64}$/.test(grant.ticket)||!/^[a-f0-9-]{36}$/.test(grant.commandId)||grant.expiresAtMs<=Date.now()+250||grant.expiresAtMs>Date.now()+10000)throw Error('Invalid direct TAKE grant')
 const response=await fetch(url,{method:'POST',headers:{'Content-Type':'text/plain'},credentials:'omit',redirect:'error',cache:'no-store',referrerPolicy:'no-referrer',signal,body:JSON.stringify({ticket:grant.ticket,commandId:grant.commandId,action:'prepare'})})
 if(!response.ok)throw Error('Direct TAKE preparation unavailable')
 const value=await response.json();signal.throwIfAborted()
 if(value.prepared!==true)throw Error('Direct TAKE preparation unavailable')
 return {grant,url,key,role:input.role,trackSid:input.trackSid}
}
export function directTakeIsCurrent(prepared:PreparedDirectTake|null,runId:string,revision:number,key:string,role:string,trackSid:string,now=Date.now()){
 return Boolean(prepared&&prepared.grant.runId===runId&&prepared.grant.expectedRevision===revision&&prepared.key===key&&prepared.role===role&&prepared.trackSid===trackSid&&prepared.grant.expiresAtMs>now+100)
}
/** Once sent, a network failure is ambiguous. Never fall back and send another
 * TAKE automatically; the idempotent server receipt is available on explicit retry. */
export async function commitDirectTake(prepared:PreparedDirectTake):Promise<CommitResult>{
 let response:Response
 try{response=await fetch(prepared.url,{method:'POST',headers:{'Content-Type':'text/plain'},credentials:'omit',redirect:'error',cache:'no-store',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(6000),body:JSON.stringify({ticket:prepared.grant.ticket,commandId:prepared.grant.commandId,action:'take'})})}
 catch{throw Error('TAKE delivery is unknown. Inspect outgoing Program before retrying; no second TAKE was sent.')}
 if(!response.ok){if(response.status===409||response.status===403)throw Error('Prepared TAKE was rejected. Refresh Preview readiness before retrying.');throw Error('TAKE delivery is unknown. Inspect outgoing Program before retrying; no second TAKE was sent.')}
 let result:CommitResult
 try{result=await response.json()}catch{throw Error('TAKE delivery is unknown. Inspect outgoing Program before retrying; no second TAKE was sent.')}
 if(result.currentState?.desiredLifecycle!=='live'||result.receipt?.command.type!=='TAKE_AND_ENABLE_OUTPUT'||result.receipt?.commandId!==prepared.grant.commandId||result.receipt.expectedRevision!==prepared.grant.expectedRevision||result.receipt.revision!==prepared.grant.expectedRevision+1)throw Error('TAKE receipt was not confirmed. Inspect outgoing Program before retrying.')
 return result
}
export function directTakeInput(runId:string,expectedRevision:number,role:'source-a'|'source-b',trackSid:string,composition:Composition):DirectTakeInput{return {runId,expectedRevision,role,trackSid,composition}}
