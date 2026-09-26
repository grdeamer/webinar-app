import assert from "node:assert/strict"
import test from "node:test"

import {
  buildJupiterEmailFooterHtml,
  buildJupiterEmailFooterText,
} from "../lib/email/branding.ts"
import { buildDistrictAccessEmail } from "../lib/email/districtAccess.ts"

test("shared Jupiter footer uses the approved product and company language", () => {
  const html = buildJupiterEmailFooterHtml("A registration message.")
  const text = buildJupiterEmailFooterText("A registration message.").join("\n")

  for (const output of [html, text]) {
    assert.match(output, /Jupiter — Events with Gravity/)
    assert.match(output, /A product of August Black Labs, LLC/)
    assert.match(output, /jupiter\.events/)
    assert.match(output, /A registration message\./)
  }
})

test("district access email includes registration context and shared branding", () => {
  const email = buildDistrictAccessEmail({ code: "123456", eventTitle: "POA Meeting" })

  for (const output of [email.html, email.text]) {
    assert.match(output, /registered for POA Meeting/)
    assert.match(output, /Jupiter — Events with Gravity/)
    assert.match(output, /A product of August Black Labs, LLC/)
  }
})
