import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {renderProgramSlide} from '../lib/producer/programSlideRender.ts'

test('actual PDF.js Program rendering progresses when browser animation frames never fire',async()=>{
 const canvas=await import('@napi-rs/canvas')
 const globals=globalThis as unknown as Record<string,unknown>
 const originalWindow=globals.window
 globals.DOMMatrix=canvas.DOMMatrix;globals.Path2D=canvas.Path2D;globals.ImageData=canvas.ImageData
 let animationRequests=0
 globals.window={requestAnimationFrame:()=>{animationRequests++;return 1},cancelAnimationFrame:()=>{}}
 const pdf=await import('pdfjs-dist/legacy/build/pdf.mjs')
 const task=pdf.getDocument({data:new Uint8Array(readFileSync(new URL('../tools/production-local/runtime/assets/deck.pdf',import.meta.url))),useSystemFonts:true})
 try{
  const doc=await task.promise,page=await doc.getPage(1),viewport=page.getViewport({scale:1})
  const first=canvas.createCanvas(viewport.width,viewport.height)
  const stalled=page.render({canvas:first as unknown as HTMLCanvasElement,viewport})
  let finished=false;void stalled.promise.then(()=>{finished=true},()=>{})
  await new Promise(resolve=>setTimeout(resolve,50))
  assert.ok(animationRequests>0);assert.equal(finished,false)
  stalled.cancel();await stalled.promise.catch(()=>{})
  const second=canvas.createCanvas(viewport.width,viewport.height),before=animationRequests
  await renderProgramSlide(page,{canvas:second as unknown as HTMLCanvasElement,viewport},2000)
  assert.equal(animationRequests,before,'Offscreen Program rendering must not wait for display refresh')
  assert.ok(second.getContext('2d').getImageData(0,0,1,1).data[3]>0)
 }finally{await task.destroy();globals.window=originalWindow}
})
