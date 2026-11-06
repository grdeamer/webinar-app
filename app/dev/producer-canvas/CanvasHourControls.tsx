'use client'
import { useEffect, useRef, useState } from 'react'
import type useLibraryProgram from '../producer-media/useLibraryProgram'
import {engineRequest,engineStatus} from '../producer-media/localProgramTransport'
import type {PreviewBlock} from '@/app/admin/events/[id]/producer/useProducerBlocks'
import {CANVAS_HOUR_SCHEDULE,canvasHourLayout,canvasColorsMatch} from '@/lib/production/canvasHourPlan'
import {createCanvasHourAssets} from './canvasHourFixtures'
const delay=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms))
export default function CanvasHourControls({engine,onCue,onTaken,onRunning}:{engine:ReturnType<typeof useLibraryProgram>;onCue:(blocks:PreviewBlock[])=>void;onTaken:(blocks:PreviewBlock[])=>void;onRunning:(running:boolean)=>void}){
  const live=useRef(engine),cancelled=useRef(false)
  const [running,setRunning]=useState(false),[status,setStatus]=useState('One local hour; four layers, audio, CUT/FADE TAKEs and four server-owned failover tests. Recording off.')
  useEffect(()=>{live.current=engine},[engine])
  useEffect(()=>()=>{cancelled.current=true},[])
  async function run(qualification=false){
    if(running)return
    cancelled.current=false;setRunning(true);onRunning(true)
    let fixture:Awaited<ReturnType<typeof createCanvasHourAssets>>|null=null,runId=''
    try {
      const initial=await engineStatus()
      if(initial.soak?.profile!==(qualification?'multi-canvas-qualification':'multi-canvas-hour')||!initial.runtime.running||initial.recordingEnabled!==false||initial.runtime.cloudDeployed)throw Error('Start the authorized local multi-canvas hour runner first.')
      runId=initial.runtime.runId;fixture=await createCanvasHourAssets()
      if(!live.current.connected)await live.current.connect()
      let started=0
      const schedule=qualification?[{minute:0,phase:'video' as const,transition:'cut' as const},{minute:1.3,phase:'audio' as const,transition:'fade' as const}]:CANVAS_HOUR_SCHEDULE
      for(const step of schedule){
        while(started&&performance.now()-started<step.minute*60000){if(cancelled.current)throw Error('Operator cancelled');if(!live.current.connected)throw Error('Engine disconnected during the hour');await delay(500)}
        if(cancelled.current)throw Error('Operator cancelled')
        const blocks=canvasHourLayout(step.phase,fixture.assets)
        setStatus(`Cueing four-source ${step.phase} canvas`);onCue(blocks);await delay(300)
        const until=performance.now()+45000;let taken=false
        while(performance.now()<until){if(cancelled.current)throw Error('Operator cancelled');if(live.current.ready&&await live.current.take({type:step.transition,durationMs:step.transition==='fade'?250:0})){taken=true;break}await delay(250)}
        if(!taken)throw Error('Canvas TAKE failed: '+live.current.message)
        onTaken(structuredClone(blocks))
        const confirm=performance.now()+15000
        while(true){
          const state=await engineStatus(),observed=state.runtime.observer
          if(state.runtime.runId!==runId||!state.runtime.running)throw Error('Local engine changed or stopped')
          if(observed?.revision===state.state.revision&&Date.now()-observed.lastGoodAtMs<800&&canvasColorsMatch(observed.canvasRgb,step.phase)&&observed.audioRms>.0005)break
          if(performance.now()>confirm)throw Error('Decoded four-source output was not confirmed')
          await delay(250)
        }
        await engineRequest('soak',{runId,phase:step.phase,transition:step.transition})
        if(!started)started=performance.now()
        setStatus(`Running: ${step.phase}, four sources, ${step.transition.toUpperCase()} TAKE at minute ${step.minute}. Server owns faults and assessment.`)
      }
      while(live.current.connected&&performance.now()-started<(qualification?5:65)*60000){if(cancelled.current)throw Error('Operator cancelled');await delay(500)}
      setStatus('Server test ended. The saved result and verified cleanup determine pass/fail.')
    }catch(error){
      const message=error instanceof Error?error.message:'Canvas hour failed';setStatus(message)
      if(runId)await engineRequest('soak',{runId,error:message}).catch(()=>{})
    }finally{await live.current.stop();fixture?.stop();onCue([]);onTaken([]);setRunning(false);onRunning(false)}
  }
  return <section className="my-4 border border-white/20 p-3"><h2>Authorized multi-source 60-minute local soak</h2><p role="status">{status}</p><button disabled={running} onClick={()=>void run()}>Run authorized multi-source hour</button><button disabled={running} onClick={()=>void run(true)}>Run bounded observer qualification</button>{running?<button onClick={()=>{cancelled.current=true}}>Cancel multi-source hour</button>:null}<p>Keep this tab open. No recording, deployment, external rooms or paid workers. Failure stops the run; no automatic retry.</p></section>
}
