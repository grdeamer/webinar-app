import {localTransportOriginAllowed} from '@/lib/producer/localTransportOrigin'
import { NextResponse } from 'next/server'
export const runtime='nodejs'
export const dynamic='force-dynamic'
const engine='http://127.0.0.1:4311'
function allowed(req:Request,write=false) {return process.env.NODE_ENV==='development' && localTransportOriginAllowed(req,write)}
export async function GET(req:Request) {
 if(!allowed(req))return new Response('Not found',{status:404})
 try { const r=await fetch(engine+'/api/producer/status',{cache:'no-store',signal:AbortSignal.timeout(3000)});const s=await r.json();if(s.externalServices!==false||s.recordingEnabled!==false||!s.runtime.rehearsal||s.runtime.cloudDeployed)throw Error('Local-only engine required');if(new URL(req.url).searchParams.get('soak')==='1'){const result=await fetch(engine+'/api/library-soak',{cache:'no-store'});return NextResponse.json(await result.json(),{status:result.status})}return NextResponse.json(s,{headers:{'Cache-Control':'no-store'}})}catch{return NextResponse.json({error:'Local engine unavailable'},{status:503})}
}
export async function POST(req:Request) {
 if(!allowed(req,true))return new Response('Forbidden',{status:403})
 try {const text=await req.text();if(text.length>16000)throw Error('Request too large');const x=JSON.parse(text);if(!['input','viewer','command','soak'].includes(x.endpoint))throw Error('Unsupported operation');const check=await GET(req);if(!check.ok)return check;const status=await check.json();if(x.runId!==status.runtime.runId||!status.runtime.running)throw Error('Rehearsal changed or stopped');const r=await fetch(engine+(x.endpoint==='soak'?'/api/library-soak':'/api/producer/'+x.endpoint),{method:'POST',headers:{'Content-Type':'application/json','X-Jupiter-Local':x.endpoint==='soak'?'library-soak':'producer-rehearsal',...(req.headers.get('x-input-capability')?{'X-Input-Capability':req.headers.get('x-input-capability')!}:{})},body:JSON.stringify(x),signal:AbortSignal.timeout(10000)});return NextResponse.json(await r.json(),{status:r.status,headers:{'Cache-Control':'no-store'}})}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Local request failed'},{status:400})}
}
