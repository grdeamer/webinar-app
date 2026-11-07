/** Read the existing engine diagnostic row only, in memory. No media is stored. */
export function programMarkerRevision(pixels:Uint8ClampedArray):number|null {
 if(pixels.length!==672*12*4)return null
 const bytes=Array<number>(7).fill(0)
 for(let cell=0;cell<56;cell++){
  const offset=(6*672+cell*12+6)*4
  const light=(pixels[offset]+pixels[offset+1]+pixels[offset+2])/3>128
  bytes[Math.floor(cell/8)]|=Number(light)<<(7-cell%8)
 }
 if(bytes[0]!==0x4a||bytes.reduce((sum,value)=>sum^value,0)!==0)return null
 return bytes[1]*65536+bytes[2]*256+bytes[3]
}
export type ProgramTakeTiming={startedAtMs:number;preflightMs?:number;acceptedMs?:number;presentedMs?:number;pictureError?:string;observerConfirmedMs?:number}
export type PresentedProgramPicture={atMs:number|null;error?:string}
/** Observe the actual monitor's presented frames, not a status poll or a UI copy. */
export function watchPresentedProgramRevision(video:HTMLVideoElement|null,revision:number,timeoutMs=5000){
 let finish:(value:PresentedProgramPicture)=>void,callback:number|undefined,done=false
 const timeout={current:undefined as ReturnType<typeof setTimeout>|undefined}
 const promise=new Promise<PresentedProgramPicture>(resolve=>{finish=resolve})
 function settle(value:PresentedProgramPicture){if(done)return;done=true;if(timeout.current)clearTimeout(timeout.current);if(callback!==undefined)video?.cancelVideoFrameCallback(callback);finish(value)}
 if(!video?.requestVideoFrameCallback){settle({atMs:null,error:'Presented-frame timing is unavailable in this browser'});return {promise,cancel:()=>settle({atMs:null,error:'Cancelled'})}}
 const canvas=document.createElement('canvas');canvas.width=672;canvas.height=12
 const context=canvas.getContext('2d',{willReadFrequently:true})
 if(!context){settle({atMs:null,error:'Marker timing is unavailable'});return {promise,cancel:()=>settle({atMs:null,error:'Cancelled'})}}
 function sample(_now:number,metadata:VideoFrameCallbackMetadata){
  if(done)return
  try{
   if(video.videoWidth===1920&&video.videoHeight===1080){
    const scale=video.videoWidth/1280
    context.drawImage(video,0,video.videoHeight-12*scale,672*scale,12*scale,0,0,672,12)
    if(programMarkerRevision(context.getImageData(0,0,672,12).data)===(revision&0xffffff)){
     settle({atMs:Math.max(performance.now(),metadata.expectedDisplayTime)});return
    }
   }
  }catch{settle({atMs:null,error:'Could not validate the presented Program revision'});return}
  callback=video.requestVideoFrameCallback(sample)
 }
 timeout.current=setTimeout(()=>settle({atMs:null,error:'New 1080p Program revision was not observed within 5 seconds'}),timeoutMs)
 callback=video.requestVideoFrameCallback(sample)
 return {promise,cancel:()=>settle({atMs:null,error:'Cancelled'})}
}
