import assert from 'node:assert/strict'
import test from 'node:test'
import {createElement} from 'react'
import {renderToString} from 'react-dom/server'
import useProducerTransitions from '../app/admin/events/[id]/producer/useProducerTransitions.ts'
import type {PreviewBlock} from '../app/admin/events/[id]/producer/useProducerBlocks.ts'

// Exercise the real hooks' async command boundary without media workers or a browser.
function transitions(ack:()=>Promise<boolean>) {
  let take: ReturnType<typeof useProducerTransitions>['runTake']
  let legacyWrites=0, program:PreviewBlock[]=[]
  const preview=[{id:'slide',type:'pdf',src:'blob:test',pdfPage:2}] as PreviewBlock[]
  function Probe():null{
    take=useProducerTransitions({
      api:{takeProgram:async()=>{legacyWrites++;throw Error('Legacy output must not be used')},setEventTransition:async()=>{legacyWrites++}},
      engineTake:ack,programState:null,previewState:null,programBlocks:[],previewBlocks:preview,
      setProgramState:()=>{throw Error('Legacy Program state must not be committed')},
      setProgramBlocks:next=>{assert.ok(Array.isArray(next));program=next},setError:()=>{},
    }).runTake
    return null
  }
  renderToString(createElement(Probe))
  return {take:()=>take('auto','fade',600), state:()=>({legacyWrites,program,preview})}
}

test('engine TAKE acknowledgement commits the original room only after success, without legacy output writes', async()=>{
  let acknowledge!:(value:boolean)=>void
  const pending=new Promise<boolean>(resolve=>{acknowledge=resolve})
  const probe=transitions(()=>pending),taking=probe.take()
  assert.deepEqual(probe.state().program,[])
  acknowledge(true)
  assert.equal(await taking,true)
  const {program,preview,legacyWrites}=probe.state()
  assert.equal(legacyWrites,0)
  assert.deepEqual(program,preview)
  assert.notEqual(program,preview)
  assert.notEqual(program[0],preview[0])
})

test('rejected or failed engine TAKE cannot update the room Program or fall back to legacy output',async()=>{
  for(const ack of [async()=>false,async()=>{throw Error('Engine changed')}]){
    const probe=transitions(ack)
    assert.equal(await probe.take(),false)
    assert.deepEqual(probe.state().program,[])
    assert.equal(probe.state().legacyWrites,0)
  }
})

