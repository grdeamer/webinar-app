"use client"
import {useEffect,useRef,useState} from 'react'
import type useLibraryProgram from '@/app/dev/producer-media/useLibraryProgram'
import {engineRequest,engineStatus,type StudioTransport} from '@/app/dev/producer-media/localProgramTransport'
import type {ProgramMixerSnapshot} from '@/lib/producer/programAudioMix'
import {MIXED_MEDIA_SCHEDULE} from '@/lib/producer/mixedMediaSchedule'
import {buildProducerAssetUrl} from './producerAssetUrls'
import type {PreviewBlock} from './useProducerBlocks'
type Asset={id:string;label:string;asset_type:string;storage_path:string;metadata?:{deck?:{pageCount:number}}}
type Props={eventId:string;transport:StudioTransport;engine:ReturnType<typeof useLibraryProgram>;soak:NonNullable<ProgramMixerSnapshot['soak']>;onCue:(blocks:PreviewBlock[])=>void;onTake:()=>Promise<boolean>}
const delay=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms))
export default function OriginalRoomSoakControls(props:Props){
 const latest=useRef(props),cancel=useRef(false),[running,setRunning]=useState(false),[message,setMessage]=useState('Only the separately approved single-use hour profile can run this test.')
 useEffect(()=>{latest.current=props},[props])
 useEffect(()=>()=>{cancel.current=true},[])
 async function run(){if(running||props.soak.outcome!=='waiting-for-browser')return;setRunning(true);cancel.current=false
  const {transport,eventId,soak}=props
  try{
   const response=await fetch(`/api/admin/events/${eventId}/live/assets/commit`,{cache:'no-store'});if(!response.ok)throw Error('Cannot read this event’s fixture library')
   const assets=((await response.json()).assets??[]) as Asset[],video=assets.find(a=>a.label==='Soak 1080p30'&&a.asset_type==='video'),audio=assets.find(a=>a.label==='test-tone'&&a.asset_type==='audio'),slides=assets.find(a=>a.label==='source 3'&&a.asset_type==='pdf'&&a.metadata?.deck?.pageCount===3)
   if(!video||!audio||!slides)throw Error('Upload the generated Soak 1080p30 video, test-tone audio and three-slide source 3 deck first')
   let begin=0
   for(const step of MIXED_MEDIA_SCHEDULE){
    while(begin&&performance.now()-begin<step.minute*60000){if(cancel.current||!latest.current.engine.connected)throw Error('Browser source disconnected or cancelled');await delay(500)}
    const asset=step.phase==='video'?video:step.phase==='audio'?audio:slides
    const block:PreviewBlock={id:crypto.randomUUID(),type:step.phase==='video'?'video':step.phase==='audio'?'audio':'pdf',x:0,y:0,width:640,height:360,zIndex:1,borderRadius:0,shadowIntensity:0,groupId:'source-route',label:`Hour ${step.phase}`,src:buildProducerAssetUrl(eventId,asset.storage_path),pdfPage:step.phase==='slide2'?2:1,loop:true}
    setMessage('Cueing '+step.phase);latest.current.onCue([block]);await delay(500)
    let taken=false;const until=Date.now()+30000
    while(Date.now()<until){if(cancel.current||!latest.current.engine.connected)throw Error('Browser source disconnected or cancelled');if(!latest.current.engine.busy&&await latest.current.onTake()){taken=true;break}await delay(300)}
    if(!taken)throw Error('TAKE was not confirmed')
    const confirm=Date.now()+15000
    while(true){const s=await engineStatus(transport);if(s.runtime.runId!==soak.runId)throw Error('Engine runtime changed');if(s.runtime.observer?.revision===s.state.revision&&Date.now()-s.runtime.observer.lastGoodAtMs<800)break;if(Date.now()>confirm)throw Error('Outgoing phase was not confirmed');await delay(300)}
    const report=await engineRequest('soak',{runId:soak.runId,phase:step.phase},undefined,transport);if(!begin)begin=performance.now()-(Date.now()-report.startedAtMs)
    setMessage(`Running · ${step.phase} · minute ${step.minute}`)
   }
   while(true){if(cancel.current)throw Error('Operator cancelled');const s=await engineStatus(transport);if(s.runtime.runId!==soak.runId)throw Error('Engine runtime changed');if(['completed','failed'].includes(s.soak?.outcome))break;await delay(2000)}
   setMessage('Run ended. Review the saved server result; completion alone is not a pass.')
  }catch{setMessage('Browser schedule ended or failed. Review the saved server result; no automatic retry.');await engineRequest('soak',{runId:soak.runId,error:'Browser schedule failed'},undefined,transport).catch(()=>{})}
  finally{await latest.current.engine.stop();setRunning(false)}
 }
 return <section aria-label="Approved mixed-media hour test" className="mt-2 rounded border border-sky-300/20 p-2"><strong>Approved original-room hour · $2 maximum · recording off</strong><p role="status">{message}</p><p>{props.soak.phase||'Waiting'} · {Math.floor(props.soak.elapsedMs/60000)} minutes observed · automatic cloud stop {new Date(props.soak.cloudStopAtMs).toLocaleTimeString()}</p><button type="button" disabled={running||props.soak.outcome!=='waiting-for-browser'} onClick={()=>void run()} className="rounded border px-3 py-1 disabled:opacity-40">Run approved 60-minute mixed-media test</button>{running?<button type="button" onClick={()=>{cancel.current=true}} className="ml-2 rounded border px-3 py-1">Cancel test</button>:null}<p>Keep this tab open. The server owns all stall/crash injection and cleanup. No recording or automatic retry.</p></section>
}
