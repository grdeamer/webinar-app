import assert from 'node:assert/strict'
import test from 'node:test'
import {createElement} from 'react'
import {renderToString} from 'react-dom/server'
import useProducerTransitions from '../app/admin/events/[id]/producer/useProducerTransitions.ts'
import {enginePreviewNeedsTake} from '../app/admin/events/[id]/producer/producerRoomStatusUtils.ts'
import type {PreviewBlock} from '../app/admin/events/[id]/producer/useProducerBlocks.ts'

// Exercise the real hooks' async command boundary without media workers or a browser.
function transitions(ack:()=>Promise<boolean>) {
  let take: ReturnType<typeof useProducerTransitions>['runTake']
  let legacyWrites=0, program:PreviewBlock[]=[]
  const preview=[{id:'slide',type:'pdf',src:'blob:test',pdfPage:2}] as PreviewBlock[]
  let queued=preview
  function Probe():null{
    take=useProducerTransitions({
      api:{takeProgram:async()=>{legacyWrites++;throw Error('Legacy output must not be used')},setEventTransition:async()=>{legacyWrites++}},
      engineTake:ack,programState:null,previewState:null,programBlocks:program,previewBlocks:queued,
      setProgramState:()=>{throw Error('Legacy Program state must not be committed')},
      setProgramBlocks:next=>{assert.ok(Array.isArray(next));program=next},
      setPreviewBlocks:next=>{queued=typeof next==='function'?next(queued):next},setError:()=>{},
    }).runTake
    return null
  }
  return {
    take:()=>{renderToString(createElement(Probe));return take('cut')},
    cue:(blocks:PreviewBlock[])=>{queued=blocks},
    state:()=>({legacyWrites,program,preview,queued}),
  }
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
    assert.equal(probe.state().queued,probe.state().preview)
    assert.equal(probe.state().legacyWrites,0)
  }
})


test('successive cuts alternate Program and Preview without cueing either source again',async()=>{
  const probe=transitions(async()=>true)
  const red=probe.state().preview
  const teal=[{...red[0],id:'teal',type:'image',src:'blob:teal'}] as PreviewBlock[]
  assert.equal(await probe.take(),true)
  probe.cue(teal)
  for(const [program,preview] of [[teal,red],[red,teal],[teal,red]]){
    assert.equal(await probe.take(),true)
    assert.deepEqual(probe.state().program,program)
    assert.deepEqual(probe.state().queued,preview)
  }
})

test('a cold engine can TAKE the same saved canvas again after the previous successful TAKE',async()=>{
  const probe=transitions(async()=>true)
  assert.equal(await probe.take(),true)
  const {preview,program}=probe.state()
  assert.equal(enginePreviewNeedsTake(preview,program,true),false)
  // Engine stop/restart changes its live state, while the saved room canvas is identical.
  assert.equal(enginePreviewNeedsTake(preview,program,false),true)
  assert.equal(enginePreviewNeedsTake(preview,program,true),false)
  assert.equal(enginePreviewNeedsTake([...preview,{id:'second',type:'image',src:'blob:second'}] as PreviewBlock[],program,true),true)
})
