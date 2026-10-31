/** Paid starts require a verified independent stop; repeated starts never renew it. */
export const PRODUCER_EC2_SESSION_MS = 30 * 60_000
export type ProducerEc2Port = {
  state(): Promise<string>
  stopAt(): Promise<number | null>
  arm(atMs: number): Promise<void>
  start(): Promise<void>
  stop(): Promise<void>
}
function validDeadline(deadline: number | null, now: number) {
  return deadline !== null && Number.isSafeInteger(deadline) && deadline > now + 60_000 && deadline <= now + PRODUCER_EC2_SESSION_MS
}
export async function startProducerEc2(port: ProducerEc2Port, now = Date.now()) {
  const state = await port.state()
  if (!['stopped', 'pending', 'running'].includes(state)) throw new Error('Wait for the producer engine to finish stopping')
  let stopAtMs: number | null
  try { stopAtMs = await port.stopAt() }
  catch (error) { if (state !== 'stopped') await port.stop(); throw error }
  if (state === 'stopped' && stopAtMs === null) {
    // Cloud create is idempotently named. A concurrent conflicting start fails closed.
    await port.arm(now + PRODUCER_EC2_SESSION_MS)
    stopAtMs = await port.stopAt()
  }
  if (!validDeadline(stopAtMs, now)) {
    if (state !== 'stopped') await port.stop()
    throw new Error('A valid automatic EC2 shutdown could not be verified; no new start allowed')
  }
  if (state === 'stopped') {
    try { await port.start() }
    catch { await port.stop(); throw new Error('EC2 start was not confirmed; stop requested and shutdown preserved') }
  }
  return { state: state === 'stopped' ? 'pending' : state, stopAtMs, recordingEnabled: false }
}
export async function stopProducerEc2(port: ProducerEc2Port) {
  await port.stop()
  // Retain the cloud deadline even if the guest or a stop request fails.
  return { state: await port.state(), stopAtMs: await port.stopAt(), recordingEnabled: false }
}
