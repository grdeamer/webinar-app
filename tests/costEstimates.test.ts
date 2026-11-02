import test from 'node:test'
import assert from 'node:assert/strict'
import { FocusAccumulator, supabaseConfigurationEstimate, combinedMonthlyEstimate } from '../lib/costs/estimates.ts'
const now = new Date('2026-11-02T18:00:00Z')
test('Vercel includes subscriptions once and projects actual returned coverage', () => {
  const feed = new FocusAccumulator()
  for (const [ServiceName, BilledCost] of [['Pro', '1'], ['Build', '2'], ['Credit', '-0.5']]) feed.add({ ServiceName, BilledCost, BillingCurrency: 'USD', ChargePeriodStart: '2026-11-01T07:00:00Z', ChargePeriodEnd: '2026-11-02T07:00:00Z' })
  assert.equal(feed.finish(now).reportedUsd, 2.5)
  assert.equal(feed.finish(now).monthlyUsd, 75)
})
test('missing feed and unsupported currency fail instead of becoming zero', () => {
  assert.throws(() => new FocusAccumulator().finish(now))
  assert.throws(() => new FocusAccumulator().add({ BillingCurrency: 'EUR' }))
})
test('Supabase deduplicates branches and applies one compute credit per organization', () => {
  const project = { ref: 'one', name: 'Main', active: true, addons: [{ type: 'compute_instance', variant: { name: 'Micro', price: { type: 'fixed', interval: 'hourly', amount: 0.02 } } }] }
  const estimate = supabaseConfigurationEstimate('pro', [project, project, { ...project, ref: 'two' }], now)
  assert.equal(estimate.monthlyUsd, 25 + 2 * 720 * 0.02 - 10)
  assert.equal(estimate.reportedUsd, null)
  assert.throws(() => supabaseConfigurationEstimate('enterprise', [], now))
  assert.throws(() => supabaseConfigurationEstimate('pro', [{ ...project, addons: [] }], now))
})
test('unknown subscriptions make total partial; annual costs are prorated', () => {
  const result = combinedMonthlyEstimate([{ monthlyUsd: 30, stale: false }], [
    { id: 'domain', label: 'Domain', amount_usd: 120, interval: 'annual', not_used: false, confirmed_at: null },
    { id: 'zoom', label: 'Zoom', amount_usd: null, interval: 'monthly', not_used: false, confirmed_at: null },
  ])
  assert.equal(result.monthlyUsd, 40)
  assert.equal(result.complete, false)
  assert.equal(result.unknown, 1)
})
