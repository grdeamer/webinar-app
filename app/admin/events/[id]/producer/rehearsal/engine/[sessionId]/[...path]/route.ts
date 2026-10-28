import { NextResponse } from 'next/server'
import { requireEventOperatorAccess } from '@/lib/eventTeamAccess'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { callHostedEngine } from '@/lib/production/hosted/client'
import { prepareHostedRehearsal } from '@/lib/production/hosted/sandboxWorker'
import { readStudioAsset } from '@/lib/production/hosted/studioAssets'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300
type Context = { params: Promise<{ id: string; sessionId: string; path: string[] }> }
async function handle(request: Request, context: Context) {
  const { id, sessionId, path } = await context.params
  const access = await requireEventOperatorAccess(id, ['event_admin', 'producer'], 'producer_room')
  if (access instanceof NextResponse) return access
  const { data, error } = await supabaseAdmin.from('event_sessions').select('id').eq('id', sessionId).eq('event_id', access.eventId).maybeSingle()
  if (error || !data) return Response.json({ error: 'Session access denied' }, { status: 403 })
  const operation = '/' + path.join('/')
  if (request.method === 'POST' && (request.headers.get('origin') !== new URL(request.url).origin || !request.headers.get('content-type')?.startsWith('application/json'))) return Response.json({ error: 'Same-origin JSON required' }, { status: 403 })
  try {
    if (operation === '/prepare' && request.method === 'POST') {
      if (!access.isGlobalAdmin) return Response.json({ error: 'Only the global administrator can prepare this paid single-use trial' }, { status: 403 })
      return Response.json(await prepareHostedRehearsal({ eventId: access.eventId, sessionId, actorId: access.user.id }))
    }
    if (request.method === 'GET' && !operation.startsWith('/api/')) {
      const root = `/admin/events/${encodeURIComponent(id)}/producer/rehearsal/engine/${encodeURIComponent(sessionId)}`
      return readStudioAsset(operation, root)
    }
    const length = Number(request.headers.get('content-length') || 0)
    if (length > 80_000) return Response.json({ error: 'Request too large' }, { status: 413 })
    const body = request.method === 'POST' ? await request.text() : ''
    if (Buffer.byteLength(body) > 80_000) return Response.json({ error: 'Request too large' }, { status: 413 })
    return await callHostedEngine({ scope: { eventId: access.eventId, sessionId, actorId: access.user.id }, path: operation, method: request.method as 'GET' | 'POST', body, ...(request.headers.has('x-input-capability') ? { inputCapability: request.headers.get('x-input-capability')! } : {}) })
  } catch { return Response.json({ error: 'Hosted rehearsal unavailable. No automatic restart was attempted.' }, { status: 502, headers: { 'Cache-Control': 'no-store' } }) }
}
export const GET = handle
export const POST = handle
