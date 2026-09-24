import assert from "node:assert/strict"
import test from "node:test"
import { changeTeamAccountAccess } from "../lib/teamAccountAccess.ts"

function harness(fail?: string) {
  const calls: string[] = []
  const step = (name: string) => { calls.push(name); if (fail === name) throw new Error("unavailable") }
  const services = {
    async setProfileActive(active: boolean) { step(`profile:${active}`) },
    async setAuthBan(disabled: boolean) { step(`ban:${disabled}`) },
    async revokeSessions() { step("revoke"); return 3 },
  }
  return { calls, services }
}

test("disable locks profile, bans sign-in, then revokes all saved sessions", async () => {
  const { calls, services } = harness()
  assert.deepEqual(await changeTeamAccountAccess(false, services), { ok: true, is_active: false, sessions_revoked: 3 })
  assert.deepEqual(calls, ["profile:false", "ban:true", "revoke"])
})

test("restore clears old sessions and ban before reactivating profile", async () => {
  const { calls, services } = harness()
  assert.deepEqual(await changeTeamAccountAccess(true, services), { ok: true, is_active: true, sessions_revoked: 3 })
  assert.deepEqual(calls, ["profile:false", "revoke", "ban:false", "profile:true"])
})

test("profile failure does not claim the account is disabled", async () => {
  const { calls, services } = harness("profile:false")
  const result = await changeTeamAccountAccess(false, services)
  assert.equal(result.ok, false)
  assert.equal(result.is_active, undefined)
  assert.deepEqual(calls, ["profile:false"])
})

test("ban failure still attempts session revocation and reports partial completion", async () => {
  const { calls, services } = harness("ban:true")
  const result = await changeTeamAccountAccess(false, services)
  assert.equal(result.ok, false)
  assert.equal(result.is_active, false)
  assert.deepEqual(calls, ["profile:false", "ban:true", "revoke"])
})

test("session revocation failure keeps the profile disabled and reports failure", async () => {
  const { services } = harness("revoke")
  const result = await changeTeamAccountAccess(false, services)
  assert.equal(result.ok, false)
  assert.equal(result.is_active, false)
})

for (const failure of ["revoke", "ban:false", "profile:true"]) {
  test(`restore fails closed at ${failure}`, async () => {
    const { calls, services } = harness(failure)
    const result = await changeTeamAccountAccess(true, services)
    assert.equal(result.ok, false)
    assert.equal(result.is_active, false)
    if (failure !== "profile:true") assert.ok(!calls.includes("profile:true"))
  })
}

test("disabling again with no sessions is safely idempotent", async () => {
  const { services } = harness()
  services.revokeSessions = async () => 0
  assert.deepEqual(await changeTeamAccountAccess(false, services), { ok: true, is_active: false, sessions_revoked: 0 })
})
