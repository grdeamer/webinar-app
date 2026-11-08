import assert from 'node:assert/strict'
import test from 'node:test'
import {readFileSync} from 'node:fs'
import {runInNewContext} from 'node:vm'
import ts from 'typescript'
function fixture(){
 const effects:(()=>void|(()=>void))[]=[],polls:{run:()=>Promise<void>;stopped:boolean}[]=[],counts={participants:0,stage:0,program:0,commands:0}
 let release:()=>void=()=>{};const gate=new Promise<void>(resolve=>{release=resolve})
 const api={loadToken:async()=>({token:'local-fixture'}),loadParticipants:async()=>{counts.participants++;await gate;return{participants:[] as unknown[]}},loadStageState:async()=>{counts.stage++;await gate;return{state:{scene_version:42,is_live:true}}},loadProgramState:async()=>{counts.program++;await gate;return{state:{scene_version:42,is_live:true}}},goOffAir:()=>{counts.commands++;assert.fail('UI polling must not change Program')}}
 const dependencies:Record<string,unknown>={react:{useCallback:(fn:unknown)=>fn,useRef:(value:unknown)=>({current:value}),useEffect:(effect:()=>void|(()=>void))=>effects.push(effect)},'@/lib/browser/visibilityPoll':{startVisibilityPoll:(options:{run:()=>Promise<void>})=>{const poll={run:options.run,stopped:false};polls.push(poll);return{stop:()=>{poll.stopped=true}}}},'./producerAssetUrls':{normalizeProducerBlocks:():unknown[]=>[]}}
 const source=ts.transpileModule(readFileSync(new URL('../app/admin/events/[id]/producer/useProducerRoomLifecycle.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,exports:Record<string,unknown>={}
 runInNewContext(source,{exports,module:{exports},process:{env:{}},require:(name:string)=>{assert.ok(name in dependencies,name);return dependencies[name]}})
 const params={api,eventId:'event',sessionId:'session',loadMediaDevices:async()=>{},...Object.fromEntries(['setToken','setServerUrl','setRoomName','setParticipants','setParticipantsLoaded','setStageState','setProgramState','setProgramBlocks','setLoadingText','setError','setSyncWarningText'].map(name=>[name,()=>{}]))}
 const hook=(exports.default as (params:unknown)=>{refreshAll:()=>Promise<void>})(params)
 return{effects,polls,counts,hook,release}
}
test('concurrent manual and polling refreshes use one set of database-backed reads',async()=>{
 const x=fixture(),a=x.hook.refreshAll(),b=x.hook.refreshAll();assert.deepEqual(x.counts,{participants:1,stage:1,program:1,commands:0});x.release();await Promise.all([a,b])
 await x.hook.refreshAll();assert.deepEqual(x.counts,{participants:2,stage:2,program:2,commands:0})
})
test('metadata UI unmount stops polling without going off-air or changing authoritative Program state',async()=>{
 const x=fixture();const cleanups=x.effects.map(effect=>effect());for(const stop of cleanups)if(typeof stop==='function')stop();x.release();await Promise.resolve();await Promise.resolve();assert.equal(x.counts.commands,0);assert.ok(x.polls.every(poll=>poll.stopped))
})
