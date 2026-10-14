import assert from "node:assert/strict"
import test from "node:test"
import { buildVerificationEmail, buildRegistrationReceiptEmail } from "../lib/email/registration.ts"
import { createVerificationLink, verifyVerificationLink, verifyAttendeeToken, createAttendeeToken } from "../lib/registration/tokens.ts"
process.env.JWT_SECRET = "registration-test-secret-with-more-than-32-characters"
test("email links are signed, expire, and cannot substitute for attendee sessions", () => {
 const input = { challengeId: "f47a6893-4843-4e5a-8b15-06d699885d21", code: "123456", email: "gary@example.com", slug: "test", action: "register" as const }
 const token = createVerificationLink(input)
 assert.equal(verifyVerificationLink(token)?.challengeId, input.challengeId)
 assert.equal(verifyVerificationLink(token + "x"), null)
 assert.equal(verifyAttendeeToken(token), null)
 assert.equal(verifyVerificationLink(createAttendeeToken({ email: input.email, eventId: null, slug: null })), null)
 const now = Date.now; Date.now = () => now() + 11 * 60000
 try { assert.equal(verifyVerificationLink(token), null) } finally { Date.now = now }
})
test("verification and receipts use Jupiter branding, escape input and include text alternatives", () => {
 const verification = buildVerificationEmail({ code: "123456", url: "https://example.com/verify-email#token", logoUrl: "https://example.com/logo.png", registering: true })
 const receipt = buildRegistrationReceiptEmail({ title: '<script>alert("x")</script>', status: "registered", url: "https://example.com/event", logoUrl: "https://example.com/logo.png" })
 for (const email of [verification, receipt]) {
  assert.match(email.html, /Jupiter — Events with Gravity/)
  assert.match(email.html, /August Black Labs, LLC/)
  assert.match(email.html, /alt="Jupiter"/)
  assert.ok(email.text.length > 100)
 }
 assert.match(verification.html, /Verify and continue/)
 assert.match(verification.text, /123456/)
 assert.match(verification.html, /10 minutes/)
 assert.doesNotMatch(receipt.html, /<script>/)
 assert.match(receipt.html, /Your place is confirmed/)
 assert.doesNotMatch(buildRegistrationReceiptEmail({ title: "Test", status: "waitlisted", url: "https://example.com", logoUrl: "https://example.com/logo.png" }).html, /Your place is confirmed/)
})

test("event verification emails identify the correct event without injecting HTML", () => {
 const email = buildVerificationEmail({ code: "123456", url: "https://example.com/verify-email#token", logoUrl: "https://example.com/logo.png", registering: true, eventTitle: "Jupiter <Final Check>" })
 assert.equal(email.subject, "Verify your email: Jupiter <Final Check>")
 assert.match(email.html, /Jupiter &lt;Final Check&gt;/)
 assert.doesNotMatch(email.html, /<Final Check>/)
 assert.match(email.text, /complete your registration for Jupiter <Final Check>/)
})
