type Evidence={trackSid:string;generation:number;atMs:number}
type Candidate={atMs?:number;inputTrackSids?:Record<string,string>;inputFrames?:Record<string,number>}
/** A signaling publication alone is not a cued picture. Both failover candidates
 * must decode the owned track before a library source can be offered for TAKE.
 */
export function libraryInputReady(status:{state:{bindings:Record<string,{trackSid:string;generation:number}>};runtime:{sourceReceiveMedia?:Record<string,Evidence>;candidateMedia?:Partial<Record<'primary'|'standby',Candidate>>}},role:'source-a'|'source-b',sid:string,now=Date.now()){
 const sourceId=role==='source-a'?'camera-a':'camera-b',binding=status.state.bindings[sourceId],received=status.runtime.sourceReceiveMedia?.[role]
 return Boolean(binding?.trackSid===sid&&received?.trackSid===sid&&received.generation===binding.generation&&now-received.atMs>=0&&now-received.atMs<2500&&(['primary','standby'] as const).every(id=>{const c=status.runtime.candidateMedia?.[id];return c&&now-c.atMs>=0&&now-c.atMs<2500&&c.inputTrackSids?.[`source-${sourceId}`]===sid&&c.inputFrames?.[`source-${sourceId}`]>0}))
}
