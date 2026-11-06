/** Called only with the user verified by the server's event-access check. */
export function canStartProducerEngine(user: { email?: string; email_confirmed_at?: string | null } | null, isGlobalAdmin: boolean) {
  return Boolean(isGlobalAdmin && user?.email_confirmed_at && user.email?.trim().toLowerCase() === 'grdeamer@gmail.com')
}
