import test from 'node:test'
import assert from 'node:assert/strict'
import {localTransportOriginAllowed} from '../lib/producer/localTransportOrigin.ts'
test('loopback Host supports Next normalization without accepting a different browser origin',()=>{
 const req=(host:string,origin:string)=>new Request('http://localhost:3007/dev/producer-media/transport',{headers:{host,origin}})
 assert.equal(localTransportOriginAllowed(req('127.0.0.1:3007','http://127.0.0.1:3007'),true),true)
 for(const origin of ['https://attacker.test','http://127.0.0.1:3000','http://localhost:3007'])assert.equal(localTransportOriginAllowed(req('127.0.0.1:3007',origin),true),false)
 assert.equal(localTransportOriginAllowed(new Request('http://localhost:3007'),true),false)
 assert.equal(localTransportOriginAllowed(req('attacker.test','http://attacker.test'),true),false)
})
