type FrameJob={bitmap:ImageBitmap;writable:WritableStream<VideoFrame>}
const workerScope=self as unknown as {onmessage:((event:MessageEvent<FrameJob>)=>void)|null;postMessage:(value:unknown)=>void}
workerScope.onmessage=event=>{
 const {bitmap,writable}=event.data,writer=writable.getWriter(),interval=1000/30,start=performance.now()
 let deadline=start
 void(async()=>{
  try{
   while(true){
    const now=performance.now()
    if(now<deadline)await new Promise(resolve=>setTimeout(resolve,deadline-now))
    const frame=new VideoFrame(bitmap,{timestamp:Math.round((performance.now()-start)*1000),duration:33333})
    let timer:ReturnType<typeof setTimeout>
    try {await Promise.race([writer.write(frame),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(Error('Frame writer stalled')),1000)})])}
    finally{clearTimeout(timer);frame.close()}
    deadline+=interval;if(deadline<performance.now()-interval)deadline=performance.now()
   }
  }catch{workerScope.postMessage({error:'Static input frame generation stopped'});await writer.abort().catch(()=>{})}
  finally{bitmap.close()}
 })()
}
export {}
