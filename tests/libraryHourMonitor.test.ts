import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {LibraryHourMonitor} from '../lib/production/libraryHourMonitor.ts'
import type {LocalHaRuntime} from '../lib/production/localHaRuntime.ts'

test('hour monitor rejects wrong runtime and non-video startup, then preserves interruption as failure',()=>{
 const directory=mkdtempSync(join(tmpdir(),'jupiter-monitor-test-'))
 try{
  const runtime={runId:'d86db408-4bb5-44b5-aeca-507a656d00bf'} as unknown as LocalHaRuntime
  const monitor=new LibraryHourMonitor(runtime,directory,async()=>{})
  assert.throws(()=>monitor.report({runId:'other',phase:'video'}),/Run changed/)
  assert.throws(()=>monitor.report({runId:runtime.runId,phase:'audio'}),/begin with video/)
  monitor.report({runId:runtime.runId,phase:'video'})
  assert.equal(monitor.summary().outcome,'running')
  monitor.interrupted('deadline')
  assert.equal(monitor.summary().outcome,'failed')
  assert.equal(monitor.result.error,'Engine interrupted: deadline')
  monitor.cleaned({workers:[],sfuRunning:false} as unknown as ReturnType<LocalHaRuntime['status']>)
  assert.deepEqual((monitor.result.cleanup as {workersStopped:boolean}).workersStopped,true)
  assert.equal(monitor.summary().outcome,'failed')
 }finally{rmSync(directory,{recursive:true,force:true})}
})


test('multi-canvas phases require decoded slide, graphic and audio evidence',()=>{
 const directory=mkdtempSync(join(tmpdir(),'jupiter-canvas-monitor-'))
 try{
  const report={canvasRgb:[13,41,56,22,114,74],audioRms:.04,revision:5,lastSelection:{videoGapMs:90}}
  const runtime={runId:'2d554c68-2d47-4648-a552-f8d5d3a5d765',status:()=>({observer:report})} as unknown as LocalHaRuntime
  const monitor=new LibraryHourMonitor(runtime,directory,async()=>{},undefined,true)
  monitor.report({runId:runtime.runId,phase:'video',transition:'cut'})
  assert.equal(monitor.result.profile,'multi-canvas-hour');assert.equal(monitor.result.events[0].pictureGapMs,90)
  assert.throws(()=>monitor.report({runId:runtime.runId,phase:'slide2'}),/not confirmed/)
  report.audioRms=0;assert.throws(()=>monitor.report({runId:runtime.runId,phase:'video'}),/not confirmed/)
 }finally{rmSync(directory,{recursive:true,force:true})}
})
