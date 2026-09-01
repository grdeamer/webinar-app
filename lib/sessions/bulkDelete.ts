export const MAX_SESSION_BULK_DELETE = 500

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export type SessionBulkDeleteValidation =
  | { ok: true; sessionIds: string[] }
  | { ok: false; error: string }

export function validateSessionBulkDeleteIds(value: unknown): SessionBulkDeleteValidation {
  if (!Array.isArray(value) || value.length === 0) {
    return { ok: false, error: "Select at least one session" }
  }

  if (value.length > MAX_SESSION_BULK_DELETE) {
    return {
      ok: false,
      error: `Choose no more than ${MAX_SESSION_BULK_DELETE} sessions at once`,
    }
  }

  if (!value.every((id) => typeof id === "string" && UUID_PATTERN.test(id))) {
    return { ok: false, error: "One or more session IDs are invalid" }
  }

  return { ok: true, sessionIds: Array.from(new Set(value as string[])) }
}
