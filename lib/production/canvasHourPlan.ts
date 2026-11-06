import type { PreviewBlock } from '../../app/admin/events/[id]/producer/useProducerBlocks'
export type CanvasHourPhase = 'video' | 'slide1' | 'slide2' | 'audio'
export const CANVAS_HOUR_SCHEDULE: { minute: number; phase: CanvasHourPhase; transition: 'cut' | 'fade' }[] = [
  {minute:0,phase:'video',transition:'cut'}, {minute:5,phase:'slide1',transition:'fade'},
  {minute:8,phase:'audio',transition:'cut'}, {minute:12,phase:'video',transition:'fade'},
  {minute:18,phase:'slide2',transition:'cut'}, {minute:22,phase:'audio',transition:'fade'},
  {minute:28,phase:'video',transition:'cut'}, {minute:35,phase:'slide1',transition:'fade'},
  {minute:38,phase:'audio',transition:'cut'}, {minute:43,phase:'video',transition:'fade'},
  {minute:48,phase:'slide2',transition:'cut'}, {minute:52,phase:'audio',transition:'fade'},
  {minute:58,phase:'video',transition:'cut'},
]
export type CanvasHourAssets = {video:string;slides:string;audio:string;green:string;orange:string}
export function canvasHourLayout(phase:CanvasHourPhase,assets:CanvasHourAssets):PreviewBlock[] {
  const base={x:0,y:0,width:640,height:360,zIndex:1,opacity:1,scale:1,rotation:0,borderRadius:0,shadowIntensity:0,loop:true}
  const orange=phase==='slide1'||phase==='slide2'
  return [
    {...base,id:'canvas-video',label:'Moving 1080p30 video',type:'video',src:assets.video},
    {...base,id:'canvas-slide',label:`Slide ${phase==='slide2'?2:1}`,type:'pdf',src:assets.slides,pdfPage:phase==='slide2'?2:1,x:phase==='slide1'?256:320,width:phase==='slide1'?384:320,height:phase==='slide1'?216:180,zIndex:2},
    {...base,id:'canvas-graphic',label:'Canvas graphic',type:'image',src:orange?assets.orange:assets.green,x:32,y:220,width:160,height:120,zIndex:3},
    {...base,id:'canvas-audio',label:'Generated audio tone',type:'audio',src:assets.audio,mediaGain:phase==='audio'?.25:.5,zIndex:4},
  ]
}
export function canvasHourColors(phase:CanvasHourPhase):number[] {
  return [...(phase==='slide2'?[89,38,71]:[13,41,56]),...(phase==='slide1'||phase==='slide2'?[197,106,25]:[22,114,74])]
}
export function canvasColorsMatch(value:unknown,phase:CanvasHourPhase):boolean {
  const target=canvasHourColors(phase)
  return Array.isArray(value)&&value.length===6&&value.every((n,i)=>Number.isFinite(n)&&Math.abs(n-target[i])<=20)
}
