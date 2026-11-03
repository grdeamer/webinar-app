'use client'
import { useEffect, useRef, useState, type ReactNode } from 'react'
export default function LocalMonitor({ children }: { children: ReactNode }) {
 const frame = useRef<HTMLDivElement>(null)
 const [scale,setScale] = useState(1)
 useEffect(()=> {
  if (!frame.current) return
  const observer=new ResizeObserver(([entry])=>setScale(entry.contentRect.width/640))
  observer.observe(frame.current)
  return ()=>observer.disconnect()
 },[])
 return <div ref={frame} style={{aspectRatio:'16/9',overflow:'hidden',background:'#000',position:'relative'}}><div style={{width:640,height:360,transform:`scale(${scale})`,transformOrigin:'top left'}}>{children}</div></div>
}
