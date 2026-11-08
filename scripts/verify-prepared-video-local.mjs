/** Local decoder/TAKE regression, not a hosted Program qualification. No recording. */
import {createServer} from 'node:http'
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs'
import ts from 'typescript'
const file=process.argv[2]
if(!file)throw new Error('Usage: node scripts/verify-prepared-video-local.mjs /absolute/path/to/synthetic-video.mp4')
const helper=ts.transpileModule(readFileSync(new URL('../lib/producer/takePreparedMedia.ts',import.meta.url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText
const html=`<!doctype html><title>Jupiter local warm video regression</title><button id="start">Run local 65-second test</button><pre id="result">Ready. Existing synthetic file only. Recording off.</pre><video id="source" muted playsinline style="display:none"></video><video id="receiver" muted playsinline style="display:none"></video><script type="module">
import {takePreparedMedia} from '/helper.js';
const output=document.querySelector('#result'),source=document.querySelector('#source'),receiver=document.querySelector('#receiver');
document.querySelector('#start').onclick=async()=>{
 document.querySelector('#start').disabled=true;let peer,other,stream;const samples=[],takes=[];let seeks=0;
 try{
  source.src='/video.mp4';source.loop=true;source.muted=true;await source.play();source.addEventListener('seeking',()=>seeks++);
  stream=source.captureStream();peer=new RTCPeerConnection({iceServers:[]});other=new RTCPeerConnection({iceServers:[]});
  peer.onicecandidate=e=>{if(e.candidate)other.addIceCandidate(e.candidate)};other.onicecandidate=e=>{if(e.candidate)peer.addIceCandidate(e.candidate)};
  const ready=new Promise(resolve=>{other.ontrack=e=>{receiver.srcObject=new MediaStream([e.track]);receiver.play().then(resolve)}});
  const sender=peer.addTrack(stream.getVideoTracks()[0]);const transceiver=peer.getTransceivers()[0];const h264=RTCRtpSender.getCapabilities('video').codecs.filter(c=>c.mimeType==='video/H264');if(h264.length)transceiver.setCodecPreferences(h264);const params=sender.getParameters();params.degradationPreference="maintain-resolution";params.encodings=[{maxFramerate:30,maxBitrate:6000000}];await sender.setParameters(params);
  await peer.setLocalDescription(await peer.createOffer());await other.setRemoteDescription(peer.localDescription);await other.setLocalDescription(await other.createAnswer());await peer.setRemoteDescription(other.localDescription);await ready;
  const started=performance.now();let last=started,lastDecoded=0,lastSource=0;let wraps=0;
  while(performance.now()-started<65000){
   await new Promise(r=>setTimeout(r,1000));const now=performance.now(),stats=await other.getStats();let frames=0,width=0,height=0;
   stats.forEach(s=>{if(s.type==='inbound-rtp'&&s.kind==='video'){frames=s.framesDecoded??0;width=s.frameWidth??0;height=s.frameHeight??0}});
   const sourceFrames=source.getVideoPlaybackQuality().totalVideoFrames;
   if(source.currentTime<lastSource)wraps++;lastSource=source.currentTime;
   samples.push({elapsedMs:now-started,decoded:frames,sourceFrames,decodedFps:(frames-lastDecoded)*1000/(now-last),width,height,currentTime:source.currentTime,seeks});last=now;lastDecoded=frames;
   if(takes.length<3&&now-started>=[10000,30000,50000][takes.length]){const before=source.currentTime,at=performance.now(),beforeSeeks=seeks;await takePreparedMedia([{element:source,loop:true}]);takes.push({elapsedMs:at-started,helperMs:performance.now()-at,beforeTime:before,afterTime:source.currentTime,seekDelta:seeks-beforeSeeks})}
   output.textContent=JSON.stringify({state:'running',elapsedMs:now-started,takes,sample:samples.at(-1)},null,2);
  }
  const steady=samples.slice(2),lastSample=samples.at(-1),firstSample=samples[0];
  const result={state:'completed',scope:'local native file + independent loopback WebRTC decoder; not hosted Program latency',recording:false,observationMs:performance.now()-started,takes,wraps,sourceFramesAdvanced:lastSample.sourceFrames-firstSample.sourceFrames,decodedFpsRange:[Math.min(...steady.map(s=>s.decodedFps)),Math.max(...steady.map(s=>s.decodedFps))],samples};
  result.windows=[0,1].map(i=>{const start=samples[1+i*30],end=samples[31+i*30];return {durationMs:end.elapsedMs-start.elapsedMs,decodedFps:(end.decoded-start.decoded)*1000/(end.elapsedMs-start.elapsedMs),sourceFps:(end.sourceFrames-start.sourceFrames)*1000/(end.elapsedMs-start.elapsedMs),all1080:samples.slice(1+i*30,32+i*30).every(s=>s.width===1920&&s.height===1080)}});
  result.passed=result.windows.every(w=>w.all1080&&w.decodedFps>=29.5&&w.decodedFps<=30.5)&&takes.length===3&&takes.every(t=>t.seekDelta===0&&t.afterTime>=t.beforeTime)&&wraps>=1&&steady.every(s=>s.width===1920&&s.height===1080&&s.decodedFps>25)&&result.sourceFramesAdvanced>1800;
  output.textContent=JSON.stringify(result,null,2);await fetch('/result',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(result)});
 }catch(error){output.textContent=JSON.stringify({state:'failed',error:String(error)});await fetch('/result',{method:'POST',body:output.textContent})}
 finally{peer?.close();other?.close();stream?.getTracks().forEach(t=>t.stop());source.pause();source.removeAttribute('src');source.load();receiver.srcObject=null}
};</script>`
const server=createServer((req,res)=>{
 if(req.url==='/'){res.setHeader('Content-Type','text/html');res.end(html)}
 else if(req.url==='/helper.js'){res.setHeader('Content-Type','text/javascript');res.end(helper)}
 else if(req.url==='/video.mp4'){res.setHeader('Content-Type','video/mp4');res.end(readFileSync(file))}
 else if(req.url==='/result'&&req.method==='POST'){let body='';req.on('data',chunk=>{body+=chunk;if(body.length>100000)req.destroy()});req.on('end',()=>{const result=JSON.parse(body);mkdirSync('.local/db-io-audit',{recursive:true});writeFileSync('.local/db-io-audit/prepared-video-result.json',JSON.stringify(result,null,2));res.end('saved');console.log(JSON.stringify({state:result.state,passed:result.passed,observationMs:result.observationMs,takes:result.takes,wraps:result.wraps,sourceFramesAdvanced:result.sourceFramesAdvanced,decodedFpsRange:result.decodedFpsRange}));server.close()})}
 else {res.statusCode=404;res.end()}
});server.listen(4318,'127.0.0.1',()=>console.log('Local metadata-only test: http://127.0.0.1:4318'));
const deadline=setTimeout(()=>{server.closeAllConnections();server.close();process.exitCode=1},180000);server.on('close',()=>clearTimeout(deadline));
