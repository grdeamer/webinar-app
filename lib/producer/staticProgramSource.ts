type GeneratedTrack = MediaStreamTrack & {writable:WritableStream<VideoFrame>}
type GeneratorConstructor = new(options:{kind:'video'})=>GeneratedTrack

/** Static slides still need a live video clock. Canvas capture waits on page
 * rendering, which is suspended in hidden tabs. A worker writes explicit frames.
 * This is ephemeral track generation, never recording or persistent media storage.
 */
export async function staticProgramSource(canvas:HTMLCanvasElement) {
 const Generator=(globalThis as unknown as {MediaStreamTrackGenerator?:GeneratorConstructor}).MediaStreamTrackGenerator
 if(!Generator)throw Error('Slide and audio inputs require current Chromium frame generation')
 const track=new Generator({kind:'video'})
 const worker=new Worker(new URL('./staticProgramSource.worker.ts',import.meta.url),{type:'module'})
 let stopped=false,error:string|null=null
 worker.onmessage=event=>{if(event.data?.error)error='Static input frame generation stopped'}
 worker.onerror=()=>{error='Static input frame generation stopped'}
 try {const bitmap=await createImageBitmap(canvas);worker.postMessage({bitmap,writable:track.writable},[bitmap,track.writable])}
 catch(e){track.stop();worker.terminate();throw e}
 return {track,get failure(){return error},stop(){if(stopped)return;stopped=true;track.stop();worker.terminate()}}
}
