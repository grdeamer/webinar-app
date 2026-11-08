import assert from 'node:assert/strict'
import test from 'node:test'
import {readFileSync} from 'node:fs'
import {runInNewContext} from 'node:vm'
import ts from 'typescript'
import {jsonEqual} from '../lib/data/jsonEqual.ts'
function fixture(initial:unknown){let cues=initial,writes=0
 const query={select(){return this},eq(){return this},maybeSingle:async()=>({data:cues===null?null:{cues},error:null as null}),upsert(row:{cues:unknown}){writes++;cues=row.cues;return Promise.resolve({error:null as null})}}
 const exports:Record<string,unknown>={},source=ts.transpileModule(readFileSync(new URL('../lib/runOfShow/save.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
 runInNewContext(source,{exports,module:{exports},Date,require:(name:string)=>name==='server-only'?{}:name==='@/lib/supabase/admin'?{supabaseAdmin:{from:()=>query}}:name==='../data/jsonEqual.ts'?{jsonEqual}:assert.fail(name)})
 return{save:exports.saveRunOfShowIfChanged as (id:string,cues:unknown[])=>Promise<boolean>,writes:()=>writes}
}
test('mount and callback-only saves do not rewrite unchanged JSONB or create empty cue rows',async()=>{
 const f=fixture([{id:'cue',name:'Welcome',duration:10}]);for(let i=0;i<100;i++)assert.equal(await f.save('event',[{duration:10,name:'Welcome',id:'cue'}]),false);assert.equal(f.writes(),0)
 const empty=fixture(null);assert.equal(await empty.save('event',[]),false);assert.equal(empty.writes(),0)
})
test('actual cue edits persist once and retain meaningful ordering and falsy values',async()=>{
 const f=fixture([{id:'one'},{id:'two'}]);assert.equal(await f.save('event',[{id:'two'},{id:'one'}]),true);assert.equal(f.writes(),1);assert.equal(await f.save('event',[{id:'two'},{id:'one'}]),false)
 assert.equal(jsonEqual({muted:false},{muted:true}),false);assert.equal(jsonEqual([1,2],[2,1]),false)
})
