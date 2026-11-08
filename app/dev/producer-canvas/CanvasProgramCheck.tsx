'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import type useLibraryProgram from '../producer-media/useLibraryProgram'

/** Observe decoded output transiently; retain only counters, RMS and RGB numbers. */
export default function CanvasProgramCheck({ engine }: { engine: ReturnType<typeof useLibraryProgram> }) {
  const element = useRef<HTMLVideoElement | null>(null)
  const {video:bindVideo}=engine
  const attach=useCallback((node:HTMLVideoElement|null)=>{element.current=node;bindVideo(node)},[bindVideo])
  const [metrics,setMetrics]=useState('Waiting for outgoing Program')
  useEffect(()=>{
    if (!engine.connected) return
    const canvas=document.createElement('canvas');canvas.width=4;canvas.height=1
    const ctx=canvas.getContext('2d',{willReadFrequently:true})!
    let priorFrames=0,priorAt=0,audio:AudioContext|null=null,analyser:AnalyserNode|null=null
    const timer=setInterval(()=>{
      const video=element.current,stream=video?.srcObject as MediaStream|null
      if(!video?.videoWidth||!stream)return
      if(!analyser&&stream.getAudioTracks().length){audio=new AudioContext();analyser=audio.createAnalyser();audio.createMediaStreamSource(stream).connect(analyser);void audio.resume()}
      const data=new Float32Array(1024);analyser?.getFloatTimeDomainData(data)
      const rms=Math.sqrt(data.reduce((sum,value)=>sum+value*value,0)/data.length)
      const points=[[100,100],[1500,150],[150,900],[900,150]]
      points.forEach(([x,y],index)=>ctx.drawImage(video,x,y,1,1,index,0,1,1))
      const rgb=[...ctx.getImageData(0,0,4,1).data].filter((_,index)=>index%4!==3)
      const now=performance.now(),frames=video.getVideoPlaybackQuality().totalVideoFrames
      const fps=priorAt&&frames>=priorFrames?(frames-priorFrames)*1000/(now-priorAt):null;priorAt=now;priorFrames=frames
      setMetrics(JSON.stringify({width:video.videoWidth,height:video.videoHeight,fps,rms,rgb,recording:false}))
    },1000)
    return()=>{clearInterval(timer);if(audio)void audio.close()}
  },[engine.connected])
  return <div><video ref={attach} muted autoPlay playsInline aria-label="Decoded Program output" data-take-timing={engine.takeTiming?JSON.stringify(engine.takeTiming):undefined} className="h-full w-full object-contain"/><output aria-label="Outgoing canvas metrics">{metrics}</output></div>
}
