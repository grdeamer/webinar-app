import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'

test('disconnect releases browser resources without changing authoritative lifecycle or stopping workers', async () => {
  const effects: (() => void | (()=>void))[] = [], refs:{current:unknown}[] = [], commands:unknown[] = []
  let disconnected=0,publisherStopped=0,monitorCleared=0
  const local={LOCAL_STUDIO_TRANSPORT:{root:'/local',relayUrl:'ws://127.0.0.1'},engineCommand:async(...args:unknown[])=>{commands.push(args)}}
  const react={useCallback:(fn:unknown)=>fn,useEffect:(effect:()=>void|(()=>void))=>effects.push(effect),useRef:(value:unknown)=>{const ref={current:value};refs.push(ref);return ref},useState:(value:unknown)=>[value,()=>{}]}
  const source=ts.transpileModule(readFileSync(new URL('../app/dev/producer-media/useLibraryProgram.ts',import.meta.url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText
  const exports:Record<string,unknown>={}
  runInNewContext(source,{exports,module:{exports},Map,Promise,Date,require:(name:string)=>name==='react'?react:name==='./localProgramTransport'?local:name==='@/lib/producer/programMonitor'?{clearProgramMonitor:()=>{monitorCleared++}}:{}})
  const hook=(exports.default as (preview:unknown[])=>{stop:()=>Promise<void>})([])
  // Simulate an already-active, cued publisher and connected output monitor.
  refs.find(r=>r.current instanceof Map)!.current=new Map([['source-a',{stop:async()=>{publisherStopped++}}]])
  // Viewer is the ref initialized to null immediately after the publishers map.
  const publisherIndex=refs.findIndex(r=>r.current instanceof Map)
  refs[publisherIndex-2].current="source-a"
  refs[publisherIndex+1].current=async()=>{disconnected++}
  await hook.stop()
  assert.deepEqual(commands,[]);assert.equal(publisherStopped,1);assert.equal(disconnected,1);assert.equal(monitorCleared,1)
  for(const effect of effects){const cleanup=effect();if(cleanup)cleanup()}
  await Promise.resolve();await Promise.resolve()
  assert.deepEqual(commands,[])
})
