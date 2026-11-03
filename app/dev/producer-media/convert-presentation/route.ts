import { convertLocalPresentation } from '@/lib/producer/localPresentationConversion'
import { MAX_PRESENTATION_BYTES } from '@/lib/producer/presentationFiles'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export const maxDuration=90
let busy=false
export async function POST(request:Request) {
  const url=new URL(request.url)
  if(process.env.NODE_ENV!=='development'||!['localhost','127.0.0.1','[::1]'].includes(url.hostname))return new Response('Not found',{status:404})
  if(request.headers.get('origin')!==url.origin||request.headers.get('sec-fetch-site')==='cross-site')return Response.json({error:'Same-origin local upload required'},{status:403})
  if(busy)return Response.json({error:'A presentation is already converting; try again when it finishes'},{status:429})
  busy=true
  try {
    if(Number(request.headers.get('content-length'))>MAX_PRESENTATION_BYTES)throw new Error('PowerPoint files must be at most 50 MB')
    const reader=request.body?.getReader();if(!reader)throw new Error('Choose a PowerPoint file')
    const chunks:Uint8Array[]=[];let bytes=0
    while(true){const part=await reader.read();if(part.done)break;bytes+=part.value.byteLength;if(bytes>MAX_PRESENTATION_BYTES){await reader.cancel();throw new Error('PowerPoint files must be at most 50 MB')}chunks.push(part.value)}
    const name=decodeURIComponent(request.headers.get('x-jupiter-filename')||'')
    const pdf=await convertLocalPresentation(name,Buffer.concat(chunks))
    return new Response(new Uint8Array(pdf),{headers:{'Content-Type':'application/pdf','Cache-Control':'no-store','Content-Disposition':'attachment; filename="converted-slides.pdf"'}})
  } catch(error){return Response.json({error:error instanceof Error?error.message:'PowerPoint conversion failed'},{status:400})}
  finally{busy=false}
}
