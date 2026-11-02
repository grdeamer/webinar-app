import test from 'node:test'
import assert from 'node:assert/strict'
import { billingTokenInput } from '../lib/costs/tokenInput.ts'
test('billing token accepts copied quotes or Bearer prefix and diagnoses placeholders without echoing input', () => {
  const example = 'example-test-value'
  assert.equal(billingTokenInput(` "Bearer ${example}" `).value, example)
  assert.equal(billingTokenInput(`<redacted>`).diagnostic.placeholder, true)
  assert.equal(billingTokenInput(`oac_example`).diagnostic.integrationClientId, true)
  assert.equal(JSON.stringify(billingTokenInput(example).diagnostic).includes(example), false)
})
