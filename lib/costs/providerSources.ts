import 'server-only'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { FocusAccumulator, supabaseConfigurationEstimate, type AddonSelection, type CostEstimate, type SupabaseProjectPrice } from './estimates'

class CostSourceFailure extends Error {
  constructor(readonly code: string) { super(code) }
}

type Snapshot = { payload: CostEstimate | null; fetched_at: string | null; attempt_day: string; last_error: string | null }
export type ProviderSource = { id: 'vercel' | 'supabase'; connected: boolean; estimate: CostEstimate | null; fetchedAt: string | null; stale: boolean; error: string | null }
async function limitedJson(response: Response, stage: string) {
  if (!response.ok) throw new CostSourceFailure(`${stage}_http_${response.status}`)
  const reader = response.body?.getReader()
  if (!reader) throw new Error('Missing response')
  const chunks: Uint8Array[] = []; let size = 0
  try {
    for (;;) { const next = await reader.read(); if (next.done) break; size += next.value.byteLength; if (size > 2_000_000) throw new Error('Response limit'); chunks.push(next.value) }
  } finally { await reader.cancel().catch(() => {}) }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}
async function vercelEstimate(now: Date): Promise<CostEstimate> {
  const token = process.env.COSTS_VERCEL_BILLING_TOKEN?.trim(), team = process.env.COSTS_VERCEL_TEAM_ID
  if (!token || !team || !/^team_[a-zA-Z0-9]+$/.test(team)) throw new Error('Billing connection missing')
  const url = new URL('https://api.vercel.com/v1/billing/charges')
  url.searchParams.set('teamId', team)
  url.searchParams.set('from', new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString())
  url.searchParams.set('to', new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)).toISOString())
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(45_000) })
  if (!response.ok) throw new CostSourceFailure(`vercel_http_${response.status}`)
  if (!response.body) throw new CostSourceFailure('vercel_empty_response')
  const totals = new FocusAccumulator(), decoder = new TextDecoder(), reader = response.body.getReader()
  let bytes = 0, pending = ''
  try {
    for (;;) {
      const chunk = await reader.read(); if (chunk.done) break
      bytes += chunk.value.byteLength; if (bytes > 20_000_000) throw new Error('Billing feed limit')
      pending += decoder.decode(chunk.value, { stream: true })
      const lines = pending.split('\n'); pending = lines.pop() || ''
      if (pending.length > 256_000) throw new Error('Record limit')
      for (const line of lines) { if (line.length > 256_000) throw new Error('Record limit'); if (line.trim()) totals.add(JSON.parse(line)) }
    }
    pending += decoder.decode()
    if (pending.trim()) totals.add(JSON.parse(pending))
    return totals.finish(now)
  } finally { await reader.cancel().catch(() => {}) }
}
function isRef(ref: unknown): ref is string { return typeof ref === 'string' && /^[a-z]{20}$/.test(ref) }
async function supabaseEstimate(now: Date): Promise<CostEstimate> {
  const token = process.env.COSTS_SUPABASE_READ_TOKEN?.trim(), slug = process.env.COSTS_SUPABASE_ORG_SLUG
  if (!token || !slug || !/^[\w-]{1,100}$/.test(slug)) throw new Error('Organization connection missing')
  let calls = 0
  const budget = AbortSignal.timeout(85_000)
  async function get(path: string) {
    if (++calls > 40) throw new Error('Organization inventory limit')
    const stage = path.endsWith('/billing/addons') ? 'supabase_addons' : path.endsWith('/branches') ? 'supabase_branches' : path.endsWith('/projects') ? 'supabase_inventory' : path.startsWith('organizations/') ? 'supabase_organization' : 'supabase_project'
    return limitedJson(await fetch(`https://api.supabase.com/v1/${path}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', redirect: 'error', signal: AbortSignal.any([budget, AbortSignal.timeout(15_000)]) }), stage)
  }
  const org = await get(`organizations/${encodeURIComponent(slug)}`)
  const inventory = await get(`organizations/${encodeURIComponent(slug)}/projects`)
  if (!org?.id || !Array.isArray(inventory.projects) || inventory.pagination?.count !== inventory.projects.length) throw new CostSourceFailure('supabase_inventory_incomplete')
  const owned = inventory.projects as { ref: string; name: string; status: string; is_branch: boolean }[]
  if (!owned.length) throw new Error('No projects in organization scope')
  const projects = new Map<string, { name: string; status?: string }>()
  for (const project of owned) {
    const ref = project.ref
    if (!isRef(ref)) throw new Error('Invalid project reference')
    projects.set(ref, { name: String(project.name || ref), status: project.status })
  }
  for (const project of owned.filter(project => !project.is_branch)) {
    const ref = project.ref
    const branches = await get(`projects/${ref}/branches`)
    if (!Array.isArray(branches)) throw new Error('Branch inventory unavailable')
    for (const branch of branches) {
      if (branch.is_default) continue
      if (!isRef(branch.project_ref)) throw new Error('Invalid branch reference')
      if (!projects.has(branch.project_ref)) projects.set(branch.project_ref, { name: `${project.name} / ${branch.name}`, status: branch.preview_project_status })
    }
  }
  const prices: SupabaseProjectPrice[] = []
  for (const [ref, project] of projects) {
    const status = project.status || (await get(`projects/${ref}`)).status
    if (typeof status !== 'string') throw new Error('Project activity unavailable')
    const active = !['INACTIVE', 'PAUSED', 'REMOVED'].includes(status)
    const result = await get(`projects/${ref}/billing/addons`)
    if (!Array.isArray(result.selected_addons)) throw new Error('Selected prices unavailable')
    const addons: AddonSelection[] = result.selected_addons.map((addon: AddonSelection) => {
      if (typeof addon.type !== 'string' || typeof addon.variant?.name !== 'string' || !addon.variant.price) throw new Error('Invalid add-on price')
      return addon
    })
    prices.push({ ref, name: project.name, active, addons })
  }
  const verifiedPlan = process.env.COSTS_SUPABASE_VERIFIED_PLAN
  const verifiedAt = process.env.COSTS_SUPABASE_PLAN_VERIFIED_AT
  const fallbackValid = ['free', 'pro'].includes(verifiedPlan || '') && verifiedAt && Number.isFinite(Date.parse(verifiedAt)) && now.getTime() - Date.parse(verifiedAt) <= 93 * 86_400_000
  const plan = org.plan || (fallbackValid ? verifiedPlan : undefined)
  if (!plan) throw new CostSourceFailure('supabase_plan_not_exposed')
  try {
    const estimate = supabaseConfigurationEstimate(plan, prices, now)
    if (!org.plan) estimate.limitations.push(`Organization base plan was verified in the billing dashboard on ${verifiedAt}; the public API did not expose it. Reverify after changing the subscription. This fallback expires after 93 days.`)
    return estimate
  } catch { throw new CostSourceFailure('supabase_price_configuration_unsupported') }
}
async function cachedSource(id: 'vercel' | 'supabase', now: Date): Promise<ProviderSource> {
  const connected = id === 'vercel' ? Boolean(process.env.COSTS_VERCEL_BILLING_TOKEN && process.env.COSTS_VERCEL_TEAM_ID) : Boolean(process.env.COSTS_SUPABASE_READ_TOKEN && process.env.COSTS_SUPABASE_ORG_SLUG)
  const result = await supabaseAdmin.from('owner_provider_cost_cache').select('payload,fetched_at,attempt_day,last_error').eq('id', id).single<Snapshot>()
  if (result.error) return { id, connected, estimate: null, fetchedAt: null, stale: true, error: 'Provider cache unavailable.' }
  let row = result.data
  const day = now.toISOString().slice(0, 10)
  if (connected && row.attempt_day !== day) {
    const claim = await supabaseAdmin.from('owner_provider_cost_cache').update({ attempt_day: day }).eq('id', id).eq('attempt_day', row.attempt_day).select('id')
    if (!claim.error && claim.data?.length === 1) {
      try {
        const payload = await (id === 'vercel' ? vercelEstimate(now) : supabaseEstimate(now))
        const fetchedAt = now.toISOString()
        const saved = await supabaseAdmin.from('owner_provider_cost_cache').update({ payload, fetched_at: fetchedAt, last_error: null }).eq('id', id)
        if (saved.error) throw new Error('Cache write failed')
        row = { payload, fetched_at: fetchedAt, attempt_day: day, last_error: null }
      } catch (failure) {
        const code = failure instanceof CostSourceFailure ? failure.code : 'provider_response_or_transport_unavailable'
        const message = `Automatic refresh unavailable (${code}). Last successful estimate retained. Check the read-only connection; next scheduled attempt is tomorrow UTC.`
        await supabaseAdmin.from('owner_provider_cost_cache').update({ last_error: message }).eq('id', id)
        row = { ...row, last_error: message }
      }
    }
  }
  const stale = !connected || Boolean(row.last_error) || !row.fetched_at || now.getTime() - Date.parse(row.fetched_at) > 36 * 3_600_000
  return { id, connected, estimate: row.payload, fetchedAt: row.fetched_at, stale, error: connected ? row.last_error : 'Read-only provider connection not configured.' }
}
export function providerSources(now: Date) { return Promise.all([cachedSource('vercel', now), cachedSource('supabase', now)]) }
