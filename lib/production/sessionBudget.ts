/** Conservative usage envelope for a manually prepared $5 rehearsal session. */
export const SESSION_NETWORK_LIMIT_BYTES = 4_000_000_000
export function sessionBudgetEnabled(value: string | undefined, hour: boolean) {
  if (!value) return false
  if (value !== '5' || hour) throw new Error('Session budget requires the bounded thirty-minute profile')
  return true
}
export function sessionTrafficExceeded(current: number, initial: number) {
  // Missing, reset or invalid accounting fails closed.
  return !Number.isSafeInteger(current) || !Number.isSafeInteger(initial) || initial < 0 || current < initial || current - initial >= SESSION_NETWORK_LIMIT_BYTES
}
