/** Coalesce wake-ups behind an in-flight read without losing the newest state.
 * This schedules reads only; the caller still validates every authority grant. */
export function createRefreshPoll(read) {
  let running = false, queued = false, stopped = false
  async function poll(force = false) {
    if (stopped) return
    if (running) { if (force) queued = true; return }
    running = true
    try { await read() }
    finally {
      running = false
      if (queued && !stopped) { queued = false; queueMicrotask(() => void poll()) }
    }
  }
  return { poll, stop() { stopped = true; queued = false } }
}
