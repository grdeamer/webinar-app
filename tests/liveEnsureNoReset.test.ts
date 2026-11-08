import assert from 'node:assert/strict'
import test from 'node:test'
import {readFileSync} from 'node:fs'
import {runInNewContext} from 'node:vm'
import ts from 'typescript'
function moduleAt(path:string){
 let writes=0;const live={event_id:'event',room_id:'room',is_live:true,layout:'grid',scene_version:49,stage_participant_ids:['speaker'],preview_blocks:[{id:'saved'}],auto_director_enabled:false,audience_mode:'embedded',enabled:true}
 const query={select(){return this},eq(){return this},maybeSingle:async()=>({data:structuredClone(live),error:null as null}),single:async()=>({data:structuredClone(live),error:null as null}),insert(){writes++;return query},upsert(){writes++;return query},update(){writes++;return query}}
 const exports:Record<string,unknown>={},code=ts.transpileModule(readFileSync(new URL('../'+path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
 runInNewContext(code,{exports,module:{exports},require:(name:string)=>{if(name==='@/lib/supabase/admin')return{supabaseAdmin:{from:()=>query}};if(name==='@/lib/live/config')return{getLiveProvider:()=> 'livekit',buildEventRoomName:()=> 'room'};if(name==='@/lib/app/liveState')return{};throw Error(name)}})
 return{exports,live,writes:()=>writes}
}
test('opening or reconnecting producer/observer state never resets committed live state',async()=>{
 for(const path of ['lib/live/stageState.ts','lib/live/live/state.ts']){
  const x=moduleAt(path)
  for(let i=0;i<20;i++){const result=await(x.exports.ensureEventLiveStageState as (id:string)=>Promise<Record<string,unknown>>)('event');assert.equal(result.scene_version,49);assert.equal(result.is_live,true)}
  if(x.exports.ensureEventLiveProgramState)assert.equal((await(x.exports.ensureEventLiveProgramState as (id:string)=>Promise<Record<string,unknown>>)('event')).is_live,true)
  assert.equal(x.writes(),0)
 }
})
test('unchanged layout and room settings do not create new versions or writes',async()=>{
 const x=moduleAt('lib/live/stageState.ts')
 assert.equal((await(x.exports.setEventLiveLayout as (a:unknown)=>Promise<Record<string,unknown>>)({eventId:'event',layout:'grid'})).scene_version,49)
 await(x.exports.updateEventLiveRoom as (a:unknown)=>Promise<unknown>)({eventId:'event',audienceMode:'embedded',enabled:true});assert.equal(x.writes(),0)
})
