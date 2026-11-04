import type {PDFPageProxy,RenderParameters} from 'pdfjs-dist/types/src/display/api'

/** Offscreen Program preparation must progress even when the console tab is hidden.
 * PDF.js display rendering waits for requestAnimationFrame, which hidden tabs suspend.
 * Its print intent uses promise scheduling; this renders pixels only, never prints or records.
 */
export async function renderProgramSlide(page:Pick<PDFPageProxy,'render'>,params:Omit<RenderParameters,'intent'>,timeoutMs=15000):Promise<void> {
 const task=page.render({...params,intent:'print'})
 let timer:ReturnType<typeof setTimeout>
 try {
  await Promise.race([task.promise,new Promise<never>((_,reject)=>{timer=setTimeout(()=>{task.cancel();reject(Error('Slide rendering timed out; Program was preserved'))},timeoutMs)})])
 }finally{clearTimeout(timer)}
}
