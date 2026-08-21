import assert from "node:assert/strict"
import test from "node:test"

import { buildJupiterInviteEmail } from "../lib/email/invitations.ts"

test("administrator invitations use Jupiter branding and describe admin access", () => {
  const invitation = buildJupiterInviteEmail({
    inviteUrl: "https://example.supabase.co/auth/v1/verify?token=secure",
    logoUrl: "https://app.jupiter.events/jupiter-email-logo.png?v=2",
    name: "Grace Deamer",
    role: "administrator",
  })

  assert.equal(invitation.subject, "Your Jupiter admin access is ready")
  assert.match(invitation.html, /You’re cleared for Mission Control/)
  assert.match(invitation.html, /Build programs and manage event teams/)
  assert.match(invitation.html, /jupiter-email-logo\.png/)
  assert.match(invitation.html, /width="600"/)
  assert.match(invitation.html, /class="brand-logo"/)
  assert.match(invitation.html, /width:100%;max-width:600px;height:auto/)
  assert.match(invitation.text, /Accept invitation: https:\/\/example\.supabase\.co/)
})

test("event invitations escape event and recipient content", () => {
  const invitation = buildJupiterInviteEmail({
    inviteUrl: "https://app.jupiter.events/admin/events/123",
    logoUrl: "https://app.jupiter.events/jupiter-email-logo.png",
    name: "<Grace>",
    role: "producer",
    eventTitle: "Launch & Learn",
    existingAccount: true,
  })

  assert.equal(invitation.subject, "You’re invited to Launch & Learn")
  assert.match(invitation.html, /Hi &lt;Grace&gt;/)
  assert.match(invitation.html, /Launch &amp; Learn/)
  assert.match(invitation.html, />Open event</)
  assert.doesNotMatch(invitation.html, /Hi <Grace>/)
})

test("existing administrators receive a secure access action", () => {
  const invitation = buildJupiterInviteEmail({
    inviteUrl: "https://example.supabase.co/auth/v1/verify?token=secure",
    logoUrl: "https://app.jupiter.events/jupiter-email-logo.png",
    role: "administrator",
    existingAccount: true,
  })

  assert.match(invitation.html, />Open secure access</)
  assert.match(invitation.text, /confirm your Jupiter access or choose a new password/)
})
