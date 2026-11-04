'use client'
import {useCallback,useEffect,useRef,useState} from 'react'
import type {ProgramMixerController,ProgramMixerSnapshot} from './programAudioMix'
import {engineCommand,engineStatus,type StudioTransport} from '@/app/dev/producer-media/localProgramTransport'
import type {AudioMix} from '../production/contracts'
export function mixerSnapshot(status:Awaited<ReturnType<typeof engineStatus>>):ProgramMixerSnapshot {
 const {runtime,state}=status,receiver=runtime.observer
 return {runId:runtime.runId,revision:state.revision,running:runtime.running,live:state.desiredLifecycle==='live',expiresAtMs:runtime.expiresAtMs,recordingEnabled:false,...(status.soak?.mode==='original-room-mixed-hour'&&status.soak.runId===runtime.runId?{soak:status.soak}:{}),mix:state.program.audio,channels:Object.values(state.sources as Record<string,{sourceId:string;label:string}>).map(s=>({sourceId:s.sourceId,label:s.label})),receiver:receiver?{revision:receiver.revision,atMs:receiver.atMs,audioRms:receiver.audioRms,dominantHz:receiver.dominantHz,width:receiver.width,height:receiver.height,fps:receiver.rtc?.framesPerSecond??null}:null}
}
export default function useHostedProgramMixer(transport:StudioTransport,enabled:boolean):ProgramMixerController {
 const [snapshot,setSnapshot]=useState<ProgramMixerSnapshot|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState<string|null>(null),pending=useRef(false)
 const refresh=useCallback(async()=>{const next=mixerSnapshot(await engineStatus(transport));setSnapshot(next);return next},[transport])
 useEffect(()=>{if(!enabled){setSnapshot(null);return}let active=true;let polling=false;const poll=async()=>{if(polling||pending.current)return;polling=true;try{const next=mixerSnapshot(await engineStatus(transport));if(active)setSnapshot(next)}catch{if(active)setSnapshot(null)}finally{polling=false}};void poll();const timer=setInterval(()=>void poll(),1500);return()=>{active=false;clearInterval(timer)}},[enabled,transport])
 async function apply(mix:AudioMix,expected:{runId:string;revision:number}){if(pending.current||!enabled)return false;pending.current=true;setBusy(true);setError(null);try{await engineCommand(expected.runId,{type:'SET_AUDIO',bus:'program',audio:mix},transport,expected.revision);await refresh();return true}catch(e){setError(e instanceof Error?e.message:'Mixer command failed');await refresh().catch(()=>{});return false}finally{pending.current=false;setBusy(false)}}
 return {snapshot,busy,error,apply,prepare:async()=>false,allowPrepare:false,stoppedMessage:'Connect the producer engine to control outgoing Program audio.'}
}
