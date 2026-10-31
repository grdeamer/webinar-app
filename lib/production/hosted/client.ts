import 'server-only'
import { producerBackend, validateEc2Scope, stopEc2Producer } from './ec2Worker.ts'
import { runningTrial } from './sandboxWorker.ts'
import { engineEndpoint, signEngineRequest, validateEngineRequest, type EngineRequest } from './protocol.ts'
export function hostedEngineConfigured() {
  if (producerBackend() === 'ec2') return Boolean(process.env.PRODUCER_ENGINE_URL && (process.env.PRODUCER_ENGINE_SECRET?.length ?? 0) >= 32)
  return Boolean((process.env.PRODUCER_ENGINE_URL || process.env.PRODUCER_ENGINE_TRIAL_NAME) && (process.env.PRODUCER_ENGINE_SECRET?.length ?? 0) >= 32)
}
export async function callHostedEngine(request: EngineRequest) {
  validateEngineRequest(request)
  const ec2 = producerBackend() === 'ec2'
  if (ec2) validateEc2Scope(request.scope)
  if (!hostedEngineConfigured()) return Response.json({ error: 'Hosted media worker is not configured. No worker was started.' }, { status: 503 })
  const body = JSON.stringify(request)
  const stopping = ec2 && request.path === '/api/ha/action' && JSON.parse(request.body).action === 'stop'
  const response = await fetch(engineEndpoint(process.env.PRODUCER_ENGINE_URL || (await runningTrial()).domain(8080)), { method: 'POST', redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(12_000), headers: { 'Content-Type': 'application/json', ...signEngineRequest(process.env.PRODUCER_ENGINE_SECRET!, body) }, body }).finally(async () => { if (stopping) await stopEc2Producer(request.scope) })
  if (!response.headers.get('content-type')?.startsWith('application/json')) throw new Error('Invalid engine response')
  const result = await response.text()
  if (Buffer.byteLength(result) > 1_000_000) throw new Error('Engine response too large')
  if (!ec2 && response.ok && request.path === '/api/ha/action' && JSON.parse(request.body).action === 'stop' && !process.env.PRODUCER_ENGINE_URL) await (await runningTrial()).stop()
  return new Response(result, { status: response.status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })
}
