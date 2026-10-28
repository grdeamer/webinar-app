/** Bounded ownership of immutable VideoFrames; never build a latency backlog. */
export class BoundedFrameWriter {
  constructor(writer, valid, fail, { limit = 4, deadlineMs = 100 } = {}) {
    this.writer = writer; this.valid = valid; this.fail = fail; this.limit = limit; this.deadlineMs = deadlineMs
    this.queue = []; this.busy = false; this.stopped = false; this.written = 0; this.fenced = 0; this.maxPending = 0; this.maxWriteMs = 0
  }
  enqueue(frame, authority) {
    if (this.stopped) { frame.close(); return }
    // Retire invalid generations immediately, including pending content after expiry.
    this.queue = this.queue.filter(item => { if (this.valid(item.authority)) return true; item.frame.close(); this.fenced++; return false })
    if (this.queue.length + Number(this.busy) >= this.limit) { frame.close(); this.abort(new Error('Gateway frame writer backlog limit')); return }
    this.queue.push({ frame, authority }); this.maxPending = Math.max(this.maxPending, this.queue.length + Number(this.busy)); void this.drain()
  }
  async drain() {
    if (this.busy || this.stopped) return
    this.busy = true
    try {
      while (this.queue.length && !this.stopped) {
        const item = this.queue.shift()
        if (!this.valid(item.authority)) { item.frame.close(); this.fenced++; continue }
        const began = performance.now(); let timer
        try {
          await Promise.race([this.writer.write(item.frame), new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Gateway frame writer deadline')), this.deadlineMs) })])
          this.written++; this.maxWriteMs = Math.max(this.maxWriteMs, performance.now() - began)
        } finally { clearTimeout(timer); item.frame.close() }
      }
    } catch (error) { this.abort(error) }
    finally { this.busy = false }
  }
  abort(error) { if (this.stopped) return; this.stop(); void this.writer.abort(error).catch(() => {}); this.fail(error) }
  stop() { this.stopped = true; for (const item of this.queue) item.frame.close(); this.queue = [] }
  counters() { return { written: this.written, fenced: this.fenced, pending: this.queue.length + Number(this.busy), maxPending: this.maxPending, maxWriteMs: this.maxWriteMs } }
}
