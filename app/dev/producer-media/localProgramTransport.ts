import {canvasProgramSource} from '@/lib/producer/canvasProgramSource'
import {renderProgramSlide} from '@/lib/producer/programSlideRender'
import {staticProgramSource} from '@/lib/producer/staticProgramSource'
import {libraryInputReady} from '@/lib/producer/libraryInputReady'
import { Room, RoomEvent, Track, type LocalTrackPublication } from 'livekit-client'
import type { PreviewBlock } from '@/app/admin/events/[id]/producer/useProducerBlocks'
export type StudioTransport = { root: string; relayUrl: string }
export const LOCAL_STUDIO_TRANSPORT: StudioTransport = {root:'/dev/producer-media/transport',relayUrl:'ws://127.0.0.1:7980'}
export async function engineStatus(transport=LOCAL_STUDIO_TRANSPORT) {const r=await fetch(transport===LOCAL_STUDIO_TRANSPORT ? transport.root : transport.root+'/api/producer/status',{cache:'no-store'});const s=await r.json();if(!r.ok)throw Error(s.error);return s}
export async function engineRequest(endpoint:string,body:Record<string,unknown>,capability?:string,transport=LOCAL_STUDIO_TRANSPORT) {const r=await fetch(transport===LOCAL_STUDIO_TRANSPORT ? transport.root : transport.root+'/api/producer/'+endpoint,{method:'POST',headers:{'Content-Type':'application/json',...(capability?{'X-Input-Capability':capability}:{})},body:JSON.stringify(transport===LOCAL_STUDIO_TRANSPORT ? {endpoint,...body} : body)});const value=await r.json();if(!r.ok)throw Error(value.error);return value}
export async function engineCommand(runId:string,command:unknown,transport=LOCAL_STUDIO_TRANSPORT,expectedRevision?:number) {const s=await engineStatus(transport);if(expectedRevision!==undefined&&s.state.revision!==expectedRevision)throw Error('Program changed. Review the current mix before applying.');if(s.runtime.runId!==runId)throw Error('Engine changed');return engineRequest('command',{runId,consoleId:'local-library-studio',commandId:crypto.randomUUID(),expectedRevision:s.state.revision,command},undefined,transport)}
const wait=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms))
export class LibraryPublisher {
 canvasSource:Awaited<ReturnType<typeof canvasProgramSource>>|null=null
 objectUrls:string[]=[]
 staticSource:Awaited<ReturnType<typeof staticProgramSource>>|null=null
 room:Room|null=null;stream:MediaStream|null=null;media:HTMLVideoElement|null=null;timer:ReturnType<typeof setInterval>|null=null;paint:ReturnType<typeof setInterval>|null=null;capability='';runId='';stopped=false;failure:string|null=null;loop=false;expiry:ReturnType<typeof setTimeout>|null=null
 constructor(readonly role:'source-a'|'source-b',readonly transport=LOCAL_STUDIO_TRANSPORT){}
 async start(block:PreviewBlock) {
  if(!block.src||!['video','audio','image','pdf'].includes(block.type))throw Error('Choose one local video, audio, image or slide source')
  const source=await this.resolveSource(block)
  this.loop=Boolean(block.loop)
  const initial=await engineStatus(this.transport);this.runId=initial.runtime.runId
  const canvas=document.createElement('canvas');canvas.width=1920;canvas.height=1080;const ctx=canvas.getContext('2d')!;ctx.fillStyle='#000';ctx.fillRect(0,0,1920,1080)
  if(block.type==='pdf') {const pdf=await import('pdfjs-dist');pdf.GlobalWorkerOptions.workerSrc=new URL('pdfjs-dist/build/pdf.worker.min.mjs',import.meta.url).toString();const task=pdf.getDocument({url:source.split('#')[0]});try {const doc=await task.promise;const page=await doc.getPage(block.pdfPage??1);const viewport=page.getViewport({scale:1});const v=page.getViewport({scale:Math.min(1920/viewport.width,1080/viewport.height)});const pageCanvas=document.createElement('canvas');pageCanvas.width=v.width;pageCanvas.height=v.height;await renderProgramSlide(page,{canvas:pageCanvas,canvasContext:pageCanvas.getContext('2d')!,viewport:v});ctx.drawImage(pageCanvas,(1920-v.width)/2,(1080-v.height)/2)}finally{await task.destroy()}}
  else if(block.type==='image'){const img=new Image();img.src=source;await img.decode();const scale=Math.min(1920/img.width,1080/img.height);ctx.drawImage(img,(1920-img.width*scale)/2,(1080-img.height*scale)/2,img.width*scale,img.height*scale)}
  if(block.type==='video'||block.type==='audio') {
   const media=document.createElement('video') as HTMLVideoElement & {captureStream:()=>MediaStream};this.media=media;media.src=source;media.muted=true;media.loop=true;media.playsInline=true
   await new Promise<void>((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Media load timed out')),10000);media.onloadeddata=()=>{clearTimeout(timer);resolve()};media.onerror=()=>{clearTimeout(timer);reject(Error('Cannot decode this file'))}});await media.play();if(typeof media.captureStream!=='function')throw Error('Native file capture requires current Chromium');this.stream=media.captureStream();if(!this.stream.getVideoTracks().length){this.staticSource=await staticProgramSource(canvas);this.stream.addTrack(this.staticSource.track)}
  }else {this.staticSource=await staticProgramSource(canvas);this.stream=new MediaStream([this.staticSource.track])}
  await this.publish()
 }
 async resolveSource(block:PreviewBlock) {
  const source=block.src
  if(!source)throw Error('Source unavailable')
  if(source.startsWith(`blob:${location.origin}/`))return source
  if(this.transport===LOCAL_STUDIO_TRANSPORT||!source.startsWith('/api/admin/events/'))throw Error('Only this event’s library files are allowed')
  const response=await fetch(source.split('#')[0],{signal:AbortSignal.timeout(30000)})
  if(!response.ok)throw Error('Source unavailable')
  const blob=await response.blob();if(blob.size>50*1024*1024)throw Error('Source exceeds 50 MB')
  const url=URL.createObjectURL(blob);this.objectUrls.push(url);return url
 }
 async startCanvas(blocks:PreviewBlock[]) {
  this.runId=(await engineStatus(this.transport)).runtime.runId
  this.canvasSource=await canvasProgramSource(blocks,{resolveSource:block=>this.resolveSource(block)})
  this.stream=this.canvasSource.stream
  await this.publish()
 }
 async publish() {
  if(this.stopped)throw Error('Input preparation cancelled')
  const claim=await engineRequest('input',{runId:this.runId,action:'claim',role:this.role,kind:'file'},undefined,this.transport);this.capability=claim.capability
  if(claim.url!==this.transport.relayUrl)throw Error('Unexpected media relay')
  this.room=new Room({adaptiveStream:false,dynacast:false});await this.room.connect(claim.url,claim.token,{autoSubscribe:false,...(this.transport===LOCAL_STUDIO_TRANSPORT?{rtcConfig:{iceServers:[]}}:{})})
  const video=await this.room.localParticipant.publishTrack(this.stream.getVideoTracks()[0],{source:Track.Source.Camera,simulcast:false,videoCodec:'h264',degradationPreference:'maintain-resolution',videoEncoding:{maxBitrate:6000000,maxFramerate:30}})
  for(const track of this.stream.getAudioTracks())await this.room.localParticipant.publishTrack(track,{source:Track.Source.Microphone,dtx:false,red:false})
  let pending=false
  const report=async()=>{if(pending||this.stopped)return;pending=true;try{if(this.staticSource?.failure||this.canvasSource?.failure)throw Error(this.staticSource?.failure||this.canvasSource?.failure);const counters=await senderStats(video);await engineRequest('input',{runId:this.runId,action:'report',role:this.role,frames:counters.frames,videoTrackSid:video.trackSid,encoding:{...counters,captureMode:this.canvasSource?'explicit-canvas-frames':this.staticSource?'explicit-static-frames':counters.captureMode,...(this.canvasSource?{canvasLayerCount:this.canvasSource.layerCount,canvasVideoLayerCount:this.canvasSource.videoLayerCount,canvasAudioLayerCount:this.canvasSource.audioLayerCount,canvasFramesWritten:this.canvasSource.progress.framesWritten,canvasSourceFrames:this.canvasSource.progress.sourceFrames}:{})}},this.capability,this.transport)}catch(e){this.failure=e instanceof Error?e.message:'Input lost'}finally{pending=false}}
  this.expiry=setTimeout(()=>void this.stop(),Math.max(0,claim.expiresAtMs-Date.now()))
  this.timer=setInterval(()=>void report(),700)
  const until=Date.now()+12000;while(Date.now()<until){await report();if(this.failure)throw Error(this.failure);const s=await engineStatus(this.transport);if(libraryInputReady(s,this.role,video.trackSid))return;await wait(250)}throw Error('Input did not reach both Program decoders; existing Program was preserved')
 }
 async take(){await this.canvasSource?.take();if(this.media){this.media.loop=this.loop;this.media.currentTime=0;await this.media.play()}}
 async stop(){if(this.stopped)return;this.stopped=true;if(this.timer)clearInterval(this.timer);if(this.expiry)clearTimeout(this.expiry);if(this.paint)clearInterval(this.paint);this.staticSource?.stop();this.canvasSource?.stop();this.stream?.getTracks().forEach(t=>t.stop());this.media?.pause();if(this.media){this.media.removeAttribute('src');this.media.load()}await this.room?.disconnect();if(this.capability)await engineRequest('input',{runId:this.runId,action:'stop',role:this.role},this.capability,this.transport).catch(()=>{});this.objectUrls.forEach(url=>URL.revokeObjectURL(url));this.objectUrls=[]}
}
async function senderStats(video:LocalTrackPublication){const report=await video.track?.getRTCStatsReport();let frames=0,width=0,height=0;report?.forEach(s=>{if(s.type==='outbound-rtp'&&(s.kind==='video'||s.mediaType==='video')){frames=s.framesEncoded??0;width=s.frameWidth??0;height=s.frameHeight??0}});return {frames,framesEncoded:frames,width,height,captureMode:'native-media-element',publisherVisibility:document.visibilityState}}
export async function connectProgram(video:HTMLVideoElement,runId:string,transport=LOCAL_STUDIO_TRANSPORT){const config=await engineRequest('viewer',{runId,room:'program'},undefined,transport);if(config.url!==transport.relayUrl)throw Error('Unexpected media relay');const room=new Room({adaptiveStream:false,dynacast:false});const stream=new MediaStream();video.srcObject=stream;room.on(RoomEvent.TrackSubscribed,(track,_p,participant)=>{if(!/^program-engine-\d+$/.test(participant.identity))return;for(const old of stream.getTracks())if(old.kind===track.mediaStreamTrack.kind)stream.removeTrack(old);stream.addTrack(track.mediaStreamTrack);void video.play().catch(()=>{})});await room.connect(config.url,config.token,transport===LOCAL_STUDIO_TRANSPORT?{rtcConfig:{iceServers:[]}}:{});return async()=>{await room.disconnect();video.srcObject=null}}
