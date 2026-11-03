'use client'
import { useEffect, useRef, useState } from 'react'
import type { PreviewBlock } from '@/app/admin/events/[id]/producer/useProducerBlocks'
import { listLocalMedia } from '@/lib/producer/localMediaLibrary'
import type useLibraryProgram from './useLibraryProgram'
import { engineRequest, engineStatus } from './localProgramTransport'
const schedule=[{minute:0,phase:'video'},{minute:5,phase:'slide1'},{minute:8,phase:'audio'},{minute:12,phase:'video'},{minute:18,phase:'slide2'},{minute:22,phase:'audio'},{minute:28,phase:'video'},{minute:35,phase:'slide1'},{minute:38,phase:'audio'},{minute:43,phase:'video'},{minute:48,phase:'slide2'},{minute:52,phase:'audio'},{minute:58,phase:'video'}]
const delay=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms))
export default function LibrarySoakControls({engine,onCue,onTaken}:{engine:ReturnType<typeof useLibraryProgram>;onCue:(blocks:PreviewBlock[])=>void;onTaken:(blocks:PreviewBlock[])=>void}){
 const live=useRef(engine),cancelled=useRef(false),[running,setRunning]=useState(false),[status,setStatus]=useState('Generated local fixtures only. One hour; four planned faults. No recording.')
 useEffect(()=>{live.current=engine},[engine])
 useEffect(()=>()=>{cancelled.current=true},[])
 async function run(){if(running)return;cancelled.current=false;setRunning(true);const urls:string[]=[];let runId=''
  try{const s=await engineStatus();runId=s.runtime.runId;const assets=await listLocalMedia();const video=assets.find(a=>a.label==='test-motion'&&a.mime_type==='video/mp4'),audio=assets.find(a=>a.label==='test-tone'&&a.mime_type==='audio/wav'),slides=assets.find(a=>a.label==='Local slide test'&&a.metadata.deck?.pageCount===3);if(!video||!audio||!slides)throw Error('Generated motion, tone and PowerPoint fixtures are required')
   const sourceUrls=new Map([video,audio,slides].map(asset=>{const url=URL.createObjectURL(asset.file);urls.push(url);return[asset.id,url]}));if(!live.current.connected)await live.current.connect();await delay(250)
   const begin=performance.now();for(const step of schedule){while(performance.now()-begin<step.minute*60000){if(cancelled.current)throw Error('Operator cancelled');await delay(500)}
    const fixture=step.phase==='video'?video:step.phase==='audio'?audio:slides;const page=step.phase==='slide2'?2:1
    const block:PreviewBlock={id:crypto.randomUUID(),type:step.phase==='video'?'video':step.phase==='audio'?'audio':'pdf',x:0,y:0,width:640,height:360,zIndex:1,label:'Soak '+step.phase,src:sourceUrls.get(fixture.id)!,pdfPage:page,loop:true}
    setStatus('Cueing '+step.phase);onCue([block]);await delay(300)
    let taken=false;const until=Date.now()+25000;while(Date.now()<until){if(cancelled.current)throw Error('Operator cancelled');if(!live.current.busy&&await live.current.take()){taken=true;break}await delay(300)}if(!taken)throw Error('Could not TAKE '+step.phase);onTaken(structuredClone([block]))
    const confirm=Date.now()+15000;while(true){const current=await engineStatus();if(current.runtime.runId!==runId)throw Error('Engine changed');if(current.runtime.observer?.revision===current.state.revision&&Date.now()-current.runtime.observer.lastGoodAtMs<800)break;if(Date.now()>confirm)throw Error('Outgoing phase not confirmed');await delay(300)}
    await engineRequest('soak',{runId,phase:step.phase});setStatus(`Running · ${step.phase} · cue at minute ${step.minute}`)
   }
   while(live.current.connected&&performance.now()-begin<65*60000){if(cancelled.current)throw Error('Operator cancelled');await delay(500)}setStatus('Server run ended. Review its saved result; an ended run is not automatically a pass.')
  }catch(e){const message=e instanceof Error?e.message:'Browser schedule failed';setStatus(message);if(runId)await engineRequest('soak',{runId,error:message}).catch(()=>{})}
  finally{await live.current.stop();urls.forEach(url=>URL.revokeObjectURL(url));setRunning(false)}
 }
 return <section style={{border:'1px solid #364257',padding:14,marginTop:18,borderRadius:5}}><h2>Local mixed-media hour soak</h2><p role="status">{status}</p><button disabled={running} onClick={()=>void run()}>Run authorized 60-minute local soak</button>{running?<button onClick={()=>{cancelled.current=true}}>Cancel soak</button>:null}<p>Keep this tab open. Server owns crash/stall injection, assessment and cleanup. A failure stops the run; no automatic retry.</p></section>
}
