import assert from "node:assert/strict"
import test from "node:test"
// @ts-expect-error The scanner is also a standalone Node executable.
import { findSecrets } from "../scripts/check-secrets.mjs"

test("credential assignments are rejected without disclosing their values", () => {
  const value = "synthetic-sensitive-value"
  const findings = findSecrets(`SUPABASE_SERVICE_ROLE_KEY=${value}\nJWT_SECRET='${value}'`)
  assert.equal(findings.length, 2)
  assert.equal(JSON.stringify(findings).includes(value), false)
})

test("empty environment templates and documented placeholders remain usable", () => {
  assert.deepEqual(findSecrets('JWT_SECRET=\nADMIN_KEY=your_key_here\nRESEND_API_KEY=""'), [])
})

test("service-role JWT literals are detected while public anon JWTs are allowed", () => {
  const token = (role: string) => `${Buffer.from('{"alg":"HS256"}').toString("base64url")}.${Buffer.from(JSON.stringify({ role })).toString("base64url")}.synthetic`
  assert.equal(findSecrets(token("service_role")).length, 1)
  assert.equal(findSecrets(token("anon")).length, 0)
})
