import { producerBackend, ec2ProducerStatus, prepareEc2Producer, stopEc2Producer, validateEc2Scope } from '@/lib/production/hosted/ec2Worker'
import {engineEndpoint} from '@/lib/production/hosted/protocol'
import { sealEc2Configuration } from '@/lib/production/ec2SealedConfig'
import { NextResponse } from 'next/server'
import { requireEventOperatorAccess } from '@/lib/eventTeamAccess'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { callHostedEngine } from '@/lib/production/hosted/client'
import { prepareHostedRehearsal } from '@/lib/production/hosted/sandboxWorker'
import { readStudioAsset } from '@/lib/production/hosted/studioAssets'
import { canStartProducerEngine } from '@/lib/producer/engineOwner'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300
type Context = { params: Promise<{ id: string; sessionId: string; path: string[] }> }
async function handle(request: Request, context: Context) {
  const { id, sessionId, path } = await context.params
  const access = await requireEventOperatorAccess(id, ['event_admin', 'producer'], 'producer_room')
  if (access instanceof NextResponse) return access
  if (request.method === 'POST' && path.join('/') === 'prepare' && !canStartProducerEngine(access.user, access.isGlobalAdmin)) {
    return Response.json({ error: 'Only the engine owner can start paid compute' }, { status: 403 })
  }
  const { data, error } = await supabaseAdmin.from('event_sessions').select('id').eq('id', sessionId).eq('event_id', access.eventId).maybeSingle()
  if (error || !data) return Response.json({ error: 'Session access denied' }, { status: 403 })
  const operation = '/' + path.join('/')
  if (request.method === 'POST' && (request.headers.get('origin') !== new URL(request.url).origin || !request.headers.get('content-type')?.startsWith('application/json'))) return Response.json({ error: 'Same-origin JSON required' }, { status: 403 })
  try {
    const scope = { eventId: access.eventId, sessionId, actorId: access.user.id }
    if(operation==='/api/producer/control-ticket'&&request.method==='POST'){
      const text=await request.text();if(Buffer.byteLength(text)>80000)return Response.json({error:'Request too large'},{status:413})
      const input=JSON.parse(text)
      const result=await callHostedEngine({scope,path:operation,method:'POST',body:JSON.stringify({runId:input.runId,expectedRevision:input.expectedRevision,role:input.role,trackSid:input.trackSid,composition:input.composition,origin:new URL(request.url).origin})})
      if(!result.ok)return result
      const grant=await result.json();return Response.json({...grant,url:engineEndpoint(process.env.PRODUCER_ENGINE_URL||'').href},{headers:{'Cache-Control':'no-store'}})
    }
    if(operation==='/presentation-ticket'&&request.method==='POST'){
      const text=await request.text();if(Buffer.byteLength(text)>16000)return Response.json({error:"Request too large"},{status:413})
      const input=JSON.parse(text)
      const response=await callHostedEngine({scope,path:'/api/producer/presentation-ticket',method:'POST',body:JSON.stringify({runId:input.runId,name:input.name,bytes:input.bytes,origin:new URL(request.url).origin})})
      if(!response.ok)return response
      const grant=await response.json(),url=new URL('/presentation',process.env.PRODUCER_ENGINE_URL)
      return Response.json({...grant,url:url.href},{headers:{'Cache-Control':'no-store'}})
    }
    if (operation === '/seal-ec2-configuration' && request.method === 'POST') {
      if (!access.isGlobalAdmin) return Response.json({ error: 'Global administrator required' }, { status: 403 })
      validateEc2Scope(scope)
      const sealed = sealEc2Configuration(process.env.PRODUCER_ENGINE_EC2_BOOTSTRAP_PUBLIC_KEY || '', { LIVEKIT_URL: process.env.LIVEKIT_URL || '', LIVEKIT_API_KEY: process.env.LIVEKIT_API_KEY || '', LIVEKIT_API_SECRET: process.env.LIVEKIT_API_SECRET || '', PRODUCER_ENGINE_SECRET: process.env.PRODUCER_ENGINE_SECRET || '' }, Number(process.env.PRODUCER_ENGINE_EC2_BOOTSTRAP_ALLOWED_UNTIL_MS))
      return new Response(JSON.stringify(sealed), { headers: { 'Content-Type': 'application/octet-stream', 'Content-Disposition': 'attachment; filename=producer-ec2-config.sealed.json', 'Cache-Control': 'no-store' } })
    }
    if (producerBackend() === 'ec2') {
      validateEc2Scope(scope)
      if (operation === '/infrastructure' && request.method === 'GET') return Response.json(await ec2ProducerStatus())
      if (operation === '/stop-infrastructure' && request.method === 'POST') return Response.json(await stopEc2Producer(scope))
    }
    if (operation === '/prepare' && request.method === 'POST') {
      if (!access.isGlobalAdmin) return Response.json({ error: 'Only the global administrator can prepare this paid single-use trial' }, { status: 403 })
      if (producerBackend() === 'ec2') return Response.json(await prepareEc2Producer(scope))
      console.info('hosted-rehearsal-preflight', { nowMs: Date.now(), allowedUntilMs: Number(process.env.PRODUCER_ENGINE_TRIAL_ALLOWED_UNTIL_MS), transportConfigured: Boolean(process.env.LIVEKIT_URL?.startsWith('wss:')), apiKeyConfigured: Boolean(process.env.LIVEKIT_API_KEY), apiSecretConfigured: Boolean(process.env.LIVEKIT_API_SECRET), signingKeyConfigured: (process.env.PRODUCER_ENGINE_SECRET?.length ?? 0) >= 32 })
      return Response.json(await prepareHostedRehearsal({ eventId: access.eventId, sessionId, actorId: access.user.id }))
    }
    if (request.method === 'GET' && !operation.startsWith('/api/')) {
      const root = `/admin/events/${encodeURIComponent(id)}/producer/rehearsal/engine/${encodeURIComponent(sessionId)}`
      return readStudioAsset(operation, root)
    }
    if(operation==='/api/producer/soak'&&!access.isGlobalAdmin)return Response.json({error:'Only the global administrator can control the approved soak'},{status:403})
    const length = Number(request.headers.get('content-length') || 0)
    if (length > 80_000) return Response.json({ error: 'Request too large' }, { status: 413 })
    const body = request.method === 'POST' ? await request.text() : ''
    if (Buffer.byteLength(body) > 80_000) return Response.json({ error: 'Request too large' }, { status: 413 })
    return await callHostedEngine({ scope: { eventId: access.eventId, sessionId, actorId: access.user.id }, path: operation, method: request.method as 'GET' | 'POST', body, ...(request.headers.has('x-input-capability') ? { inputCapability: request.headers.get('x-input-capability')! } : {}) })
  } catch (error) {
    if(producerBackend()==='ec2'&&operation==='/api/producer/status'){try{const infrastructure=await ec2ProducerStatus();if(infrastructure.state!=='running')return Response.json({error:`Producer engine is ${infrastructure.state}. Use Start producer engine, wait for startup, then connect.`,state:infrastructure.state},{status:503,headers:{'Cache-Control':'no-store'}})}catch{/* Preserve a safe generic error when AWS status is unavailable. */}}
    const value = error as { name?: string; status?: number; statusCode?: number; code?: string; message?: string; response?: { status?: number }; json?: { error?: { code?: string } } }
    const summary = (value?.message || '').split('\n')[0].replace(/https?:\/\/\S+|[A-Za-z0-9_=-]{24,}/g, '[redacted]').slice(0, 180)
    console.error('hosted-rehearsal-failure', { operation, name: value?.name?.slice(0, 80), summary, status: value?.response?.status ?? value?.status ?? value?.statusCode, code: /^[A-Za-z0-9_-]{1,80}$/.test(value?.code || '') ? value.code : undefined })
    const known = ['Hosted trial authorization expired', 'Hosted media configuration incomplete', 'This single-use trial was already prepared. No repeated paid run was started.', 'Hosted preparation failed; the trial worker was stopped']
    return Response.json({ error: known.includes(value?.message || '') ? value.message : 'Hosted rehearsal unavailable. No automatic restart was attempted.' }, { status: 502, headers: { 'Cache-Control': 'no-store' } })
  }
}
export const GET = handle
export const POST = handle
