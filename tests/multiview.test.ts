import test from "node:test"
import assert from "node:assert/strict"
import { monitorPage, parseMonitorRequest } from "../lib/zoom-bridge/multiview.ts"
const one = "11111111-1111-4111-8111-111111111111", two = "22222222-2222-4222-8222-222222222222"
test("monitor selection bounds and command-injection rejection", () => {
 assert.deepEqual(parseMonitorRequest({ ids: [one,two], expanded: false }), { ids: [one,two], expanded: false })
 assert.deepEqual(parseMonitorRequest({ ids: [one], expanded: true }), { ids: [one], expanded: true })
 for(const input of [{ids:[],expanded:false},{ids:[one,one],expanded:false},{ids:[one,two],expanded:true},{ids:[`${one};bash`],expanded:false},{ids:[one],expanded:"true"},{ids:Array.from({length:10},(_,i)=>`${i}`),expanded:false}]) assert.throws(()=>parseMonitorRequest(input))
})

test("multiview pagination monitors only current nine and clamps final page", () => {
 const rooms = Array.from({length:50}, (_,i)=>i)
 assert.deepEqual(monitorPage(rooms,0),{page:0,pages:6,items:[0,1,2,3,4,5,6,7,8]})
 assert.deepEqual(monitorPage(rooms,1).items,[9,10,11,12,13,14,15,16,17])
 assert.deepEqual(monitorPage(rooms,99),{page:5,pages:6,items:[45,46,47,48,49]})
 assert.equal(monitorPage([],0).pages,1)
})
