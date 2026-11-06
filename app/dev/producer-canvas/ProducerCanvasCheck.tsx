'use client'
import { useState, useRef, useEffect } from 'react'
import useLibraryProgram from '../producer-media/useLibraryProgram'
import CanvasProgramCheck from './CanvasProgramCheck'
import CanvasClockCheck from './CanvasClockCheck'
import CanvasHourControls from './CanvasHourControls'
import dynamic from 'next/dynamic'
const CenterSwitcherColumn = dynamic(() => import('@/app/admin/events/[id]/producer/CenterSwitcherColumn'), { ssr: false })
import { SourceLibraryCard } from '@/app/admin/events/[id]/producer/BottomAssetDockMedia'
import type { BroadcastAssetTelemetry } from '@/app/admin/events/[id]/producer/BottomAssetDockAssetRenderers'
import type { PreviewBlock } from '@/app/admin/events/[id]/producer/useProducerBlocks'
import { appendPreviewAsset, previewBlockFromLibraryAsset } from '@/lib/producer/previewLibraryAsset'
import { BROADCAST_OUTPUT_PROFILES } from '@/lib/broadcast/outputProfiles'
const noop = () => {}
const assets: BroadcastAssetTelemetry[] = ['Blue','Orange','Green'].map((label,index)=>({
 id:label,label,type:'graphic',assetKind:'image',state:'READY',duration:'',meta:'Local test graphic',route:'',lastPlayed:'',linkedScene:'',
 imageUrl:`data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="${['#124e78','#c56a19','#16724a'][index]}"/><text x="40" y="200" fill="white" font-size="64">${label}</text></svg>`)}`,
}))
export default function ProducerCanvasCheck() {
 const [blocks,setBlocks]=useState<PreviewBlock[]>([]),[selected,setSelected]=useState<string|null>(null)
 const [program,setProgram]=useState<PreviewBlock[]>([]),[notice,setNotice]=useState(''),[hourRunning,setHourRunning]=useState(false)
 const urls=useRef<string[]>([]),engine=useLibraryProgram(blocks)
 useEffect(()=>()=>{urls.current.forEach(url=>URL.revokeObjectURL(url))},[])
 async function localBlock(block:PreviewBlock){
  if(block.src?.startsWith('data:image/svg+xml,')){const blob=await (await fetch(block.src)).blob();const src=URL.createObjectURL(blob);urls.current.push(src);return {...block,src}}
  return block
 }
 function add(block:PreviewBlock){void localBlock(block).then(item=>{const id=crypto.randomUUID();setBlocks(current=>appendPreviewAsset(current,item,id));setSelected(id)})}
 async function take(){if(await engine.take()){setProgram(structuredClone(blocks));setNotice('Whole canvas committed')}}
 async function loadGraphics(){const next=await Promise.all(assets.map((asset,index)=>localBlock({...previewBlockFromLibraryAsset(asset,crypto.randomUUID()),x:index===1?320:0,y:index===2?180:0,width:index===0?640:320,height:index===0?360:180,zIndex:index+1})));setBlocks(next)}
 async function loadMixed(){
  const sources=await Promise.all(['video','slides'].map(async kind=>{const response=await fetch('/dev/producer-canvas/fixture/'+kind);if(!response.ok)throw Error('Fixture unavailable');const url=URL.createObjectURL(await response.blob());urls.current.push(url);return url}))
  const audio=new ArrayBuffer(44+48000*2),view=new DataView(audio),text=(offset:number,value:string)=>[...value].forEach((letter,index)=>view.setUint8(offset+index,letter.charCodeAt(0)))
  text(0,'RIFF');view.setUint32(4,audio.byteLength-8,true);text(8,'WAVE');text(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,48000,true);view.setUint32(28,96000,true);view.setUint16(32,2,true);view.setUint16(34,16,true);text(36,'data');view.setUint32(40,96000,true)
  for(let i=0;i<48000;i++)view.setInt16(44+i*2,Math.sin(i*2*Math.PI*440/48000)*3000,true)
  const tone=URL.createObjectURL(new Blob([audio],{type:'audio/wav'}));urls.current.push(tone)
  const base=previewBlockFromLibraryAsset(assets[0],crypto.randomUUID(),{fullFrame:true})
  setBlocks([{...base,type:'video',src:sources[0],loop:true}, {...base,id:crypto.randomUUID(),type:'pdf',src:sources[1],pdfPage:1,x:320,y:0,width:320,height:180,zIndex:2}, {...base,id:crypto.randomUUID(),type:'audio',src:tone,mediaGain:.5,loop:true,zIndex:3}])
 }

 return <main className="min-h-screen bg-[#050b14] p-6 text-white">
  <h1>Local Preview and Program canvas check</h1><p>Local engine only. Recording off. No uploads or paid workers.</p>
  <fieldset disabled={hourRunning} className="my-3 flex flex-wrap gap-3">
   <button onClick={()=>void engine.connect()} disabled={engine.connected||engine.busy}>Connect local engine</button>
   <button onClick={()=>void loadGraphics()}>Load three graphics</button>
   <button onClick={()=>void loadMixed().catch(error=>setNotice(error.message))}>Load video + PowerPoint + audio</button>
   <button onClick={()=>setBlocks(current=>current.map(block=>block.type==='audio'?{...block,mediaMuted:!block.mediaMuted}:block))}>Toggle source audio mute</button>
   <button onClick={()=>setBlocks(current=>current.map((block,index)=>index===1?{...block,opacity:.5,x:160}:block))}>Change top layer position and opacity</button>
   <button onClick={()=>setBlocks(current=>[...current,{...current[0],id:crypto.randomUUID(),src:'blob:invalid',zIndex:10}])}>Cue unavailable source</button>
   <button disabled={!engine.ready} onClick={()=>void take()}>TAKE whole canvas</button>
   <button onClick={()=>void engine.stop()}>Stop local inputs</button>
  </fieldset><p>{engine.message} {notice}</p>
  <p role="status">{blocks.length} sources in Preview</p>
  {!hourRunning?<CanvasClockCheck/>:null}
  <CanvasHourControls engine={engine} onCue={setBlocks} onTaken={setProgram} onRunning={setHourRunning}/>
  <fieldset disabled={hourRunning} className={hourRunning?"pointer-events-none":""}><CenterSwitcherColumn workspaceMode="prepare" triggerAudienceCue={noop} onHideAudienceCue={noop}
   engineProgramMonitor={<CanvasProgramCheck engine={engine}/>}
   previewProgramDifferent={JSON.stringify(blocks)!==JSON.stringify(program)} takeBusy={engine.busy} lastTakeMode="cut" onTake={()=>void take()}
   onPreviewCanvasMouseMove={noop} stopDraggingBlock={noop} onClearSelectedBlock={()=>setSelected(null)}
   stageState={null} onStageParticipants={[]} participantAppearanceOverrides={{}} previewBlocks={blocks}
   selectedBlockId={selected} snapGuideX={null} snapGuideY={null} setSelectedBlockId={setSelected}
   startDraggingBlock={noop} startResizingBlock={noop} programState={null} programBlocks={program} onRemoveProgramBlock={noop}
   screenLayoutPreset="classic" showAudienceCue={false} audienceCueRegion="" audienceCueMoonMode={false}
   audienceCueQuestionLabel="" audienceOriginCollapsed={true} onToggleAudienceOriginCollapsed={noop}
   isTransitioning={false} transitionFromState={null} transitionFromBlocks={[]} transitionFadingOut={false}
   sceneName="Local check" onSceneNameChange={noop} onSaveScene={noop} sceneBusy={false} scenes={[]}
   selectedSceneId={null} selectedSceneLabel={null} onApplyScene={noop} onClearScreenShare={noop} onUnpin={noop}
   onClearPrimary={noop} addCameraSlotBlock={noop} onAddMediaAssetToPreview={add} onUploadPdf={noop}
   onUploadVideo={noop} onUploadImage={noop} duplicateSelectedBlock={noop} bringSelectedBlockToFront={noop}
   deleteSelectedBlock={()=>setBlocks(current=>current.filter(block=>block.id!==selected))}
   healthSnapshot={{overall:'healthy',canTake:engine.ready,takeBlockReason:engine.ready?null:engine.message,previewReady:engine.ready,programReady:false,stageReady:true,issues:[]}}
   transportHealth="connected" outputProfile={BROADCAST_OUTPUT_PROFILES['high-1080p30']} />
  </fieldset><fieldset disabled={hourRunning} className={hourRunning?"pointer-events-none":""}><section aria-label="Media Library" className="mt-4 grid grid-cols-3 gap-3">
   {assets.map(asset=><SourceLibraryCard key={asset.id} asset={asset} selected={false}
    inPreview={blocks.some(block=>block.assetId===asset.id)} onSelect={noop}
    onSendToPreview={()=>add(previewBlockFromLibraryAsset(asset,crypto.randomUUID(),{fullFrame:blocks.length===0}))} viewMode="list" />)}
  </section></fieldset>
 </main>
}
