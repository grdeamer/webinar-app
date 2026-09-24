type AccessServices = {
  setProfileActive: (active: boolean) => Promise<void>
  setAuthBan: (disabled: boolean) => Promise<void>
  revokeSessions: () => Promise<number>
}

export type AccountAccessResult = {
  ok: boolean
  is_active?: boolean
  sessions_revoked?: number
  error?: string
}

// Keep the profile disabled until every restore step succeeds. A partial failure
// must never grant access, and disabling must still revoke sessions if Auth fails.
export async function changeTeamAccountAccess(active: boolean, services: AccessServices): Promise<AccountAccessResult> {
  try {
    await services.setProfileActive(false)
  } catch {
    return { ok: false, error: "Could not secure the account. No access change was confirmed; please retry." }
  }

  if (active) {
    try {
      const sessions = await services.revokeSessions()
      await services.setAuthBan(false)
      await services.setProfileActive(true)
      return { ok: true, is_active: true, sessions_revoked: sessions }
    } catch {
      return { ok: false, is_active: false, error: "The account remains disabled. Could not complete restoration; please retry." }
    }
  }

  let banFailed = false
  let sessions: number | undefined
  try { await services.setAuthBan(true) } catch { banFailed = true }
  try { sessions = await services.revokeSessions() } catch { /* Report partial completion below. */ }
  if (banFailed || sessions === undefined) {
    return {
      ok: false,
      is_active: false,
      error: "Jupiter access is disabled, but sign-in blocking or session revocation did not finish. Use ‘Disable access & sign out’ again to retry.",
    }
  }
  return { ok: true, is_active: false, sessions_revoked: sessions }
}
