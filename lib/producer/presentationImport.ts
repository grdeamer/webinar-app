import { MAX_PRESENTATION_SLIDES } from './presentationFiles'
export type PresentationDeckMetadata={originalName:string;pageCount:number;thumbnails:string[]}
export async function importLocalPresentation(file:File):Promise<{file:File;deck:PresentationDeckMetadata}> {
  const response=await fetch('/dev/producer-media/convert-presentation',{method:'POST',headers:{'Content-Type':'application/octet-stream','X-Jupiter-Filename':encodeURIComponent(file.name)},body:file,signal:AbortSignal.timeout(80000)})
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
      await page.render({canvas,viewport}).promise;thumbnails.push(canvas.toDataURL('image/png'));page.cleanup()
    }
    return {file:converted,deck:{originalName:file.name,pageCount:document.numPages,thumbnails}}
  }finally{await task.destroy()}
}
