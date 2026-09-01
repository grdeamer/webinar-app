import assert from "node:assert/strict"
import test from "node:test"

import {
  MAX_SESSION_BULK_DELETE,
  validateSessionBulkDeleteIds,
} from "../lib/sessions/bulkDelete.ts"

const SESSION_ID = "e21a2957-256b-4fa8-8460-010ba76e095f"

test("bulk session deletion requires a non-empty UUID list", () => {
  assert.deepEqual(validateSessionBulkDeleteIds([]), {
    ok: false,
    error: "Select at least one session",
  })
  assert.deepEqual(validateSessionBulkDeleteIds(["not-a-session"]), {
    ok: false,
    error: "One or more session IDs are invalid",
  })
})

test("bulk session deletion deduplicates valid IDs", () => {
  assert.deepEqual(validateSessionBulkDeleteIds([SESSION_ID, SESSION_ID]), {
    ok: true,
    sessionIds: [SESSION_ID],
  })
})

test("bulk session deletion enforces its request bound", () => {
  const tooMany = Array.from(
    { length: MAX_SESSION_BULK_DELETE + 1 },
    (_, index) => `${String(index).padStart(8, "0")}-256b-4fa8-8460-010ba76e095f`
  )

  assert.deepEqual(validateSessionBulkDeleteIds(tooMany), {
    ok: false,
    error: `Choose no more than ${MAX_SESSION_BULK_DELETE} sessions at once`,
  })
})
