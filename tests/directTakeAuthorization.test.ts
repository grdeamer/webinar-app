import assert from 'node:assert/strict'
import test from 'node:test'
import {readFileSync} from 'node:fs'
import {runInNewContext} from 'node:vm'
import ts from 'typescript'
function route(authorized:boolean){
 let calls=0,queries=0,last:Record<string,unknown>|null=null
 const query={select(){queries++;return this},eq(){return this},async maybeSingle(){return {data:{id:'session'},error:null as null}}}
 const dependencies:Record<string,unknown>={
  'next/server':{NextResponse:Response},'@/lib/eventTeamAccess':{requireEventOperatorAccess:async()=>authorized?{eventId:'event',user:{id:'verified-user'},isGlobalAdmin:false}:Response.json({error:'Denied'},{status:403})},
  '@/lib/supabase/admin':{supabaseAdmin:{from:()=>query}},'@/lib/production/hosted/ec2Worker':{producerBackend:()=> 'ec2'},'@/lib/production/ec2SealedConfig':{},
  '@/lib/production/hosted/client':{callHostedEngine:async(value:Record<string,unknown>)=>{calls++;last=value;return Response.json({ticket:'test-only',url:'https://untrusted.invalid/control'})}},
  '@/lib/production/hosted/protocol':{engineEndpoint:(raw:string)=>new URL('/control',raw)},'@/lib/production/hosted/sandboxWorker':{},'@/lib/production/hosted/studioAssets':{},'@/lib/producer/engineOwner':{},
 }
 const source=readFileSync(new URL('../app/admin/events/[id]/producer/rehearsal/engine/[sessionId]/[...path]/route.ts',import.meta.url),'utf8')
 const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,exports={}
 runInNewContext(compiled,{exports,module:{exports},Response,Buffer,URL,process:{env:{PRODUCER_ENGINE_URL:'https://producer-engine.jupiter.events'}},require:(name:string)=>{assert.ok(name in dependencies,'Unexpected dependency '+name);return dependencies[name]}})
 return {POST:(exports as {POST:(r:Request,c:unknown)=>Promise<Response>}).POST,counts:()=>({calls,queries,last})}
}
const context={params:Promise.resolve({id:'event',sessionId:'session',path:['api','producer','control-ticket']})}
function request(origin='https://app.jupiter.events'){return new Request('https://app.jupiter.events/engine/api/producer/control-ticket',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({runId:'run',expectedRevision:12,role:'source-a',trackSid:'TR_current',composition:{sceneId:null,layers:[]},origin:'https://attacker.invalid',actorId:'forged',command:{type:'START'}})})}
test('direct TAKE issuance requires the existing verified event-operator access before touching engine or database',async()=>{
 const r=route(false),response=await r.POST(request(),context)
 assert.equal(response.status,403);assert.equal(r.counts().calls,0);assert.equal(r.counts().queries,0)
})
test('issuer binds the trusted actor, session, request origin and configured engine destination',async()=>{
 const r=route(true),response=await r.POST(request(),context);assert.equal(response.status,200)
 const sent=r.counts().last!;assert.deepEqual(JSON.parse(JSON.stringify(sent.scope)),{eventId:'event',sessionId:'session',actorId:'verified-user'})
 const body=JSON.parse(String(sent.body));assert.equal(body.origin,'https://app.jupiter.events');assert.equal(body.actorId,undefined);assert.equal(body.command,undefined)
 assert.equal((await response.json()).url,'https://producer-engine.jupiter.events/control');assert.equal(response.headers.get('cache-control'),'no-store')
})
test('cross-site ticket issuance is denied without calling the engine',async()=>{
 const r=route(true),response=await r.POST(request('https://attacker.invalid'),context)
 assert.equal(response.status,403);assert.equal(r.counts().calls,0)
})
