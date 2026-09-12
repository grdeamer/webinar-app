import assert from "node:assert/strict"
import test from "node:test"
import { parseRegistrantCsv } from "../lib/imports/registrantCsv.ts"

test("district roster columns become multi-district session assignments", () => {
  const parsed = parseRegistrantCsv(
    [
      "email,first_name,last_name,district_code_1,district_code_2",
      "jane@example.com,Jane,Doe,D001,D004",
    ].join("\n"),
    { requireEventSlug: false }
  )

  assert.equal(parsed.rows.length, 1)
  assert.deepEqual(parsed.rows[0].districtCodes, ["D001", "D004"])
  assert.deepEqual(parsed.rows[0].sessionCodes, ["D001", "D004"])
  assert.deepEqual(parsed.rows[0].errors, [])
})

test("session roster columns remain non-district assignments", () => {
  const parsed = parseRegistrantCsv(
    [
      "email,session_code_1,session_code_2",
      "jane@example.com,KEYNOTE,WORKSHOP-A",
    ].join("\n"),
    { requireEventSlug: false }
  )

  assert.deepEqual(parsed.rows[0].districtCodes, [])
  assert.deepEqual(parsed.rows[0].sessionCodes, ["KEYNOTE", "WORKSHOP-A"])
  assert.deepEqual(parsed.rows[0].errors, [])
})

test("district definition metadata still requires a complete secure link definition", () => {
  const parsed = parseRegistrantCsv(
    [
      "email,district_code,district_name,district_manager,district_meeting_link",
      "jane@example.com,D001,Northeast,Alex,not-secure.example.com",
    ].join("\n"),
    { requireEventSlug: false }
  )

  assert.deepEqual(parsed.rows[0].districtCodes, ["D001"])
  assert.ok(parsed.rows[0].errors.includes("district_meeting_link must use HTTPS"))
})
