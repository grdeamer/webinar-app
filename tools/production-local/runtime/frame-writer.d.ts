type Frame = { close(): void }
export class BoundedFrameWriter<Authority> {
  constructor(writer: { write(frame: Frame): Promise<unknown>; abort(error: unknown): Promise<unknown> }, valid: (authority: Authority) => boolean, fail: (error: unknown) => void, options?: { limit?: number; deadlineMs?: number })
  enqueue(frame: Frame, authority: Authority): void
  stop(): void
  counters(): { written: number; fenced: number; pending: number; maxPending: number; maxWriteMs: number }
}
