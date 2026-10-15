"use client"
import { useState } from "react"
import { Trash2 } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import type { ZoomRoom } from "@/lib/zoom-bridge/types"
import { ioButton, reporting } from "./SatelliteCard"
export default function SatelliteDeleteButton({ room, busy, remove }: { room: ZoomRoom; busy: boolean; remove: (room: ZoomRoom) => void }) {
 const [confirming,setConfirming]=useState(false)
 const disabled=busy || room.running || (reporting(room) && !["stopped","failed","capacity"].includes(room.observed.status || ""))
 return <><button type="button" className={`${ioButton} text-red-200`} disabled={disabled} title={disabled?"Disconnect the satellite and wait for it to stop before deleting.":"Delete this satellite profile"} aria-label={`Delete ${room.name}`} onClick={()=>setConfirming(true)}><Trash2 size={15}/>Delete satellite</button><Dialog open={confirming} onOpenChange={setConfirming}><DialogContent className="border border-slate-600 bg-[#0b1222] text-white sm:max-w-lg"><DialogTitle>Delete {room.name}?</DialogTitle><DialogDescription className="text-slate-300">This permanently removes this satellite profile and its saved meeting settings. Your other satellites and the Zoom meeting are unaffected.</DialogDescription><div className="mt-4 flex justify-end gap-3"><button type="button" autoFocus className={ioButton} onClick={()=>setConfirming(false)}>Cancel</button><button type="button" disabled={disabled} className={`${ioButton} border-red-300/30 text-red-200`} onClick={()=>{setConfirming(false);remove(room)}}>Delete satellite</button></div></DialogContent></Dialog></>
}
