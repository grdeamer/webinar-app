import assert from "node:assert/strict"
import test from "node:test"
import { buildJupiterPasswordResetEmail } from "../lib/email/passwordReset.ts"

test("password reset emails use Jupiter branding and secure recovery language", () => {
  const email = buildJupiterPasswordResetEmail({
    resetUrl: "https://example.supabase.co/auth/v1/verify?token=secret",
    logoUrl: "https://app.jupiter.events/jupiter-email-logo-inverted.png",
    name: "Gary Deamer",
  })

  assert.equal(email.subject, "Reset your Jupiter password")
  assert.match(email.html, /Jupiter · Secure access/)
  assert.match(email.html, /Choose a new password/)
  assert.match(email.html, /Events with Gravity/)
  assert.match(email.html, /A product of August Black Labs, LLC/)
  assert.match(email.text, /A product of August Black Labs, LLC/)
  assert.match(email.html, /Didn’t request this\?/)
  assert.doesNotMatch(email.html, /Supabase Auth/)
  assert.match(email.text, /Hi Gary/)
})

test("password reset email escapes profile names", () => {
  const email = buildJupiterPasswordResetEmail({
    resetUrl: "https://example.com/reset",
    logoUrl: "https://example.com/logo.png",
    name: "<script>alert(1)</script>",
  })
  assert.doesNotMatch(email.html, /<script>/)
})
