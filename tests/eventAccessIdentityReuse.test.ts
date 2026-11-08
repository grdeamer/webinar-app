import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'

function fixture(options: { active?: boolean; membership?: boolean; feature?: boolean; global?: boolean } = {}) {
  const reads: string[] = []; let authReads = 0
  const actor = {user:{id:'user'},profile:{role:options.global?'admin':'event_member',team_role:null as string|null,is_active:options.active??true}}
  const dependencies: Record<string,unknown> = {
    '@/lib/supabase/server': {createClient:async()=>({auth:{getUser:async()=>{authReads++;return{data:{user:actor.user}}}}})},
    '@/lib/supabase/admin': {supabaseAdmin:{from(table:string){reads.push(table);const q={select:()=>q,eq:()=>q,maybeSingle:async()=>({data:table==='events'?{id:'event',slug:'event'}:table==='profiles'?actor.profile:options.membership===false?null:{role:'producer',is_active:true,feature_permissions:[] as string[]}})};return q}}},
    '@/lib/eventPermissions': {ALL_EVENT_FEATURES:['producer_room'],featuresForEventRole:()=>options.feature===false?[]:['producer_room']},
    'next/server':{NextResponse:{json:(body:unknown,init:ResponseInit)=>Response.json(body,init)}},'next/navigation':{notFound:()=>assert.fail()},
  }
  const source=ts.transpileModule(readFileSync(new URL('../lib/eventTeamAccess.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
  const exports:Record<string,unknown>={}
  runInNewContext(source,{exports,module:{exports},require:(name:string)=>{assert.ok(name in dependencies,name);return dependencies[name]}})
  const guard=exports.requireEventOperatorAccess as (event:string,roles:string[],feature:string,actor?:unknown)=>Promise<Response|{eventId:string}>
  return {reads,actor,authReads:()=>authReads,check:(reuse=true)=>guard('event',['producer'],'producer_room',reuse?actor:undefined)}
}
test('same-request validated identity avoids a second auth/profile read but still checks event membership',async()=>{
  const x=fixture();const result=await x.check();assert.ok(!(result instanceof Response));assert.equal(x.authReads(),0);assert.deepEqual(x.reads,['events','event_team_members'])
  const fresh=fixture();await fresh.check(false);assert.equal(fresh.authReads(),1);assert.deepEqual(fresh.reads,['profiles','events','event_team_members'])
})
test('identity reuse cannot bypass inactive profile, missing membership or required feature checks',async()=>{
  for(const options of [{active:false},{membership:false},{feature:false}]){
    const x=fixture(options),result=await x.check();assert.ok(result instanceof Response);assert.equal(result.status,403)
  }
})
test('membership and profile are not cached between requests',async()=>{
  const x=fixture();await x.check();x.actor.profile.is_active=false;const result=await x.check();assert.ok(result instanceof Response);assert.equal(result.status,403)
})
