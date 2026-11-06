type StartupPort = {
  prepare(): Promise<{ stopAtMs: number | null; recordingEnabled: boolean }>
  status(): Promise<{ runtime: { running: boolean; expiresAtMs: number; recordingEnabled: boolean } }>
  connect(): Promise<void>
  now(): number
  wait(): Promise<void>
  signal: AbortSignal
  progress(message: string): void
}

/** One explicit paid start; subsequent polls are read-only and never renew shutdown. */
export async function startAndConnect(port: StartupPort) {
  port.signal.throwIfAborted()
  port.progress('Arming automatic shutdown and starting EC2…')
  const prepared = await port.prepare()
  port.signal.throwIfAborted()
  if (prepared.recordingEnabled !== false || !Number.isSafeInteger(prepared.stopAtMs) || !prepared.stopAtMs || prepared.stopAtMs <= port.now()) {
    throw new Error('Recording-off and automatic shutdown were not confirmed. Connection cancelled.')
  }
  const until = Math.min(port.now() + 240_000, prepared.stopAtMs - 10_000)
  port.progress('Automatic shutdown armed. Waiting for the engine…')
  while (port.now() < until) {
    port.signal.throwIfAborted()
    const status = await port.status().catch((): null => null)
    port.signal.throwIfAborted()
    if (status?.runtime.running && status.runtime.expiresAtMs > port.now()) {
      if (status.runtime.recordingEnabled !== false) throw new Error('Recording must be off before connecting.')
      port.progress('Connecting inputs. TAKE will enable when Preview is ready…')
      await port.connect()
      port.signal.throwIfAborted()
      return
    }
    await port.wait()
  }
  throw new Error('Engine startup timed out. No restart was attempted. Automatic shutdown remains armed; use Stop producer engine to end charges now.')
}
