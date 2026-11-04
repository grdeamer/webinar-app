/** This one-use operator profile does not change the ordinary 30-minute EC2 Start path. */
export type MixedHourApproval={kind:'original-room-mixed-hour';approvalId:string;eventId:string;sessionId:string;cloudStopAtMs:number;mediaStopAtMs:number;approvedBudgetUsd:2;networkLimitBytes:4000000000;recording:false}
export function mixedHourApproval(value:unknown,scope:{eventId:string;sessionId:string},now=Date.now()):MixedHourApproval {
 const x=value as MixedHourApproval
 if(!x||x.kind!=='original-room-mixed-hour'||!/^[-a-f0-9]{36}$/.test(x.approvalId)||x.eventId!==scope.eventId||x.sessionId!==scope.sessionId||x.approvedBudgetUsd!==2||x.networkLimitBytes!==4000000000||x.recording!==false||![x.cloudStopAtMs,x.mediaStopAtMs].every(Number.isSafeInteger)||x.mediaStopAtMs<=now+61*60000||x.cloudStopAtMs>now+70*60000||x.mediaStopAtMs>x.cloudStopAtMs-60000)throw Error('Explicit bounded mixed-hour approval required')
 return x
}
