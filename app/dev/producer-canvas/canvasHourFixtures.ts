import type { CanvasHourAssets } from '@/lib/production/canvasHourPlan'
/** Generated/previously generated inputs only; no capture or recording. */
export async function createCanvasHourAssets() {
  const urls:string[]=[]
  const url=(blob:Blob)=>{const value=URL.createObjectURL(blob);urls.push(value);return value}
  try {
    const [video,slides]=await Promise.all(['video','slides'].map(async kind=>{const response=await fetch('/dev/producer-canvas/fixture/'+kind);if(!response.ok)throw Error('Local generated fixture unavailable');return url(await response.blob())}))
    const bytes=new ArrayBuffer(44+96000),view=new DataView(bytes)
    const text=(at:number,value:string)=>[...value].forEach((letter,index)=>view.setUint8(at+index,letter.charCodeAt(0)))
    text(0,'RIFF');view.setUint32(4,bytes.byteLength-8,true);text(8,'WAVE');text(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,48000,true);view.setUint32(28,96000,true);view.setUint16(32,2,true);view.setUint16(34,16,true);text(36,'data');view.setUint32(40,96000,true)
    for(let i=0;i<48000;i++)view.setInt16(44+i*2,Math.sin(i*2*Math.PI*440/48000)*3000,true)
    const graphic=(color:string)=>url(new Blob([`<svg xmlns="http://www.w3.org/2000/svg" width="160" height="120"><rect width="160" height="120" fill="${color}"/></svg>`],{type:'image/svg+xml'}))
    const assets:CanvasHourAssets={video,slides,audio:url(new Blob([bytes],{type:'audio/wav'})),green:graphic('#16724a'),orange:graphic('#c56a19')}
    return {assets,stop:()=>urls.forEach(value=>URL.revokeObjectURL(value))}
  }catch(error){urls.forEach(value=>URL.revokeObjectURL(value));throw error}
}
