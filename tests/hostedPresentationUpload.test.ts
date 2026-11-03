import test from 'node:test'
import assert from 'node:assert/strict'
import {createServer} from 'node:http'
import {once} from 'node:events'
import {HostedPresentations} from '../lib/production/hostedPresentation.ts'
test('direct PowerPoint upload enforces CORS, one-use ownership, exact bytes and PDF response',async t=>{
 let calls=0
 const service=new HostedPresentations('runtime',Date.now()+120000,async(_name,input)=>{calls++;assert.equal(input.length,8);return Buffer.from('%PDF-1.7\nfixture')})
 const server=createServer((req,res)=>{void service.handle(req,res)})
 server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>{service.stop();server.closeAllConnections();server.close()})
 const address=server.address();assert.ok(address&&typeof address!=='string');const url=`http://127.0.0.1:${address.port}/presentation`,origin='https://app.jupiter.events'
 const grant=service.tickets.issue({name:'slides.pptx',bytes:8,origin,runId:'runtime'})
 const preflight=await fetch(url,{method:'OPTIONS',headers:{origin}});assert.equal(preflight.status,204);assert.equal(preflight.headers.get('access-control-allow-origin'),origin)
 const denied=await fetch(url,{method:'POST',headers:{origin:'https://evil.test'}});assert.equal(denied.status,403)
 const send=()=>fetch(url,{method:'POST',headers:{origin,Authorization:'Bearer '+grant.ticket},body:Buffer.from([80,75,3,4,0,0,0,0])})
 const response=await send();assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),'application/pdf');assert.match(await response.text(),/^%PDF-/)
 assert.equal((await send()).status,400);assert.equal(calls,1)
 const short=service.tickets.issue({name:'slides.pptx',bytes:10,origin,runId:'runtime'})
 const bad=await fetch(url,{method:'POST',headers:{origin,Authorization:'Bearer '+short.ticket},body:Buffer.from([80,75,3,4])});assert.equal(bad.status,400);assert.equal(calls,1)
})
