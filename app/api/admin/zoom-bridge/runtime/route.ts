import { NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { requireAdmin } from '@/lib/requireAdmin'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { ec2ProducerStatus, prepareSharedEc2, stopSharedEc2 } from '@/lib/production/hosted/ec2Worker'
import { SOURCE_TABLE } from '@/lib/zoom-bridge/source'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'private, no-store' }
export async function GET() {
  if ((await requireAdmin()).profile.role !== 'admin') return NextResponse.json({ error: 'Administrator required' }, { status: 403, headers })
  if (process.env.JUPITER_IO_EC2_SHARED !== 'true') return NextResponse.json({ configured: false }, { headers })
  try { return NextResponse.json({ configured: true, ...await ec2ProducerStatus() }, { headers }) }
  catch { return NextResponse.json({ error: 'Unable to verify shared server status' }, { status: 503, headers }) }
}
export async function POST(request: Request) {
  if ((await requireAdmin()).profile.role !== 'admin') return NextResponse.json({ error: 'Administrator required' }, { status: 403, headers })
  if (request.headers.get('origin') !== new URL(request.url).origin || process.env.JUPITER_IO_EC2_SHARED !== 'true') return NextResponse.json({ error: 'Invalid request' }, { status: 403, headers })
  try {
    const { action } = await request.json()
    if (action === 'start') {
      const result = await prepareSharedEc2(async () => {
        // A fresh boot never joins a previously requested meeting automatically.
        const rooms = await supabaseAdmin.from('zoom_bridge_rooms').update({ desired_running: false, preview_until: null, revision: randomUUID() }).neq('id', '00000000-0000-0000-0000-000000000000')
        const source = await supabaseAdmin.from(SOURCE_TABLE).update({ desired_running: false, revision: randomUUID() }).eq('id', 'program')
        if (rooms.error || source.error) throw new Error('Could not clear saved connection requests')
      })
      return NextResponse.json(result, { headers })
    }
    if (action === 'stop') return NextResponse.json(await stopSharedEc2(), { headers })
    return NextResponse.json({ error: 'Unknown action' }, { status: 400, headers })
  } catch { return NextResponse.json({ error: 'Server request was not confirmed. Refresh status; automatic shutdown remains in place.' }, { status: 503, headers }) }
}
