export const broadcastDurations = [60, 120, 240, 480] as const
export function broadcastDuration(value: unknown): number {
  if (typeof value !== "number" || !broadcastDurations.some(minutes => minutes === value)) throw new Error("Choose a broadcast duration of 1, 2, 4 or 8 hours.")
  return value
}
export function shutdownTime(minutes: number, now = Date.now()) {
  broadcastDuration(minutes)
  return new Date(now + minutes * 60000).toISOString().slice(0, 19)
}
export function scheduledStop(expression?: string) {
  const match = /^at\((\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})\)$/.exec(expression || "")
  return match ? `${match[1]}Z` : null
}
