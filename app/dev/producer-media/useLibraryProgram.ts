'use client'
import {watchPresentedProgramRevision,type ProgramTakeTiming} from '@/lib/producer/programTakeTiming'
import {assertPreparedPreview,preparedProgramConfirmed,type ProgramTakeReceipt} from '@/lib/producer/preparedProgramTake'
import {libraryInputReady} from '@/lib/producer/libraryInputReady'
import type {Composition} from '@/lib/production/contracts'
import {libraryCanvasPlan,libraryCanvasInputBlock} from '@/lib/producer/libraryCanvasPlan'
import { useCallback, useEffect, useRef, useState } from 'react'
import {bindProgramMonitor,clearProgramMonitor,setProgramMonitorStream,type ProgramMonitorBinding} from '@/lib/producer/programMonitor'
import {libraryEngineComposition} from '@/lib/producer/libraryEngineComposition'
import type { PreviewBlock } from '@/app/admin/events/[id]/producer/useProducerBlocks'
import { LibraryPublisher, connectProgram, engineCommand, engineStatus, LOCAL_STUDIO_TRANSPORT, type StudioTransport } from './localProgramTransport'
export default function useLibraryProgram(preview:PreviewBlock[],transport:StudioTransport=LOCAL_STUDIO_TRANSPORT) {
 const [confirmedKey,setConfirmedKey]=useState<string|null>(null),[awaitingPicture,setAwaitingPicture]=useState(false)
 const [takeTiming,setTakeTiming]=useState<ProgramTakeTiming|null>(null)
 const timing=useRef<{start:number;startedAtMs:number;cancel?:()=>void}|null>(null)
 const receipt=useRef<ProgramTakeReceipt|null>(null),connectionEpoch=useRef(0)
 const [cueKey,setCueKey]=useState<string|null>(null)
 const [connected,setConnected]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('Connect the Program engine to begin.')
 const video=useRef<HTMLVideoElement>(null),run=useRef(''),active=useRef<string|null>(null),cued=useRef<{role:'source-a'|'source-b';key:string;composition:Composition;sid:string}|null>(null),publishers=useRef(new Map<string,LibraryPublisher>()),viewer=useRef<null|(()=>Promise<void>)>(null),epoch=useRef(0),queue=useRef(Promise.resolve()),taking=useRef(false)
 const monitor=useRef<ProgramMonitorBinding>({element:null,stream:null})
 const attachVideo=useCallback((element:HTMLVideoElement|null)=>{bindProgramMonitor(monitor.current,element);video.current=element},[])
 const stop=useCallback(async()=>{epoch.current++;connectionEpoch.current++;setConnected(false);timing.current?.cancel?.();timing.current=null;receipt.current=null;setConfirmedKey(null);setAwaitingPicture(false);cued.current=null;setCueKey(null);if(active.current)await engineCommand(run.current,{type:"SET_LIVE",live:false},transport).catch(():void=>{});active.current=null;await queue.current.catch(():void=>{});await Promise.all([...publishers.current.values()].map(p=>p.stop()));publishers.current.clear();await viewer.current?.();viewer.current=null;clearProgramMonitor(monitor.current);setBusy(false);setMessage('Studio inputs and outgoing monitor disconnected.')},[transport])
 useEffect(()=>()=>{void stop()},[stop])
 async function connect(signal?:AbortSignal){
  const generation=++connectionEpoch.current
  setBusy(true)
  try{
   signal?.throwIfAborted()
   const s=await engineStatus(transport)
   if(signal?.aborted||generation!==connectionEpoch.current)return
   if(!s.runtime.running||Date.now()>=s.runtime.expiresAtMs)throw Error('Start the producer engine, then wait for it to become ready.')
   run.current=s.runtime.runId
   if(!video.current)throw Error('Program monitor unavailable')
   const disconnect=await connectProgram(video.current,run.current,transport,(stream,owned)=>{if(generation!==connectionEpoch.current&&stream)return;if(stream||monitor.current.stream===owned)setProgramMonitorStream(monitor.current,stream)})
   if(signal?.aborted||generation!==connectionEpoch.current){await disconnect();return}
   viewer.current=disconnect;setConnected(true);setMessage('Connected to the Program engine. Cue a source.')
  }catch(e){if(!signal?.aborted&&generation===connectionEpoch.current)setMessage(e instanceof Error?e.message:'Connection failed')}
  finally{if(generation===connectionEpoch.current)setBusy(false)}
 }
 useEffect(()=>{
  if(!connected)return
  let cancelled=false,timer:ReturnType<typeof setTimeout>
  async function poll(){
   try{
    const s=await engineStatus(transport)
    if(cancelled)return
    if(!s.runtime.running||s.runtime.runId!==run.current||Date.now()>=s.runtime.expiresAtMs){void stop();return}
    if(receipt.current){const confirmed=preparedProgramConfirmed(s,receipt.current);setConfirmedKey(confirmed?receipt.current.key:null);if(confirmed){if(timing.current){const ms=performance.now()-timing.current.start;setTakeTiming(previous=>previous&&previous.observerConfirmedMs===undefined?{...previous,observerConfirmedMs:ms}:previous)}setAwaitingPicture(false);if(cued.current?.key===receipt.current.key)setMessage('Program receiver confirmed the committed canvas. Verify the outgoing picture and audio.')}}
   }catch{if(!cancelled)void stop();return}
   if(!cancelled)timer=setTimeout(()=>void poll(),awaitingPicture?250:1500)
  }
  // Confirm immediately after acceptance, without waiting for the idle poll.
  // Self-scheduling prevents overlapping status requests on slower connections.
  timer=setTimeout(()=>void poll(),awaitingPicture?0:1500)
  return ()=>{cancelled=true;clearTimeout(timer)}
 },[connected,stop,transport,awaitingPicture])
 useEffect(()=>{
  if(!connected)return
  const generation=++epoch.current,key=JSON.stringify(preview);cued.current=null;setCueKey(null);setConfirmedKey(null)
  if(!preview.some(block=>!block.hidden)){setBusy(false);setMessage('Add a visible source to Preview. Current Program is unchanged.');return}
  setBusy(true)
  queue.current=queue.current.catch(():void=>{}).then(async()=>{
   if(generation!==epoch.current)return
   const plan=libraryCanvasPlan(preview),composed=plan.length>1||plan[0].type==='text'
   const state=await engineStatus(transport)
   const programSources=state.state.desiredLifecycle==='live' ? state.state.program.composition.layers.map((layer:{sourceId?:string})=>layer.sourceId) : []
   if(programSources.includes('camera-a')&&programSources.includes('camera-b'))throw Error('Both inputs are on Program. Stop the current rehearsal output before cueing a library source.')
   const role=programSources.includes('camera-a')?'source-b':programSources.includes('camera-b')?'source-a':active.current==='source-a'?'source-b':'source-a'
   await publishers.current.get(role)?.stop();publishers.current.delete(role)
   const publisher=new LibraryPublisher(role,transport);publishers.current.set(role,publisher)
   try {if(composed)await publisher.startCanvas(plan);else await publisher.start(plan[0]);if(generation!==epoch.current){await publisher.stop();return}
    const sourceId=role==='source-a'?'camera-a':'camera-b'
    const composition=libraryEngineComposition(composed?libraryCanvasInputBlock():plan[0],sourceId,'library-'+crypto.randomUUID())
    await engineCommand(run.current,{type:'SET_PREVIEW',composition},transport)
    await engineCommand(run.current,{type:'SET_AUDIO',bus:'preview',audio:{masterGainDb:0,muted:false,channels:[{sourceId,gainDb:0,muted:false,solo:false}]}},transport)
    const owned=await engineStatus(transport),sid=owned.state.bindings[sourceId]?.trackSid
    if(!sid||!libraryInputReady(owned,role,sid))throw Error('Prepared input is no longer decoded by both candidates')
    cued.current={role,key,composition,sid};setCueKey(key);setMessage(`${plan.length} canvas layer${plan.length===1?'':'s'} decoded by both candidates. Preview ready; TAKE to update the whole Program.`)
   }catch(e){await publisher.stop();throw e}
  }).catch(e=>{if(generation===epoch.current)setMessage(e instanceof Error?e.message:'Cue failed')}).finally(()=>{if(generation===epoch.current)setBusy(false)})
 },[preview,connected,transport])
 async function setLive(live:boolean){if(!connected)throw Error('Connect the Program engine first');await engineCommand(run.current,{type:'SET_LIVE',live},transport)}
 async function take(transition:{type:'cut'|'fade'|'warp'|'curtain';durationMs:number}={type:'cut',durationMs:0}){
  if(taking.current||busy||!connected||!cued.current||cued.current.key!==JSON.stringify(preview))return false
  taking.current=true;setBusy(true)
  timing.current?.cancel?.()
  const measured={start:performance.now(),startedAtMs:Date.now(),cancel:undefined as undefined|(()=>void)}
  timing.current=measured;setTakeTiming({startedAtMs:measured.startedAtMs})
  try {
   if(publishers.current.get(cued.current.role)?.failure)throw Error('Input lease is unhealthy; cue the source again')
   const cue=cued.current,role=cue.role
   await publishers.current.get(role)?.take()
   const before=await engineStatus(transport)
   assertPreparedPreview(before,run.current,cue.composition)
   if(!libraryInputReady(before,role,cue.sid))throw Error('Prepared input changed or went stale; TAKE was blocked.')
   setTakeTiming(previous=>previous?{...previous,preflightMs:performance.now()-measured.start}:previous)
   const picture=watchPresentedProgramRevision(video.current,before.state.revision+1)
   measured.cancel=picture.cancel
   const committed=await engineCommand(run.current,{type:'TAKE',transition},transport,before.state.revision)
   setTakeTiming(previous=>previous?{...previous,acceptedMs:performance.now()-measured.start}:previous)
   void picture.promise.then(value=>{if(timing.current!==measured)return;setTakeTiming(previous=>previous?{...previous,...(value.atMs===null?{pictureError:value.error}:{presentedMs:value.atMs-measured.start})}:previous)})
   receipt.current={runId:run.current,revision:committed.receipt.revision,key:cue.key,composition:cue.composition}
   setConfirmedKey(null);setAwaitingPicture(true);active.current=role
   try{
    if(before.state.desiredLifecycle!=='live')await engineCommand(run.current,{type:'SET_LIVE',live:true},transport)
    setMessage('TAKE accepted. Waiting for the outgoing receiver to confirm this canvas; do not repeat TAKE.')
   }catch{setMessage('TAKE committed, but output activation was not confirmed. Check engine status and use Go Live; do not repeat the TAKE.')}
   return true
  }catch(e){measured.cancel?.();setMessage(e instanceof Error?e.message:'TAKE failed');return false}
  finally{taking.current=false;setBusy(false)}
 }

 function setMonitorVolume(value:number){if(video.current)video.current.volume=Math.max(0,Math.min(1,value))}
 return {connected,busy,takeTiming,programMatched:confirmedKey===JSON.stringify(preview),ready:connected&&!busy&&!awaitingPicture&&cueKey===JSON.stringify(preview),message,video:attachVideo,connect,stop,take,setLive,setMonitorVolume}
}
