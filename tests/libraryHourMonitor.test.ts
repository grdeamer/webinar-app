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
  const runtime={runId:'d86db408-4bb5-44b5-aeca-507a656d00bf'} as LocalHaRuntime
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
