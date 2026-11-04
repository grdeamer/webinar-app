import type {SourceBinding} from './contracts.ts'
export type InputReceiveEvidence={frames:number;atMs:number;reportAtMs:number;candidate:'primary'|'standby';trackSid:string;generation:number}
/** Independent decoder progress, scoped to the already authenticated publication.
 * Re-reading a cached report, a different track, or a counter reset cannot renew a lease.
 */
export class InputReceiveProgress {
 private scope=''
 private counters=new Map<string,{frames:number;reportAtMs:number;progressedAtMs:number}>()
 observe(binding:SourceBinding,sourceId:string,ownedTrackSid:string|null,reports:Partial<Record<'primary'|'standby',Record<string,unknown>>>,preferred:'primary'|'standby',now=Date.now()):InputReceiveEvidence|null {
  if(!binding||binding.trackSid!==ownedTrackSid||binding.participantIdentity!==`source-${sourceId}`){this.scope='';this.counters.clear();return null}
  const scope=`${sourceId}/${binding.generation}/${binding.trackSid}`
  if(scope!==this.scope){this.scope=scope;this.counters.clear()}
  for(const candidate of ['primary','standby'] as const){
   const report=reports[candidate];if((report?.inputTrackSids as Record<string,unknown>)?.[`source-${sourceId}`]!==ownedTrackSid)continue;const at=Number(report?.atMs),frames=Number((report?.inputFrames as Record<string,unknown>)?.[`source-${sourceId}`])
   if(!Number.isSafeInteger(at)||at>now||now-at>=2500||!Number.isSafeInteger(frames)||frames<0)continue
   const old=this.counters.get(candidate)
   if(old&&at<=old.reportAtMs)continue
   this.counters.set(candidate,{frames,reportAtMs:at,progressedAtMs:old&&frames>old.frames?at:old&&frames===old.frames?old.progressedAtMs:0})
  }
  for(const candidate of [preferred,preferred==='primary'?'standby':'primary'] as const){
   const counter=this.counters.get(candidate)
   if(counter&&counter.progressedAtMs>0&&now-counter.progressedAtMs<2500)return {frames:counter.frames,atMs:counter.progressedAtMs,reportAtMs:counter.reportAtMs,candidate,trackSid:binding.trackSid,generation:binding.generation}
  }
  return null
 }
}
