export const COST_OWNER_EMAIL = 'grdeamer@gmail.com'
export function canViewCosts(user: { email?: string; email_confirmed_at?: string | null } | null, role?: string | null) {
  return Boolean(user?.email_confirmed_at && user.email?.trim().toLowerCase() === COST_OWNER_EMAIL && role === 'admin')
}
export function billingPeriod(now: Date) {
  const day = now.toISOString().slice(0, 10)
  return { day, start: day.slice(0, 7) + '-01', end: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)).toISOString().slice(0, 10) }
}
export function currentComputeEstimate(state: string, launchTime: Date | undefined, now: number) {
  if (state !== 'running' || !launchTime || launchTime.getTime() > now) return null
  return Math.round((now - launchTime.getTime()) / 3_600_000 * 0.357 * 10000) / 10000
}
