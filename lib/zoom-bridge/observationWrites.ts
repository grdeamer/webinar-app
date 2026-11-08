import {jsonEqual} from '../data/jsonEqual.ts'
/** Database observations are not worker leases. Keep active 2s liveness reports;
 * a stopped, unchanged profile has no worker that needs a database heartbeat. */
type Snapshot = { desired_running: boolean; observed: unknown; last_seen: string | null }
export type ObservationPatch = { observed?: Record<string, unknown>; last_seen: string }
const ACTIVE = new Set(['starting','joined','waiting','waiting for host','reconnecting','permission required','waiting for spotlight','presenter camera off','receiving'])
export function observationPatch(row: Snapshot, observed: Record<string,unknown>, now=Date.now()): ObservationPatch | null {
  const changed=!jsonEqual(row.observed??{},observed)
  if (changed) return {observed,last_seen:new Date(now).toISOString()}
  const active=row.desired_running || ACTIVE.has(String(observed.status))
  if (!active) return null
  const age=now-Date.parse(row.last_seen??'')
  // Suppress duplicate exchanges inside one second, not the real 2s heartbeat.
  if (Number.isFinite(age) && age>=0 && age<1000) return null
  return {last_seen:new Date(now).toISOString()}
}
