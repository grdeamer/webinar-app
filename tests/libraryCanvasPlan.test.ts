import test from 'node:test'
import assert from 'node:assert/strict'
import { libraryCanvasPlan, libraryCanvasInputBlock } from '../lib/producer/libraryCanvasPlan.ts'
const blue={id:'blue',type:'image' as const,src:'blob:local/blue',x:0,y:0,width:640,height:360,zIndex:1}
const orange={...blue,id:'orange',src:'blob:local/orange',x:320,y:180,width:320,height:180,zIndex:3,opacity:0.5}
test('snapshot includes all visible layers in z order and preserves transforms and source identity',()=>{
 const original=[orange,{...blue,id:'hidden',hidden:true},blue]
 const plan=libraryCanvasPlan(original)
 assert.deepEqual(plan.map(block=>block.id),['blue','orange']);assert.equal(plan[1].x,320);assert.equal(plan[1].opacity,.5)
 original[0].x=10;assert.equal(plan[1].x,320)
 assert.equal(libraryCanvasInputBlock().width,640);assert.equal(libraryCanvasInputBlock().opacity,1)
})
test('invalid layer fails the entire next canvas rather than silently dropping it',()=>{
 assert.throws(()=>libraryCanvasPlan([blue,{...orange,type:'camera-slot'}]),/Live camera/)
 assert.throws(()=>libraryCanvasPlan([blue,{...orange,x:NaN}]),/finite/)
 assert.throws(()=>libraryCanvasPlan([blue,{...blue}]),/unique/)
 assert.throws(()=>libraryCanvasPlan([{...blue,hidden:true}]),/visible/)
})
test('audio and PowerPoint slide metadata survive the snapshot',()=>{
 const plan=libraryCanvasPlan([blue,{...orange,type:'pdf',pdfPage:2},{...blue,id:'tone',type:'audio',mediaMuted:true,mediaGain:.3}])
 assert.equal(plan.find(block=>block.id==='orange').pdfPage,2)
 assert.equal(plan.find(block=>block.id==='tone').mediaMuted,true)
})
test('resource bounds reject excess layers and videos before preparing any media',()=>{
 assert.throws(()=>libraryCanvasPlan(Array.from({length:17},(_,i)=>({...blue,id:`layer-${i}`}))),/16 visible/)
 assert.throws(()=>libraryCanvasPlan(Array.from({length:5},(_,i)=>({...blue,id:`video-${i}`,type:'video'}))),/four simultaneous/)
})
