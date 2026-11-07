import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {runInNewContext} from 'node:vm'
import test from 'node:test'
import ts from 'typescript'

type CommandTransport={engineCommand:(run:string,command:unknown,transport:{root:string;relayUrl:string},revision?:number)=>Promise<unknown>}
function transport(reject=false){
 const requests:{method:string;url:string;body?:Record<string,unknown>}[]=[]
 const source=readFileSync(new URL('../app/dev/producer-media/localProgramTransport.ts',import.meta.url),'utf8')
 // Only the command boundary is exercised; the PDF worker URL is not loaded.
 const compiled=ts.transpileModule(source.replaceAll('import.meta.url',JSON.stringify(import.meta.url)),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
 const exports={}
 runInNewContext(compiled,{exports,module:{exports},URL,console,Date,crypto:{randomUUID:()=> 'take-command'},require:()=>({}),
  fetch:async(url:string,options:{method?:string;body?:string})=>{
   const request={method:options.method??'GET',url,body:options.body?JSON.parse(options.body):undefined};requests.push(request)
   return {ok:!reject,json:async()=>reject?{error:'REVISION_CONFLICT'}:request.method==='GET'?{runtime:{runId:'current'},state:{revision:17}}:{receipt:{revision:18}}}
  },
 })
 return {api:exports as CommandTransport,requests,config:{root:'/studio/transport',relayUrl:'wss://relay.invalid'}}
}
test('prepared TAKE sends one command immediately using the inspected revision, without another status round trip',async()=>{
 const t=transport()
 const result=await t.api.engineCommand('current',{type:'TAKE',transition:{type:'cut',durationMs:0}},t.config,17)
 assert.equal(t.requests.length,1)
 assert.equal(t.requests[0].method,'POST')
 assert.equal(t.requests[0].body?.runId,'current')
 assert.equal(t.requests[0].body?.expectedRevision,17)
 assert.deepEqual(result,{receipt:{revision:18}})
})
test('atomic server conflict is surfaced without retrying TAKE against a newer revision',async()=>{
 const t=transport(true)
 await assert.rejects(t.api.engineCommand('current',{type:'TAKE'},t.config,17),/REVISION_CONFLICT/)
 assert.equal(t.requests.length,1)
})
test('commands without an inspected revision still fetch and validate the running engine',async()=>{
 const t=transport()
 await t.api.engineCommand('current',{type:'SET_LIVE',live:false},t.config)
 assert.deepEqual(t.requests.map(r=>r.method),['GET','POST'])
 const replacement=transport()
 await assert.rejects(replacement.api.engineCommand('other',{type:'TAKE'},replacement.config),/Engine changed/)
 assert.deepEqual(replacement.requests.map(r=>r.method),['GET'])
})
