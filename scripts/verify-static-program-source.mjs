// Local synthetic pixels only. No external relay, device capture or recording.
import assert from 'node:assert/strict'
import {createServer} from 'node:http'
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs'
import ts from 'typescript'
import {chromium} from 'playwright-core'
const compile=p=>ts.transpileModule(readFileSync(p,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText
const helper=compile('lib/producer/staticProgramSource.ts').replace('./staticProgramSource.worker.ts','./staticProgramSource.worker.js')
const worker=compile('lib/producer/staticProgramSource.worker.ts')
const server=createServer((req,res)=>{res.setHeader('Content-Type',req.url.endsWith('.js')?'text/javascript':'text/html');res.end(req.url==='/source.js'?helper:req.url==='/staticProgramSource.worker.js'?worker:'<!doctype html><title>Local static source regression</title>')})
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser
const timer=setTimeout(()=>{void browser?.close();server.close()},90000)
try{
 browser=await chromium.launch({channel:'chrome',headless:false,chromiumSandbox:true,ignoreDefaultArgs:['--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows'],args:['--autoplay-policy=no-user-gesture-required']})
 const context=await browser.newContext();const page=await context.newPage();await page.goto(`http://127.0.0.1:${server.address().port}`)
 await page.evaluate(async()=>{
  window.MediaRecorder=class{constructor(){throw Error('Recording forbidden')}}
  window.requestAnimationFrame=()=>0
  const {staticProgramSource}=await import('/source.js')
  const canvas=document.createElement('canvas');canvas.width=1920;canvas.height=1080;canvas.getContext('2d').fillRect(0,0,1920,1080)
  const source=await staticProgramSource(canvas);window.probe={source,frames:0,first:0,last:0,width:0,height:0,stopped:false}
  const sender=new RTCPeerConnection({iceServers:[]}),receiver=new RTCPeerConnection({iceServers:[]});window.probe.peers=[sender,receiver]
  const remote=new Promise(resolve=>{receiver.ontrack=event=>resolve(event.track)})
  const transceiver=sender.addTransceiver(source.track,{direction:'sendonly',streams:[new MediaStream([source.track])],sendEncodings:[{maxBitrate:6000000,maxFramerate:30,scaleResolutionDownBy:1}]})
  const codecs=RTCRtpSender.getCapabilities('video').codecs.filter(c=>c.mimeType.toLowerCase()==='video/h264');transceiver.setCodecPreferences(codecs)
  const params=transceiver.sender.getParameters();params.degradationPreference='maintain-resolution';await transceiver.sender.setParameters(params)
  const gathered=pc=>pc.iceGatheringState==='complete'?Promise.resolve():new Promise(resolve=>{pc.addEventListener('icegatheringstatechange',()=>{if(pc.iceGatheringState==='complete')resolve()})})
  await sender.setLocalDescription(await sender.createOffer());await gathered(sender);await receiver.setRemoteDescription(sender.localDescription);await receiver.setLocalDescription(await receiver.createAnswer());await gathered(receiver);await sender.setRemoteDescription(receiver.localDescription)
  const reader=new MediaStreamTrackProcessor({track:await remote}).readable.getReader();window.probe.reader=reader
  void(async()=>{while(!window.probe.stopped){const r=await reader.read();if(r.done)break;try{window.probe.frames++;window.probe.first ||= r.value.timestamp;window.probe.last=r.value.timestamp;window.probe.width=r.value.displayWidth;window.probe.height=r.value.displayHeight}finally{r.value.close()}}})()
 })
 const other=await context.newPage();await other.goto(`http://127.0.0.1:${server.address().port}/other`);await other.bringToFront()
 const session=await context.newCDPSession(page),windowInfo=await session.send('Browser.getWindowForTarget')
 await session.send('Browser.setWindowBounds',{windowId:windowInfo.windowId,bounds:{windowState:'minimized'}})
 await new Promise(r=>setTimeout(r,500))
 const ready=Date.now()+10000;while(await page.evaluate(()=>window.probe.frames)<30){assert.ok(Date.now()<ready,'Local WebRTC decoder startup');await new Promise(r=>setTimeout(r,100))}
 const start=await page.evaluate(()=>({frames:window.probe.frames,atMs:performance.now(),visibility:document.visibilityState}))
 await new Promise(r=>setTimeout(r,35000))
 const end=await page.evaluate(()=>{const p=window.probe;return {frames:p.frames,atMs:performance.now(),width:p.width,height:p.height,failure:p.source.failure,visibility:document.visibilityState}})
 const fps=(end.frames-start.frames)*1000/(end.atMs-start.atMs);assert.equal(end.width,1920);assert.equal(end.height,1080);assert.equal(end.failure,null);assert.ok(fps>=29.5&&fps<=30.5,JSON.stringify({fps,end}))
 await page.evaluate(async()=>{window.probe.stopped=true;window.probe.source.stop();await window.probe.reader.cancel();window.probe.peers.forEach(p=>p.close())})
 assert.equal(await page.evaluate(()=>window.probe.source.track.readyState),'ended')
 const result={passed:true,visibility:end.visibility,limitation:'Owned browser did not expose hidden visibility; actual hidden-tab delivery remains part of the hosted soak.',localWebRtc:true,requestAnimationFrameDisabled:true,mainThreadCanvasRepaints:0,seconds:35,fps,width:end.width,height:end.height,trackStopped:true,recording:false,externalConnections:false}
 mkdirSync('.local/static-source-regression',{recursive:true});writeFileSync('.local/static-source-regression/result.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result))
}finally{clearTimeout(timer);await browser?.close();server.close()}
