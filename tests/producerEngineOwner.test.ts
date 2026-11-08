import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import * as React from 'react'
import * as jsxRuntime from 'react/jsx-runtime'
import { renderToStaticMarkup } from 'react-dom/server'
import * as icons from 'lucide-react'
import { canStartProducerEngine } from '../lib/producer/engineOwner.ts'

function load(path:string, dependencies:Record<string,unknown>, env:Record<string,string>={}) {
  const source=readFileSync(new URL('../'+path,import.meta.url),'utf8')
  const compiled=ts.transpileModule(source,{fileName:path,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText
  const exports:Record<string,unknown>={}
  runInNewContext(compiled,{exports,module:{exports},Response,Buffer,URL,process:{env},require(name:string){assert.ok(Object.hasOwn(dependencies,name),'Unexpected dependency '+name);return dependencies[name]}})
  return exports
}

test('only the verified owner with existing administrator access can start compute',()=>{
  assert.equal(canStartProducerEngine({email:'grdeamer@gmail.com',email_confirmed_at:'confirmed'},true),true)
  assert.equal(canStartProducerEngine({email:'GRDEAMER@gmail.com',email_confirmed_at:'confirmed'},true),true)
  for(const [user,admin] of [[null,true],[{email:'other@gmail.com',email_confirmed_at:'confirmed'},true],[{email:'grdeamer@gmail.com'},true],[{email:'grdeamer@gmail.com',email_confirmed_at:'confirmed'},false]] as const){
    assert.equal(canStartProducerEngine(user,admin),false)
  }
})

test('direct start requests from another admin are rejected before database or AWS calls',async()=>{
  for(const email of ['other@gmail.com','grdeamer@gmail.com']){
    let queries=0,starts=0
    const query={select(){queries++;return this},eq(){return this},async maybeSingle(){return {data:{id:'session'},error:null as null}}}
    const route=load('app/admin/events/[id]/producer/rehearsal/engine/[sessionId]/[...path]/route.ts',{
      'next/server':{NextResponse:Response},
      '@/lib/eventTeamAccess':{requireEventOperatorAccess:async()=>({eventId:'event',user:{id:'user',email,email_confirmed_at:'confirmed'},isGlobalAdmin:true})},
      '@/lib/supabase/admin':{supabaseAdmin:{from:()=>query}},
      '@/lib/production/hosted/ec2Worker':{producerBackend:()=> 'ec2',validateEc2Scope:()=>{},prepareEc2Producer:async()=>{starts++;return {state:'pending',recordingEnabled:false}}},
      '@/lib/production/hosted/protocol':{},'@/lib/production/ec2SealedConfig':{},'@/lib/production/hosted/client':{},'@/lib/production/hosted/sandboxWorker':{},'@/lib/production/hosted/studioAssets':{},
      '@/lib/producer/engineOwner':{canStartProducerEngine},
    })
    const post=route.POST as (r:Request,c:unknown)=>Promise<Response>
    const response=await post(new Request('https://app.jupiter.events/engine/prepare',{method:'POST',headers:{origin:'https://app.jupiter.events','content-type':'application/json'},body:'{}'}),{params:Promise.resolve({id:'event',sessionId:'session',path:['prepare']})})
    assert.equal(response.status,email==='grdeamer@gmail.com'?200:403)
    assert.equal(starts,email==='grdeamer@gmail.com'?1:0)
    assert.equal(queries,email==='grdeamer@gmail.com'?1:0)
  }
})

test('start power button renders only with the server-authorized owner flag',()=>{
  const loaded=load('app/admin/events/[id]/producer/ProducerEngineConnection.tsx',{
    react:React,'react/jsx-runtime':jsxRuntime,'lucide-react':icons,
    '@/lib/producer/startAndConnect':{startAndConnect:()=>assert.fail('Rendering cannot start compute')},
    './OriginalRoomSoakControls':{default:():null=>null},'./rehearsal/Ec2ProducerControls':{default:():null=>null},
  })
  const Component=loaded.default as React.ComponentType<Record<string,unknown>>
  for(const canStart of [false,true]){
    const html=renderToStaticMarkup(React.createElement(Component,{config:{canStart,root:'/engine'},engine:{connected:false,busy:false,ready:false,message:'Offline'},transport:{root:'/engine'}}))
    assert.equal(html.includes('Start engine'),canStart)
    assert.equal(html.includes('lucide-power'),canStart)
    assert.equal(html.includes('Recording off'),true)
  }
})

test('the shared Io start path enforces the same owner restriction and reports it to the UI',async()=>{
  for(const email of ['other@gmail.com','grdeamer@gmail.com']){
    let starts=0
    const route=load('app/api/admin/zoom-bridge/runtime/route.ts',{
      'next/server':{NextResponse:Response},
      '@/lib/requireAdmin':{requireAdmin:async()=>({user:{email,email_confirmed_at:'confirmed'},profile:{role:'admin'}})},
      '@/lib/production/hosted/ec2Worker':{ec2ProducerStatus:async()=>({state:'stopped'}),prepareSharedEc2:async()=>{starts++;return {state:'pending'}}},
      '@/lib/producer/engineOwner':{canStartProducerEngine},
    },{JUPITER_IO_EC2_SHARED:'true'})
    const get=route.GET as ()=>Promise<Response>,post=route.POST as (r:Request)=>Promise<Response>
    assert.equal((await (await get()).json()).canStart,email==='grdeamer@gmail.com')
    const response=await post(new Request('https://app.jupiter.events/api/admin/zoom-bridge/runtime',{method:'POST',headers:{origin:'https://app.jupiter.events','content-type':'application/json'},body:JSON.stringify({action:'start'})}))
    assert.equal(response.status,email==='grdeamer@gmail.com'?200:403)
    assert.equal(starts,email==='grdeamer@gmail.com'?1:0)
  }
})
