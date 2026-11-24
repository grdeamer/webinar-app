type PreparedEngine = { stopAtMs: number | null; recordingEnabled: boolean }
type ShutdownPending = { code: 'shutdown_pending'; stopAtMs: number }

type StartupPort = {
  prepare(): Promise<PreparedEngine | ShutdownPending>
  infrastructure?(): Promise<{ state: string; stopAtMs: number | null }>
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
  let prepared = await port.prepare()
  if ('code' in prepared) {
    const priorStopAt = prepared.stopAtMs
    const waitUntil = Math.max(port.now(), priorStopAt) + 6 * 60_000
    while (port.infrastructure && port.now() < waitUntil) {
      port.signal.throwIfAborted()
      const seconds = Math.max(0, Math.ceil((priorStopAt - port.now()) / 1000))
      port.progress(seconds ? `Previous automatic shutdown in ${seconds}s. Start will continue when it clears…` : 'Waiting for the previous automatic shutdown to clear…')
      const infrastructure = await port.infrastructure().catch((): null => null)
      port.signal.throwIfAborted()
      if (infrastructure?.state === 'stopped' && infrastructure.stopAtMs === null) {
        port.progress('Arming a fresh automatic shutdown and starting EC2…')
        prepared = await port.prepare()
        break
      }
      await port.wait()
    }
    if ('code' in prepared) throw new Error('The previous automatic shutdown has not cleared. EC2 start was not requested.')
  }
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
