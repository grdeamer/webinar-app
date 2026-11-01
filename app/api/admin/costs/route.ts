import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { canViewCosts } from '@/lib/costs/policy'
import { ownerCostReport } from '@/lib/costs/report'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function GET() {
  const client = await createClient()
  const { data: { user }, error } = await client.auth.getUser()
  const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' }
  if (error || !user) return NextResponse.json({ error: 'Not found' }, { status: 404, headers })
  const { data: profile } = await supabaseAdmin.from('profiles').select('role,is_active').eq('id', user.id).maybeSingle()
  if (profile?.is_active === false || !canViewCosts(user, profile?.role)) return NextResponse.json({ error: 'Not found' }, { status: 404, headers })
  return NextResponse.json(await ownerCostReport(), { headers })
}
