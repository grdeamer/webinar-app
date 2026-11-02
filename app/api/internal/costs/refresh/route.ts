import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { ownerCostReport } from '@/lib/costs/report'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  const actual = Buffer.from(request.headers.get('authorization') || '')
  const expected = Buffer.from(`Bearer ${secret || ''}`)
  const headers = { 'Cache-Control': 'private, no-store' }
  if (!secret || actual.length !== expected.length || !timingSafeEqual(actual, expected)) return NextResponse.json({ error: 'Not found' }, { status: 404, headers })
  await ownerCostReport()
  return NextResponse.json({ refreshed: true }, { headers })
}
