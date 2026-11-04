'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import {libraryEngineComposition} from '@/lib/producer/libraryEngineComposition'
import type { PreviewBlock } from '@/app/admin/events/[id]/producer/useProducerBlocks'
import { LibraryPublisher, connectProgram, engineCommand, engineStatus, LOCAL_STUDIO_TRANSPORT, type StudioTransport } from './localProgramTransport'
export default function useLibraryProgram(preview:PreviewBlock[],transport:StudioTransport=LOCAL_STUDIO_TRANSPORT) {
 const [connected,setConnected]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('Connect the Program engine to begin.')
 const video=useRef<HTMLVideoElement>(null),run=useRef(''),active=useRef<string|null>(null),cued=useRef<{role:'source-a'|'source-b';key:string}|null>(null),publishers=useRef(new Map<string,LibraryPublisher>()),viewer=useRef<null|(()=>Promise<void>)>(null),epoch=useRef(0),queue=useRef(Promise.resolve()),taking=useRef(false)
 const stop=useCallback(async()=>{epoch.current++;setConnected(false);cued.current=null;if(active.current)await engineCommand(run.current,{type:"SET_LIVE",live:false},transport).catch(():void=>{});active.current=null;await queue.current.catch(():void=>{});await Promise.all([...publishers.current.values()].map(p=>p.stop()));publishers.current.clear();await viewer.current?.();viewer.current=null;setMessage('Studio inputs and outgoing monitor disconnected.')},[transport])
 useEffect(()=>()=>{void stop()},[stop])
 async function connect(){setBusy(true);try{const s=await engineStatus(transport);if(!s.runtime.running||Date.now()>=s.runtime.expiresAtMs)throw Error('Start the producer engine, then wait for it to become ready.');run.current=s.runtime.runId;if(!video.current)throw Error('Program monitor unavailable');viewer.current=await connectProgram(video.current,run.current,transport);setConnected(true);setMessage('Connected to the Program engine. Cue a source.')}catch(e){setMessage(e instanceof Error?e.message:'Connection failed')}finally{setBusy(false)}}
 useEffect(()=>{
  if(!connected)return
  const timer=setInterval(()=>{void engineStatus(transport).then((s):void=>{if(!s.runtime.running||s.runtime.runId!==run.current||Date.now()>=s.runtime.expiresAtMs)void stop()}).catch(():void=>{void stop()})},1500)
  return ()=>clearInterval(timer)
 },[connected,stop,transport])
 useEffect(()=>{
  if(!connected||!preview.length)return
  const generation=++epoch.current,key=JSON.stringify(preview);cued.current=null;setBusy(true)
  queue.current=queue.current.catch(():void=>{}).then(async()=>{
   if(generation!==epoch.current)return
   if(preview.length!==1)throw Error('This studio currently supports one full-frame library source at a time.')
   const state=await engineStatus(transport)
   const programSources=state.state.desiredLifecycle==='live' ? state.state.program.composition.layers.map((layer:{sourceId?:string})=>layer.sourceId) : []
   if(programSources.includes('camera-a')&&programSources.includes('camera-b'))throw Error('Both inputs are on Program. Stop the current rehearsal output before cueing a library source.')
   const role=programSources.includes('camera-a')?'source-b':programSources.includes('camera-b')?'source-a':active.current==='source-a'?'source-b':'source-a'
   await publishers.current.get(role)?.stop();publishers.current.delete(role)
   const publisher=new LibraryPublisher(role,transport);publishers.current.set(role,publisher)
   try {await publisher.start(preview[0]);if(generation!==epoch.current){await publisher.stop();return}
    const sourceId=role==='source-a'?'camera-a':'camera-b'
    await engineCommand(run.current,{type:'SET_PREVIEW',composition:libraryEngineComposition(preview[0],sourceId)},transport)
    await engineCommand(run.current,{type:'SET_AUDIO',bus:'preview',audio:{masterGainDb:0,muted:false,channels:[{sourceId,gainDb:0,muted:false,solo:false}]}},transport)
    cued.current={role,key};setMessage('Source published to the private input. Preview ready; TAKE to update outgoing Program.')
   }catch(e){await publisher.stop();throw e}
  }).catch(e=>{if(generation===epoch.current)setMessage(e instanceof Error?e.message:'Cue failed')}).finally(()=>{if(generation===epoch.current)setBusy(false)})
 },[preview,connected,transport])
 async function setLive(live:boolean){if(!connected)throw Error('Connect the Program engine first');await engineCommand(run.current,{type:'SET_LIVE',live},transport)}
 async function take(transition:{type:'cut'|'fade'|'warp'|'curtain';durationMs:number}={type:'cut',durationMs:0}){if(taking.current||busy||!connected||!cued.current||cued.current.key!==JSON.stringify(preview))return false;taking.current=true;setBusy(true)
  try {if(publishers.current.get(cued.current.role)?.failure)throw Error('Input lease is unhealthy; cue the source again');const role=cued.current.role;await publishers.current.get(role)?.take();await engineCommand(run.current,{type:'TAKE',transition},transport);active.current=role;try{await engineCommand(run.current,{type:'SET_LIVE',live:true},transport);setMessage('TAKE committed to the actual Program engine. Verify the outgoing picture and audio.')}catch{setMessage('TAKE committed, but output activation was not confirmed. Check engine status and use Go Live; do not repeat the TAKE.')}return true}catch(e){setMessage(e instanceof Error?e.message:'TAKE failed');return false}finally{taking.current=false;setBusy(false)}}
 function setMonitorVolume(value:number){if(video.current)video.current.volume=Math.max(0,Math.min(1,value))}
 return {connected,busy,message,video,connect,stop,take,setLive,setMonitorVolume}
}
