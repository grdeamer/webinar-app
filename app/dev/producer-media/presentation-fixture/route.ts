import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
export const dynamic='force-dynamic'
export async function GET(request:Request){
  const url=new URL(request.url),format=url.searchParams.get('format')
  if(process.env.NODE_ENV!=='development'||!['localhost','127.0.0.1','[::1]'].includes(url.hostname)||request.headers.get('sec-fetch-site')==='cross-site'||!['pptx','ppt'].includes(format??''))return new Response('Not found',{status:404})
  try{return new Response(new Uint8Array(await readFile(resolve('.local/production/presentation-fixtures',`source.${format}`))),{headers:{'Cache-Control':'no-store','Content-Type':format==='pptx'?'application/vnd.openxmlformats-officedocument.presentationml.presentation':'application/vnd.ms-powerpoint'}})}catch{return new Response('Generated test fixture is unavailable',{status:404})}
}
