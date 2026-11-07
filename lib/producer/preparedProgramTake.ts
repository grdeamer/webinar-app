import type {Composition} from '../production/contracts'
function canonical(value:unknown):string {
 if(Array.isArray(value))return '['+value.map(canonical).join(',')+']'
 if(value&&typeof value==='object')return '{'+Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>JSON.stringify(k)+':'+canonical(v)).join(',')+'}'
 return JSON.stringify(value)
}
export function samePreparedComposition(actual:unknown,expected:Composition){return canonical(actual)===canonical(expected)}
export type ProgramTakeReceipt={runId:string;revision:number;key:string;composition:Composition}
export function preparedProgramConfirmed(status:{runtime:{runId:string;running:boolean;observer?:{atMs?:number;lastGoodAtMs?:number;revision?:number;selectionMismatches?:number;width?:number;height?:number}};state:{desiredLifecycle:string;program:{composition:Composition}}},receipt:ProgramTakeReceipt,now=Date.now()){
 const r=status.runtime.observer
 return Boolean(status.runtime.running&&status.runtime.runId===receipt.runId&&status.state.desiredLifecycle==='live'&&samePreparedComposition(status.state.program.composition,receipt.composition)&&r&&typeof r.revision==='number'&&r.revision>=receipt.revision&&r.selectionMismatches===0&&r.width===1920&&r.height===1080&&typeof r.atMs==='number'&&now-r.atMs>=0&&now-r.atMs<2500&&typeof r.lastGoodAtMs==='number'&&now-r.lastGoodAtMs>=0&&now-r.lastGoodAtMs<2500)
}
export function assertPreparedPreview(status:{runtime:{runId:string};state:{preview:{composition:Composition}}},runId:string,composition:Composition){
 if(status.runtime.runId!==runId||!samePreparedComposition(status.state.preview.composition,composition))throw Error('Engine Preview changed after this canvas was prepared. Cue it again before TAKE; Program was not changed.')
}
