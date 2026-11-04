import { test } from 'node:test'
import assert from 'node:assert/strict'
import { sessionBudgetEnabled, sessionTrafficExceeded, SESSION_NETWORK_LIMIT_BYTES } from '../lib/production/sessionBudget.ts'
test('a retry may tighten but never enlarge the traffic allowance',()=>{
 assert.equal(sessionTrafficExceeded(2000000001,1,2000000000),true)
 assert.equal(sessionTrafficExceeded(2000000000,1,2000000000),false)
 assert.equal(sessionTrafficExceeded(1,0,SESSION_NETWORK_LIMIT_BYTES+1),true)
})
test('five-dollar sessions cannot opt into the hour profile or silently change the cap', () => {
  assert.equal(sessionBudgetEnabled('5', false), true)
  assert.equal(sessionBudgetEnabled(undefined, true), false)
  assert.throws(() => sessionBudgetEnabled('5', true), /thirty-minute/)
  assert.throws(() => sessionBudgetEnabled('50', false), /thirty-minute/)
})
test('traffic accounting counts installation and both directions, failing closed on reset or invalid counters', () => {
  assert.equal(sessionTrafficExceeded(1000 + SESSION_NETWORK_LIMIT_BYTES - 1, 1000), false)
  assert.equal(sessionTrafficExceeded(1000 + SESSION_NETWORK_LIMIT_BYTES, 1000), true)
  for (const [current, initial] of [[NaN, 0], [0, NaN], [10, 20], [10, -1]]) assert.equal(sessionTrafficExceeded(current, initial), true)
})
