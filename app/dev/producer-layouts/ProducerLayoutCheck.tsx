'use client'
import {useEffect,useRef,useState} from 'react'
import {ProducerLayoutProvider,useProducerLayout} from '@/app/admin/events/[id]/producer/ProducerLayoutContext'
import ProducerLayoutChooser from '@/app/admin/events/[id]/producer/ProducerLayoutChooser'
import ProducerRoomWorkspace from '@/app/admin/events/[id]/producer/ProducerRoomWorkspace'
import {producerMonitorColumns} from '@/lib/producer/roomLayouts'
import '@/app/admin/events/[id]/producer/producerLayouts.css'
// Dev-only fixture. Real media objects stay local; no engine API or network worker.
function MonitorProbe(){
 const ref=useRef<HTMLVideoElement>(null),[frames,setFrames]=useState(0)
 useEffect(()=>{
  const element=ref.current!,stream=new MediaStream()
  const identity=crypto.randomUUID();element.dataset.subscriptionId=identity
  element.srcObject=stream
  const timer=setInterval(()=>setFrames(value=>value+1),100)
  return()=>{clearInterval(timer);element.srcObject=null;stream.getTracks().forEach(track=>track.stop())}
 },[])
 return <><video ref={ref} aria-label="Local Program monitor fixture" muted playsInline/><output data-frame-ticks={frames}>{frames} metadata ticks</output></>
}
function Desk(){
 const {layout,rightRailOpen,dockTab,setDockTab}=useProducerLayout(),[gain,setGain]=useState(68),[selected,setSelected]=useState('Opening slide')
 const session=useRef(''),[mixerOpen,setMixerOpen]=useState(false)
 useEffect(()=>{session.current=crypto.randomUUID();document.querySelector('[data-layout-fixture]')?.setAttribute('data-engine-session',session.current)},[])
 const sourceDock=<div className="producer-dock-content flex h-full flex-col overflow-hidden p-2" data-dock-tab={dockTab}>
  <div className="producer-source-tabs" role="tablist" aria-label="Source dock"><button role="tab" aria-selected={dockTab==='sources'} onClick={()=>setDockTab('sources')}>Sources</button><button role="tab" aria-selected={dockTab==='scenes'} onClick={()=>setDockTab('scenes')}>Scenes</button><button onClick={()=>setMixerOpen(v=>!v)}>Mixer</button></div>
  <div className="producer-library-panels flex-1"><div className="producer-dock-scenes p-4">Opening · Speaker · Holding</div><div className="producer-dock-sources"><div className="producer-library-grid">{['Opening slide','Teal','Event film','Logo','Holding','Walk-in music','Speaker slide','Closing'].map(name=><button key={name} aria-label={"Select "+name} className="producer-source-card flex overflow-hidden rounded-lg border border-slate-600 bg-slate-900 text-left" onClick={()=>setSelected(name)}><span className="producer-source-thumbnail flex items-center justify-center bg-slate-800 text-sm">{name}</span><span className="producer-source-caption text-xs">{name}</span></button>)}</div></div></div>
  <div hidden={!mixerOpen} className="p-3"><label>Program gain <input aria-label="Program gain" type="range" min="0" max="100" value={gain} onChange={e=>setGain(Number(e.target.value))}/><output data-mixer-gain>{gain}</output></label></div>
  <footer className="producer-bottom-dock__toolbar flex shrink-0 items-center text-xs">Recording off · Synthetic fixture only</footer>
 </div>
 const center=<div className="producer-monitor-grid grid h-full min-h-0" style={{gridTemplateColumns:producerMonitorColumns(layout,50)}}><section className="producer-monitor producer-monitor--preview flex min-w-0 flex-col"><div className="producer-monitor__header">PREVIEW</div><div className="flex flex-1 items-center justify-center bg-[#123f56] p-4">{selected}</div></section><div className="producer-take-rail flex items-center justify-center"><button type="button" disabled className="rounded border border-slate-500 p-2 text-xs">TAKE<br/>fixture</button></div><section className="producer-monitor producer-monitor--program flex min-w-0 flex-col"><div className="producer-monitor__header">PROGRAM</div><div className="flex flex-1 flex-col items-center justify-center bg-[#152b39] p-4"><MonitorProbe/><span data-program-intent>Holding</span></div></section></div>
 return <main className="flex h-dvh flex-col bg-[#070f19] text-slate-100" data-producer-layout={layout} data-stage-drawer={rightRailOpen?'open':'closed'} data-layout-fixture>
  <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-700 p-4"><div>JUPITER · Producer layouts <p className="text-xs text-slate-400">Local fixture · no engine requests · recording off</p></div><ProducerLayoutChooser/></header>
  <div className="min-h-0 flex-1"><ProducerRoomWorkspace leftRail={<div className="p-2 text-xs">Preview<br/><br/>TAKE<br/><br/>Program</div>} centerColumn={center} rightRail={<div className="p-4">People &amp; devices</div>} bottomDock={sourceDock}/></div>
 </main>
}
export default function ProducerLayoutCheck(){return <ProducerLayoutProvider ownerId="local-layout-fixture"><Desk/></ProducerLayoutProvider>}
