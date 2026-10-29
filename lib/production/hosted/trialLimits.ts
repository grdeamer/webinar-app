/** A single-use server-configured name opts into the separately approved hour. */
export function hostedTrialLimits(name: string) {
  const hour = /^jupiter-producer-trial-hour-[a-z0-9-]{8,55}$/.test(name)
  return { hour, cloudMs: (hour ? 70 : 30) * 60_000, mediaMs: (hour ? 66 : 20) * 60_000 }
}
