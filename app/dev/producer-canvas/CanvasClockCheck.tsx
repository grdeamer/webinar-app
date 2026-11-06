'use client'
import { useState } from 'react'
type FrameTrack=MediaStreamTrack&{writable:WritableStream<VideoFrame>}
type FrameApi={MediaStreamTrackGenerator:new(options:{kind:'video'})=>FrameTrack;MediaStreamTrackProcessor:new(options:{track:MediaStreamTrack})=>{readable:ReadableStream<VideoFrame>}}

/** Bounded in-memory worker check: natural EOF holds, stalled decoding fails closed. */
async function checkClock(naturalEnd:boolean) {
  const api=globalThis as unknown as FrameApi,track=new api.MediaStreamTrackGenerator({kind:'video'})
  const worker=new Worker(new URL('../../../lib/producer/canvasProgramSource.worker.ts',import.meta.url),{type:'module'})
  const reader=new api.MediaStreamTrackProcessor({track}).readable.getReader()
  const canvas=new OffscreenCanvas(640,360),paint=canvas.getContext('2d')!;paint.fillStyle='#124e78';paint.fillRect(0,0,640,360)
  const frame=new VideoFrame(canvas,{timestamp:0})
  const readable=new ReadableStream<VideoFrame>({start(controller){controller.enqueue(frame);controller.close()}})
  let failed=false,timer:ReturnType<typeof setTimeout>,frames=0,width=0,height=0
  const failure=new Promise<never>((_,reject)=>{worker.onmessage=event=>{if(event.data?.error){failed=true;reject(Error('decoder stalled'))}};worker.onerror=()=>reject(Error('worker failed'))})
  const timeout=new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(Error('clock check deadline')),6000)})
  try {
    worker.postMessage({layers:[{block:{id:'ended-file',type:'video',x:0,y:0,width:640,height:360,zIndex:1},readable}],writable:track.writable},[readable,track.writable])
    if(naturalEnd)worker.postMessage({endedId:'ended-file'})
    while(frames<95){
      const result=await Promise.race([reader.read(),failure,timeout]);if(result.done)break
      frames++;width=result.value.displayWidth;height=result.value.displayHeight;result.value.close()
    }
    if(!naturalEnd)throw Error('Stalled video was not rejected')
    if(width!==1920||height!==1080||frames<95||failed)throw Error('Natural EOF interrupted the canvas')
    return {naturalEnd:true,frames,width,height,heldAfterEnd:true}
  } catch(error) {
    if(!naturalEnd&&failed)return {naturalEnd:false,stalledDecoderRejected:true,frames}
    throw error
  } finally {clearTimeout(timer);track.stop();worker.terminate();await reader.cancel().catch(()=>{})}
}
export default function CanvasClockCheck(){
 const [result,setResult]=useState('Not run'),[busy,setBusy]=useState(false)
 async function run(){setBusy(true);try{const eof=await checkClock(true),stall=await checkClock(false);setResult(JSON.stringify({passed:true,eof,stall,recording:false,tracksStopped:true}))}catch(error){setResult(error instanceof Error?error.message:'Clock check failed')}finally{setBusy(false)}}
 return <section><button disabled={busy} onClick={()=>void run()}>Check canvas EOF and stall safety</button><output aria-label="Canvas clock check">{result}</output></section>
}
