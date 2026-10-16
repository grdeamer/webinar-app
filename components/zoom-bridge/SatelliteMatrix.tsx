"use client"
import { useEffect, useRef, useState } from "react"
import { Expand, Play, Square } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import type { ZoomRoom, ZoomAction } from "@/lib/zoom-bridge/types"
import { orderRooms } from "@/lib/zoom-bridge/room-order"
import SatelliteGlyph from "./SatelliteGlyph"
import { ioButton, reporting } from "./SatelliteCard"
type Point = { x:number; y:number }
const WIDTH=1300, HEIGHT=1140, CENTER={x:650,y:570}
function position(index:number,total:number) {
 const ring=index<10?0:index<28?1:2
 const start=ring===0?0:ring===1?10:28
 const slots=Math.max(1,Math.min(total-start,ring===0?10:ring===1?18:22))
 const angle=(index-start)*Math.PI*2/slots-Math.PI/2
 const radius=[210,360,510][ring]
 return {x:CENTER.x+Math.cos(angle)*radius,y:CENTER.y+Math.sin(angle)*radius}
}
export default function SatelliteMatrix({rooms,selectedId,select,busy,command}:{rooms:ZoomRoom[];selectedId?:string;select:(id:string)=>void;busy:boolean;command:(id:string,action:ZoomAction)=>Promise<void>}) {
 const [open,setOpen]=useState(false)
 const [chosen,setChosen]=useState<string[]>([])
 const [gesture,setGesture]=useState<{start:Point;end:Point;kind:"lasso"|"connector"}|null>(null)
 const [applying,setApplying]=useState(false)
 const canvas=useRef<HTMLDivElement>(null)
 const [viewport,setViewport]=useState<HTMLDivElement|null>(null)
 const [scale,setScale]=useState(0.5)
 useEffect(()=>{
  if(!open)return
  const element=viewport
  if(!element)return
  const fit=()=>setScale(Math.min(element.clientWidth/WIDTH,window.innerHeight*0.60/HEIGHT,1))
  fit();const observer=new ResizeObserver(fit);observer.observe(element)
  window.addEventListener("resize",fit)
  return ()=>{observer.disconnect();window.removeEventListener("resize",fit)}
 },[open,viewport])
 const ordered=orderRooms(rooms)
 const selected=ordered.filter(room=>chosen.includes(room.id))
 function point(event:React.PointerEvent):Point {
  const rect=canvas.current!.getBoundingClientRect()
  return {x:(event.clientX-rect.left)*WIDTH/rect.width,y:(event.clientY-rect.top)*HEIGHT/rect.height}
 }
 function start(event:React.PointerEvent,kind:"lasso"|"connector") {
  if(event.button!==0||applying)return
  event.stopPropagation();event.preventDefault()
  canvas.current?.setPointerCapture(event.pointerId)
  const p=point(event);setGesture({start:kind==="connector"?CENTER:p,end:p,kind})
 }
 function finish(event:React.PointerEvent) {
  if(!gesture)return
  const end=point(event)
  const ids=ordered.filter((_,i)=>{
   const p=position(i,ordered.length)
   return gesture.kind==="connector"?Math.hypot(p.x-end.x,p.y-end.y)<42:p.x>=Math.min(gesture.start.x,end.x)&&p.x<=Math.max(gesture.start.x,end.x)&&p.y>=Math.min(gesture.start.y,end.y)&&p.y<=Math.max(gesture.start.y,end.y)
  }).map(room=>room.id)
  setChosen(ids);setGesture(null)
  if(ids.length===1)select(ids[0])
 }
 async function apply(action:ZoomAction) {
  setApplying(true)
  try {for(const room of selected)await command(room.id,action)} finally {setApplying(false)}
 }
 return <><button type="button" className={ioButton} onClick={()=>setOpen(true)}><Expand size={16}/>Expand satellite view</button><Dialog open={open} onOpenChange={value=>{if(!applying){setOpen(value);setGesture(null)}}}><DialogContent className="io-matrix max-h-[95dvh] overflow-y-auto border-slate-600 bg-[#07111b] text-white sm:max-w-[min(1500px,96vw)]"><DialogTitle className="font-medium tracking-tight">Jupiter Io <span className="mx-2 text-slate-600">/</span> Satellite matrix</DialogTitle><DialogDescription className="text-slate-300">Drag from Io to a satellite to select its connector, or drag on empty space to lasso several. Then choose Connect or Disconnect. Clicking a satellite also opens its controls on the main page.</DialogDescription><div className="flex flex-wrap items-center gap-2"><span role="status" className="mr-auto text-sm text-slate-300">{selected.length} selected · {rooms.length} total</span><button type="button" className={ioButton} aria-label="Zoom out map" onClick={()=>setScale(current=>Math.max(0.2,current-0.15))}>−</button><button type="button" className={ioButton} aria-label="Zoom in map" onClick={()=>setScale(current=>Math.min(1.5,current+0.15))}>+</button><button type="button" className={ioButton} disabled={applying} onClick={()=>setChosen(ordered.map(room=>room.id))}>Select all</button><button type="button" className={ioButton} disabled={applying} onClick={()=>setChosen([])}>Clear</button><button type="button" className={ioButton} disabled={busy||applying||!selected.length} onClick={()=>{void apply("start")}}><Play size={14}/>Connect selected</button><button type="button" className={ioButton} disabled={busy||applying||!selected.length} onClick={()=>{void apply("stop")}}><Square size={14}/>Disconnect selected</button></div><div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]"><div ref={setViewport} className="io-matrix-space max-h-[65dvh] overflow-auto rounded-xl border border-slate-700"><div style={{width:WIDTH*scale,height:HEIGHT*scale,margin:"0 auto"}}><div ref={canvas} className="relative touch-none select-none" style={{width:WIDTH,height:HEIGHT,transform:`scale(${scale})`,transformOrigin:"top left"}} onPointerDown={event=>start(event,"lasso")} onPointerMove={event=>{if(gesture)setGesture({...gesture,end:point(event)})}} onPointerUp={finish} onPointerCancel={()=>setGesture(null)}>
 <svg aria-hidden="true" className="pointer-events-none absolute inset-0" width={WIDTH} height={HEIGHT}>{[210,360,510].map(radius=><circle key={radius} cx={CENTER.x} cy={CENTER.y} r={radius} fill="none" stroke="#24354b" strokeDasharray="4 8"/>)}{ordered.map((room,i)=>{const p=position(i,ordered.length);const joined=reporting(room)&&room.observed.status==="joined";return <line key={room.id} x1={CENTER.x} y1={CENTER.y} x2={p.x} y2={p.y} stroke={chosen.includes(room.id)?"#67e8f9":joined?"#4ade80":"#713c48"} strokeOpacity={chosen.includes(room.id)||joined?1:0.45} strokeWidth={chosen.includes(room.id)?4:joined?3:1} strokeDasharray={joined?undefined:"6 8"}/>})}{gesture?.kind==="connector"?<line x1={CENTER.x} y1={CENTER.y} x2={gesture.end.x} y2={gesture.end.y} stroke="#67e8f9" strokeWidth={3}/>:null}{gesture?.kind==="lasso"?<rect x={Math.min(gesture.start.x,gesture.end.x)} y={Math.min(gesture.start.y,gesture.end.y)} width={Math.abs(gesture.end.x-gesture.start.x)} height={Math.abs(gesture.end.y-gesture.start.y)} fill="#38bdf822" stroke="#67e8f9" strokeDasharray="5 4"/>:null}</svg>
 <button type="button" aria-label="Io broadcast center: drag a connector to a satellite" onPointerDown={event=>start(event,"connector")} className="absolute grid h-28 w-28 place-content-center io-moon rounded-full border border-amber-200/30 text-center" style={{left:CENTER.x-56,top:CENTER.y-56}}><span aria-hidden="true" className="io-moon-terrain"/><span className="relative text-2xl font-medium tracking-tight">Io</span><span className="relative mt-1 text-[9px] font-normal text-amber-50/75">Broadcast center</span></button>
 {ordered.map((room,i)=>{const p=position(i,ordered.length);const joined=reporting(room)&&room.observed.status==="joined";return <button type="button" key={room.id} aria-label={`Select ${room.name}`} aria-pressed={chosen.includes(room.id)} title={`${room.name} · ${room.observed.status||"Disconnected"}`} disabled={applying} onPointerDown={event=>event.stopPropagation()} onClick={()=>{setChosen(current=>current.includes(room.id)?current.filter(id=>id!==room.id):[...current,room.id]);select(room.id)}} className={`absolute flex h-20 w-28 flex-col items-center justify-center io-matrix-node ${joined?"is-connected":"is-inactive"} rounded-lg border p-1 text-center ${chosen.includes(room.id)?"border-cyan-200 bg-cyan-950 shadow-[0_0_15px_#67e8f955]":selectedId===room.id?"border-blue-400 bg-slate-900":"border-slate-700 bg-slate-900"}`} style={{left:p.x-56,top:p.y-40}}><SatelliteGlyph size={30} className={joined?"text-green-300":"text-red-300"}/><span className="line-clamp-2 text-[10px] font-normal leading-3 tracking-normal">{room.name}</span><span className={`max-w-full truncate text-[9px] ${joined?"text-emerald-200":"text-red-200/75"}`}>{joined?"● Connected":`○ ${room.observed.status||"Disconnected"}`}</span></button>})}
 </div></div></div><div className="max-h-[65dvh] overflow-y-auto rounded-xl border border-slate-700 p-3"><h3 className="font-medium">Satellite directory</h3><p className="my-2 text-xs text-slate-400">Green: connected · red: not connected. Solid lines indicate confirmed connections. Scroll the map to explore all three rings.</p>{ordered.map(room=><button key={room.id} type="button" disabled={applying} aria-pressed={chosen.includes(room.id)} className={`${ioButton} mb-2 w-full justify-start text-left ${chosen.includes(room.id)?"border-cyan-300 bg-cyan-950":""}`} onClick={()=>{setChosen([room.id]);select(room.id)}}><span className="min-w-0"><span className="block truncate">{room.name}</span><span className={`block text-xs ${reporting(room)&&room.observed.status==="joined"?"text-emerald-300":"text-red-300/80"}`}>{reporting(room)&&room.observed.status==="joined"?"● Connected":`○ ${room.observed.status||"Disconnected"}`}</span></span></button>)}</div></div></DialogContent></Dialog></>
}
