"use client"
import { useEffect, useRef, useState } from "react"
import { ioButton } from "./SatelliteCard"
type Guide = "source" | "satellites"
const guides = {
 source: [
 ["Prepare your Program", "source", "Connect ATEM → capture device → OBS or Telescope and check picture and sound in your encoder. Edit source updates saved source information. For a Zoom source instead, enter the meeting details; its host must admit Io Source and grant SDK recording permission."],
 ["Copy the destination", "ingest", "For the HDMI path, open Manage ingest and click Copy connection. Keep the URL private: it contains an encryption passphrase. Reuse it for normal sessions; Regenerate key invalidates the old connection. Skip this step for a Zoom meeting source."],
 ["Set up the encoder", "source-help", "Open Source setup & information, then Encoder setup. In OBS use Settings → Stream → Custom. Paste the URL into Server and leave Stream Key blank. Follow the saved video and audio guidance. In Telescope, use the copied connection as your send destination."],
 ["Receive Program", "source", "Click Start receiving in Io, then start streaming in OBS or sending in Telescope. For a Zoom source, the host must admit the source participant and grant recording permission. This tutorial never starts a broadcast for you."],
 ["Check picture and sound", "source-health", "Wait for detected video and audio before connecting satellites. If nothing arrives, check capture, audio routing, the encoder destination, and that the encoder’s public IP is allowed by the receiver firewall. When finished, stop the encoder and click Stop receiving."],
 ],
 satellites: [
 ["Create destinations", "fleet", "Choose the total number of satellites and click Set up. Fill in and save each new profile. Existing profiles remain; Set up adds only missing profiles."],
 ["Edit a satellite", "satellite-edit", "Select a satellite, then click Edit satellite. Set its name, Zoom meeting ID, passcode, and Screen share or Camera output. A blank existing passcode keeps the saved one. Disconnect before changing meeting details or output mode; connected satellites can still be renamed."],
 ["Connect to Zoom", "satellite-detail", "Click Connect in the selected satellite’s Broadcast controls. The destination host must admit it and allow screen sharing when needed. If a failed satellite still offers Disconnect, disconnect it before trying Connect again."],
 ["Enable picture and audio", "satellite-detail", "Turn on Share or Camera and unmute the satellite microphone when ready. Picture and audio are separate controls. New satellites start with both off; reconnecting retains saved controls. Original Sound is optional and does not unmute audio. The relay is mono."],
 ["Verify and finish", "satellite-detail", "Use Take snapshot and the audio meter, then check picture and sound in the destination Zoom meeting. Host permissions still apply. Disconnect when finished. Fleet controls affect every satellite."],
 ],
} as const
export default function IoSetupHelp() {
 const [tour,setTour] = useState<{guide:Guide;index:number}|null>(null)
 const trigger = useRef<HTMLButtonElement|null>(null)
 const step = tour ? guides[tour.guide][tour.index] : null
 function close() { setTour(null); trigger.current?.focus() }
 useEffect(()=>{
  if (!step) return
  const scope=trigger.current?.closest(".io-console")
  let highlighted:Element|null=null
  function highlight() {
   const target=scope?.querySelector(`[data-io-tour="${step![1]}"]`)
   if (!target || target===highlighted) return
   highlighted?.removeAttribute("data-io-tour-active"); highlighted=target
   target.setAttribute("data-io-tour-active","true")
   let parent=target.parentElement
   while(parent) { if(parent instanceof HTMLDetailsElement) parent.open=true; parent=parent.parentElement }
   target.scrollIntoView({block:"center",behavior:"instant"})
  }
  highlight()
  const observer=new MutationObserver(highlight)
  if(scope) observer.observe(scope,{childList:true,subtree:true})
  const escape=(event:KeyboardEvent)=>{if(event.key==="Escape"){setTour(null);trigger.current?.focus()}}
  document.addEventListener("keydown",escape)
  return ()=>{observer.disconnect();highlighted?.removeAttribute("data-io-tour-active");document.removeEventListener("keydown",escape)}
 },[step])
 return <>
 <section className="io-panel p-5" aria-label="Setup help"><h2 className="text-lg font-semibold">Setup help</h2><p className="mt-1 text-sm text-slate-300">Read the steps or follow a walkthrough. You control every connection and broadcast.</p><div className="mt-4 grid gap-4 md:grid-cols-2">{(["source","satellites"] as const).map(guide=><div key={guide} className="rounded-lg border border-white/15 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold">{guide==="source"?"Program source":"Satellites"}</h3><button type="button" className={ioButton} onClick={event=>{trigger.current=event.currentTarget;setTour({guide,index:0})}}>Show me<span className="sr-only">: {guide}</span></button></div><details className="mt-3 text-sm"><summary className="cursor-pointer text-blue-200">Step-by-step instructions</summary><ol className="mt-3 list-decimal space-y-4 pl-5">{guides[guide].map(item=><li key={item[0]}><strong>{item[0]}</strong><p className="mt-1 leading-6 text-slate-300">{item[2]}</p></li>)}</ol></details></div>)}</div></section>
 {tour&&step?<aside className="io-tour-panel" aria-label="Guided setup tutorial"><div className="flex items-center justify-between gap-3"><p className="text-xs text-blue-200">{tour.guide==="source"?"Program source":"Satellites"} · {tour.index+1} of {guides[tour.guide].length}</p><button type="button" className={ioButton} onClick={close}>Close</button></div><div aria-live="polite" aria-atomic="true"><h3 className="mt-3 font-semibold">{step[0]}</h3><p className="mt-2 text-sm leading-6 text-slate-200">{step[2]}</p></div><p className="mt-3 text-xs text-slate-400">Follow the highlighted area. If unavailable, complete the preceding setup step first. Escape closes this guide.</p><div className="mt-4 flex justify-between gap-3"><button type="button" className={ioButton} disabled={tour.index===0} onClick={()=>setTour({...tour,index:tour.index-1})}>Back</button><button type="button" className={ioButton} onClick={()=>tour.index===guides[tour.guide].length-1?close():setTour({...tour,index:tour.index+1})}>{tour.index===guides[tour.guide].length-1?"Finish":"Next"}</button></div></aside>:null}
 </>
}
