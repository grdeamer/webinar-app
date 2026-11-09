import assert from 'node:assert/strict'
import test from 'node:test'
import {mkdtempSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import type {IncomingMessage,ServerResponse} from 'node:http'
import {LocalHaRuntime} from '../lib/production/localHaRuntime.ts'

test('gateway and its complete relative module graph are served through the actual runtime allowlist',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'gateway-route-')),runtime=new LocalHaRuntime(dir)
 const queue=['ha-gateway.js'],seen=new Set<string>()
 try{
  while(queue.length){
   const file=queue.shift()!;if(seen.has(file))continue;seen.add(file)
   let status=0,body='',headers:Record<string,string>={}
   const request={method:'GET',url:'/runtime/'+file,socket:{localAddress:'127.0.0.1'},headers:{host:'127.0.0.1:4311'}} as IncomingMessage
   const response={writeHead(code:number,value:Record<string,string>){status=code;headers=value},end(value:string|Buffer){body=String(value)}} as unknown as ServerResponse
   await runtime.handle(request,response)
   assert.equal(status,200,file);assert.equal(headers['Content-Type'],'text/javascript',file)
   for(const match of body.matchAll(/from\s+['"]\.\/([^'"]+)['"]/g))queue.push(match[1])
  }
  assert.ok(seen.has('refresh-poll.js'));assert.ok(seen.has('ha-fence.js'))
 }finally{runtime.store.close();rmSync(dir,{recursive:true,force:true})}
})
