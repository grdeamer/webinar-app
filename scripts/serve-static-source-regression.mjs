// Bounded loopback fixture for verifying the real background publisher tab.
import {createServer} from 'node:http'
import {readFileSync} from 'node:fs'
import ts from 'typescript'
const compile=p=>ts.transpileModule(readFileSync(p,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText
const helper=compile('lib/producer/staticProgramSource.ts').replace('./staticProgramSource.worker.ts','./staticProgramSource.worker.js'),worker=compile('lib/producer/staticProgramSource.worker.ts')
const html=`<!doctype html><title>Local static input regression</title><pre>Starting local synthetic track</pre><script type="module">
window.MediaRecorder=class{constructor(){throw Error('Recording forbidden')}};window.requestAnimationFrame=()=>0;
const pre=document.querySelector('pre');let source,reader,frames=0,first=null,last=0,width=0,height=0,stopped=false;
try {const {staticProgramSource}=await import('/source.js');const canvas=document.createElement('canvas');canvas.width=1920;canvas.height=1080;canvas.getContext('2d').fillRect(0,0,1920,1080);source=await staticProgramSource(canvas);reader=new MediaStreamTrackProcessor({track:source.track}).readable.getReader();
void(async()=>{while(!stopped){const r=await reader.read();if(r.done)break;try{frames++;first??=r.value.timestamp;last=r.value.timestamp;width=r.value.displayWidth;height=r.value.displayHeight}finally{r.value.close()}}})();
const update=()=>{pre.textContent=JSON.stringify({frames,seconds:(last-first)/1e6,fps:(frames-1)*1e6/(last-first),width,height,visibility:document.visibilityState,failure:source.failure,requestAnimationFrameDisabled:true,recording:false,stopped,trackState:source.track.readyState})};const timer=setInterval(update,1000);setTimeout(async()=>{stopped=true;source.stop();await reader.cancel();clearInterval(timer);update()},45000);
}catch(e){pre.textContent=JSON.stringify({error:e.message})}
</script>`
const server=createServer((req,res)=>{res.setHeader('Content-Type',req.url.endsWith('.js')?'text/javascript':'text/html');res.end(req.url==='/source.js'?helper:req.url==='/staticProgramSource.worker.js'?worker:html)});server.listen(4393,'127.0.0.1',()=>console.log('Bounded local regression http://127.0.0.1:4393'));setTimeout(()=>server.close(),120000)
