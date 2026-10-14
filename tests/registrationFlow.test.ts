import assert from "node:assert/strict"
import test from "node:test"
import { normalizeRegistrationConfig, validateRegistration, findRegistrationProps } from "../lib/registration/schema.ts"
import { createAttendeeToken, verifyAttendeeToken } from "../lib/registration/tokens.ts"
import { readAllRows } from "../lib/registration/paginate.ts"
process.env.JWT_SECRET = "registration-test-secret-with-more-than-32-characters"
test("identity fields cannot be removed, hidden, or made optional by the builder", () => {
 const c = normalizeRegistrationConfig({ registrationFields: [{ id: "email", label: "Email", visible: false, required: false }, { id: "email" }, { id: "bad key" }] })
 assert.equal(c.fields.filter((f) => f.id === "email").length, 1)
 for (const id of ["firstName", "lastName", "email"]) { assert.equal(c.fields.find((f) => f.id === id)?.required, true); assert.equal(c.fields.find((f) => f.id === id)?.visible, true) }
})
test("published fields validate and normalize without persisting unknown answers", () => {
 const c = normalizeRegistrationConfig({ registrationFields: [{ id: "organization", label: "Organization", required: true }] })
 assert.throws(() => validateRegistration(c, { values: {} }), /required/)
 const p = validateRegistration(c, { values: { firstName: " Gary ", lastName: "Test", email: "GARY@EXAMPLE.COM", organization: "Jupiter", admin: "true" } })
 assert.equal(p.email, "gary@example.com"); assert.equal(p.firstName, "Gary"); assert.equal(p.answers.admin, undefined)
 assert.throws(() => validateRegistration(c, { values: { ...p.answers, email: "a@%" } }), /valid/)
})
test("forged session assignments cannot reach the transaction", () => {
 const c = normalizeRegistrationConfig({})
 assert.throws(() => validateRegistration(c, { values: { firstName: "A", lastName: "B", email: "a@example.com" }, sessionIds: ["another-events-session"] }), /offered/)
})
test("signed attendee identity rejects raw email, legacy JWT, tampering, expiry, and another event", () => {
 const token = createAttendeeToken({ email: "GARY@EXAMPLE.COM", eventId: "event-one", slug: "one" })
 assert.equal(verifyAttendeeToken(token, "one")?.email, "gary@example.com")
 assert.equal(verifyAttendeeToken(token, "two"), null)
 assert.equal(verifyAttendeeToken(token + "x"), null)
 assert.equal(verifyAttendeeToken("gary@example.com"), null)
 assert.equal(verifyAttendeeToken("eyJhbGciOiJIUzI1NiJ9.payload.signature"), null)
 const realNow = Date.now; Date.now = () => realNow() + 8 * 86400000
 try { assert.equal(verifyAttendeeToken(token), null) } finally { Date.now = realNow }
})
test("only a placed registration block enables publication", () => {
 assert.equal(findRegistrationProps([{ blocks: [{ type: "rich_text", props: { componentKey: "registration_form" } }] }]), null)
 assert.equal(findRegistrationProps([{ blocks: [{ type: "system_component", props: { componentKey: "registration_form", title: "Register" } }] }])?.title, "Register")
 assert.equal(normalizeRegistrationConfig({}, false).enabled, false)
})
test("recipient pagination retrieves past the default API row limit and fails on partial reads", async () => {
 const expected = Array.from({ length: 1305 }, (_, i) => i)
 assert.deepEqual(await readAllRows<number>(async (a,b) => ({ data: expected.slice(a,b+1), error: null })), expected)
 await assert.rejects(() => readAllRows<number>(async () => ({ data: null, error: { message: "failed" } })), /failed/)
})

test("session access requires an active verified attendee context and the correct assignment", async () => {
 const { canViewerAccessSession } = await import("../lib/domain/access.ts")
 const session = { id: "session-one", visibilityMode: "assigned" } as Parameters<typeof canViewerAccessSession>[0]
 const guest = { type: "guest", email: null, userId: null, eventId: "one", assignedSessionIds: [] } as Parameters<typeof canViewerAccessSession>[1]
 assert.equal(canViewerAccessSession(session, guest).canView, false)
 assert.equal(canViewerAccessSession(session, { ...guest, type: "attendee", email: "gary@example.com" }).canView, false)
 assert.equal(canViewerAccessSession(session, { ...guest, type: "attendee", email: "gary@example.com", assignedSessionIds: [session.id] }).canView, true)
})

test("builder variants and button copy survive publication normalization", () => {
 const config = normalizeRegistrationConfig({ variant: "minimal", ctaLabel: "Reserve my place" })
 assert.equal(config.variant, "minimal"); assert.equal(config.ctaLabel, "Reserve my place")
})

test("builder-created fields retain their stable hyphenated IDs and validation", () => {
 const id = "jobTitle-1791994000000"
 const config = normalizeRegistrationConfig({ registrationFields: [{ id, label: "Your role", required: true, visible: true, fieldType: "text" }] })
 assert.equal(config.fields.find((field) => field.id === id)?.label, "Your role")
 const values = { firstName: "Gary", lastName: "Test", email: "gary@example.com" }
 assert.throws(() => validateRegistration(config, { values }), /Your role is required/)
 assert.equal(validateRegistration(config, { values: { ...values, [id]: "Producer" } }).answers[id], "Producer")
})
