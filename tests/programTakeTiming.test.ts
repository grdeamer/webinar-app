import assert from 'node:assert/strict'
import test from 'node:test'
import {programMarkerRevision,watchPresentedProgramRevision} from '../lib/producer/programTakeTiming.ts'
function marker(revision:number){
 const bytes=[0x4a,(revision>>>16)&255,(revision>>>8)&255,revision&255,0,8]
 bytes.push(bytes.reduce((sum,value)=>sum^value,0))
 const pixels=new Uint8ClampedArray(672*12*4)
 for(let cell=0;cell<56;cell++)if(bytes[Math.floor(cell/8)]&(1<<(7-cell%8))){const offset=(6*672+cell*12+6)*4;pixels.fill(255,offset,offset+4)}
 return pixels
}
test('presented marker timing rejects corrupted rows and identifies the exact Program revision',()=>{
 assert.equal(programMarkerRevision(marker(0x12ab34)),0x12ab34)
 assert.equal(programMarkerRevision(new Uint8ClampedArray(4)),null)
 const corrupted=marker(27);corrupted.fill(255,(6*672+6)*4,(6*672+6)*4+4)
 assert.equal(programMarkerRevision(corrupted),null)
})
test('old frames cannot satisfy TAKE timing; only the new 1080p revision resolves it',async t=>{
 const previous=Object.getOwnPropertyDescriptor(globalThis,'document')
 t.after(()=>{if(previous)Object.defineProperty(globalThis,'document',previous);else Reflect.deleteProperty(globalThis,'document')})
 let pixels=marker(40),callback:VideoFrameRequestCallback,reads=0,cancelled=0
 const monitor={videoWidth:1920,videoHeight:1080,requestVideoFrameCallback:(cb:VideoFrameRequestCallback)=>{callback=cb;return 1},cancelVideoFrameCallback:()=>{cancelled++}}
 const video=monitor as unknown as HTMLVideoElement
 Object.defineProperty(globalThis,'document',{configurable:true,value:{createElement:()=>({getContext:()=>({drawImage:()=>{reads++},getImageData:()=>({data:pixels})})})}})
 const watch=watchPresentedProgramRevision(video,41)
 let resolved=false;void watch.promise.then(()=>{resolved=true})
 callback(0,{expectedDisplayTime:0} as VideoFrameCallbackMetadata)
 await Promise.resolve();assert.equal(resolved,false)
 pixels=marker(41);monitor.videoWidth=1280
 callback(0,{expectedDisplayTime:0} as VideoFrameCallbackMetadata)
 await Promise.resolve();assert.equal(resolved,false)
 monitor.videoWidth=1920;callback(0,{expectedDisplayTime:0} as VideoFrameCallbackMetadata)
 assert.ok((await watch.promise).atMs!==null)
 assert.equal(reads,2);assert.equal(cancelled,1)
})
test('unsupported monitors report unavailable timing rather than a fabricated instant result',async()=>{
 assert.equal((await watchPresentedProgramRevision(null,10).promise).atMs,null)
})
