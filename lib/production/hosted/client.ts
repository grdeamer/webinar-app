import 'server-only'
import { runningTrial } from './sandboxWorker.ts'
import { engineEndpoint, signEngineRequest, validateEngineRequest, type EngineRequest } from './protocol.ts'
export function hostedEngineConfigured() {
  return Boolean((process.env.PRODUCER_ENGINE_URL || process.env.PRODUCER_ENGINE_TRIAL_NAME) && (process.env.PRODUCER_ENGINE_SECRET?.length ?? 0) >= 32)
}
export async function callHostedEngine(request: EngineRequest) {
  validateEngineRequest(request)
  if (!hostedEngineConfigured()) return Response.json({ error: 'Hosted media worker is not configured. No worker was started.' }, { status: 503 })
  const body = JSON.stringify(request)
  const response = await fetch(engineEndpoint(process.env.PRODUCER_ENGINE_URL || (await runningTrial()).domain(8080)), { method: 'POST', redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(12_000), headers: { 'Content-Type': 'application/json', ...signEngineRequest(process.env.PRODUCER_ENGINE_SECRET!, body) }, body })
  if (!response.headers.get('content-type')?.startsWith('application/json')) throw new Error('Invalid engine response')
  const result = await response.text()
  if (Buffer.byteLength(result) > 1_000_000) throw new Error('Engine response too large')
  if (response.ok && request.path === '/api/ha/action' && JSON.parse(request.body).action === 'stop' && !process.env.PRODUCER_ENGINE_URL) await (await runningTrial()).stop()
  return new Response(result, { status: response.status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })
}
