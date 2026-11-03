import { MAX_PRESENTATION_SLIDES } from './presentationFiles'
export type PresentationDeckMetadata={originalName:string;pageCount:number;thumbnails:string[]}
export async function importLocalPresentation(file:File,engineRoot?:string):Promise<{file:File;deck:PresentationDeckMetadata}> {
  let endpoint='/dev/producer-media/convert-presentation',authorization:Record<string,string>={}
  if(engineRoot){const statusResponse=await fetch(engineRoot+'/api/producer/status',{cache:'no-store',signal:AbortSignal.timeout(15000)});const status=await statusResponse.json();if(!statusResponse.ok||!status.runtime?.running)throw Error('Start the producer engine before converting PowerPoint');const ticketResponse=await fetch(engineRoot+'/presentation-ticket',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({runId:status.runtime.runId,name:file.name,bytes:file.size})});const grant=await ticketResponse.json();if(!ticketResponse.ok)throw Error(grant.error||'Presentation conversion unavailable');const url=new URL(grant.url);if(url.origin!=='https://producer-engine.jupiter.events'||url.pathname!=='/presentation'||url.search||url.hash)throw Error('Invalid conversion destination');endpoint=url.href;authorization={Authorization:'Bearer '+grant.ticket}}
  const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/octet-stream',...(engineRoot?authorization:{'X-Jupiter-Filename':encodeURIComponent(file.name)})},body:file,signal:AbortSignal.timeout(80000)})
  if(!response.ok){const result=await response.json();throw new Error(result.error||'PowerPoint conversion failed')}
  const bytes=await response.arrayBuffer(),converted=new File([bytes],file.name.replace(/\.pptx?$/i,'.pdf'),{type:'application/pdf'})
  const pdf=await import('pdfjs-dist')
  pdf.GlobalWorkerOptions.workerSrc=new URL('pdfjs-dist/build/pdf.worker.min.mjs',import.meta.url).toString()
  const task=pdf.getDocument({data:new Uint8Array(bytes)})
  try{
    const document=await task.promise
    if(document.numPages>MAX_PRESENTATION_SLIDES)throw new Error('Presentations are limited to 100 slides')
    const thumbnails:string[]=[]
    for(let index=1;index<=document.numPages;index++){
      const page=await document.getPage(index),original=page.getViewport({scale:1}),viewport=page.getViewport({scale:Math.min(240/original.width,150/original.height)})
      const canvas=window.document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height)
      await page.render({canvas,viewport}).promise;thumbnails.push(canvas.toDataURL('image/jpeg',0.65));page.cleanup()
    }
    return {file:converted,deck:{originalName:file.name,pageCount:document.numPages,thumbnails}}
  }finally{await task.destroy()}
}
