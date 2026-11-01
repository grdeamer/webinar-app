import { test } from 'node:test'
import assert from 'node:assert/strict'
import { canViewCosts, billingPeriod, currentComputeEstimate } from '../lib/costs/policy.ts'
test('financial information requires exact confirmed owner email and active admin role', () => {
  const owner = { email: 'grdeamer@gmail.com', email_confirmed_at: '2026-01-01' }
  assert.equal(canViewCosts(owner, 'admin'), true)
  assert.equal(canViewCosts({ ...owner, email: 'GRDEAMER@gmail.com' }, 'admin'), true)
  for (const user of [null, { ...owner, email: 'someone@gmail.com' }, { ...owner, email: 'grdeamer@gmail.com.attacker.test' }, { ...owner, email_confirmed_at: null }]) assert.equal(canViewCosts(user, 'admin'), false)
  assert.equal(canViewCosts(owner, 'event_member'), false)
  assert.equal(canViewCosts(owner, null), false)
})
test('billing periods use UTC boundaries including month and year rollover', () => {
  assert.deepEqual(billingPeriod(new Date('2026-12-31T23:59:59Z')), { day: '2026-12-31', start: '2026-12-01', end: '2027-01-01' })
})
test('stopped or unknown infrastructure never fabricates a current compute estimate', () => {
  assert.equal(currentComputeEstimate('stopped', new Date(0), 3600000), null)
  assert.equal(currentComputeEstimate('running', undefined, 3600000), null)
  assert.equal(currentComputeEstimate('running', new Date(0), 3600000), 0.357)
  assert.equal(currentComputeEstimate('running', new Date(3600001), 3600000), null)
})
