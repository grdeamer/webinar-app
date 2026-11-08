import assert from 'node:assert/strict'
import test from 'node:test'
import {readFileSync} from 'node:fs'
import {runInNewContext} from 'node:vm'
import ts from 'typescript'
import {observationPatch} from '../lib/zoom-bridge/observationWrites.ts'
function setup(authorized=true){
 const rows=[{id:'satellite',revision:'desired-r1',desired_running:false,last_seen:null as string|null,observed:{},worker_name:'Satellite',passcode_ciphertext:'',meeting_id:'test'}]
 const source={...rows[0],id:'program',source_kind:'srt',source_profile:{}}
 let writes=0,attempts=0
 function from(table:string) {
  return {update(patch:Record<string,unknown>) {
    const filters:Record<string,unknown>={}
    const query={
      eq(k:string,v:unknown){filters[k]=v;return query},
      is(k:string,v:unknown){filters[k]=v;return query},
      then(resolve:(v:unknown)=>void){
        attempts++
        const row=table==='zoom_bridge_rooms'?rows[0]:source
        if(Object.entries(filters).every(([k,v])=>(row as Record<string,unknown>)[k]===v)){Object.assign(row,structuredClone(patch));writes++}
        resolve({error:null})
      }
    }
    return query
  }}
 }
 const dependencies:Record<string,unknown>={'next/server':{NextResponse:Response},'@/lib/zoom-bridge/server':{agentAuthorized:()=>authorized,rows:async()=>structuredClone(rows),unseal:()=>'',TABLE:'zoom_bridge_rooms'},'@/lib/zoom-bridge/source-profile':{defaultSourceProfile:{}},'@/lib/zoom-bridge/source':{sourceRow:async()=>structuredClone(source),SOURCE_TABLE:'zoom_bridge_source'},'@/lib/supabase/admin':{supabaseAdmin:{from}},'@/lib/zoom-bridge/observationWrites':{observationPatch}}
 const path='../app/api/zoom-bridge/agent/route.ts',script=ts.transpileModule(readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,exports:Record<string,unknown>={}
 runInNewContext(script,{exports,module:{exports},Response,Date,require:(name:string)=>{assert.ok(name in dependencies,name);return dependencies[name]}})
 const POST=exports.POST as (r:Request)=>Promise<Response>,send=(status='stopped')=>POST(new Request('https://app.jupiter.events/api/zoom-bridge/agent',{method:'POST',body:JSON.stringify({reports:[{id:'satellite',status,revision:'desired-r1'}],sourceReport:{kind:'srt',status:status==='joined'?'receiving':status,revision:'desired-r1'}})}))
 return{send,rows,source,counts:()=>({writes,attempts})}
}
test('agent GET configuration exchange continues but inactive unchanged profiles do not rewrite the database',async()=>{
 const x=setup();assert.equal((await x.send()).status,200);assert.equal(x.counts().writes,2)
 for(let i=0;i<20;i++)assert.equal((await x.send()).status,200)
 assert.equal(x.counts().writes,2);assert.equal(x.rows[0].revision,'desired-r1');assert.equal(x.rows[0].desired_running,false)
})
test('concurrent identical observations cannot overwrite a newer observation snapshot',async()=>{
 const x=setup();await Promise.all([x.send(),x.send()]);assert.equal(x.counts().writes,2)
 x.rows[0].desired_running=true;x.source.desired_running=true
 x.rows[0].last_seen=new Date(Date.now()-2000).toISOString();x.source.last_seen=x.rows[0].last_seen
 const old=x.counts().writes;await Promise.all([x.send('joined'),x.send('joined')]);assert.equal(x.counts().writes-old,2)
 assert.equal(x.rows[0].revision,'desired-r1');assert.equal(x.rows[0].desired_running,true)
})
test('unauthorized reports cannot read or write observations',async()=>{const x=setup(false);assert.equal((await x.send()).status,401);assert.deepEqual(x.counts(),{writes:0,attempts:0})})
