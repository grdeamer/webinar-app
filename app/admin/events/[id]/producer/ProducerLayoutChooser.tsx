'use client'
import {useState} from 'react'
import {Check,LayoutGrid,Users} from 'lucide-react'
import {Dialog,DialogContent,DialogDescription,DialogTitle,DialogTrigger} from '@/components/ui/dialog'
import {PRODUCER_ROOM_LAYOUTS,type ProducerRoomLayout} from '@/lib/producer/roomLayouts'
import {useProducerLayout} from './ProducerLayoutContext'
export function ProducerLayoutThumbnail({layout}:{layout:ProducerRoomLayout}){
 return <div className="producer-layout-thumbnail" data-thumbnail-layout={layout} aria-hidden="true"><span className="layout-thumb-header"/><span className="layout-thumb-preview"/><span className="layout-thumb-take"/><span className="layout-thumb-program"/><span className="layout-thumb-library">{Array.from({length:6},(_,i)=><span key={i}/>)}</span></div>
}
export default function ProducerLayoutChooser(){
 const {layout,chooseLayout,saveMessage,rightRailOpen,toggleRightRail}=useProducerLayout(),[open,setOpen]=useState(false)
 const current=PRODUCER_ROOM_LAYOUTS.find(option=>option.id===layout)!
 return <div className="producer-layout-actions">
  <Dialog open={open} onOpenChange={setOpen}>
   <DialogTrigger asChild><button type="button" className="producer-layout-button"><LayoutGrid size={16}/><span>Choose layout</span><span className="producer-layout-current">{current.name}</span></button></DialogTrigger>
   <DialogContent className="producer-layout-dialog border-slate-600 bg-[#08121e] text-slate-100 sm:max-w-3xl">
    <DialogTitle>Choose your workspace</DialogTitle>
    <DialogDescription className="text-slate-300">Changes your workspace only. Program, inputs and audio keep running.</DialogDescription>
    <div className="producer-layout-options">{PRODUCER_ROOM_LAYOUTS.map(option=><button type="button" key={option.id} aria-pressed={layout===option.id} className="producer-layout-option" onClick={()=>{chooseLayout(option.id);setOpen(false)}}><ProducerLayoutThumbnail layout={option.id}/><span className="layout-option-name">{option.name}{layout===option.id?<Check size={16} aria-label="Selected"/>:null}</span><span className="layout-option-description">{option.description}</span></button>)}</div>
    <p className="text-xs text-slate-400">Your choice is remembered for your account in this browser when storage is available.</p>
   </DialogContent>
  </Dialog>
  <button type="button" className="producer-layout-button" aria-pressed={rightRailOpen} onClick={toggleRightRail}><Users size={16}/>People &amp; devices</button>
  <span className="producer-layout-save" role="status">{saveMessage}</span>
 </div>
}
