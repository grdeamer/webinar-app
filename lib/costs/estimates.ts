export type CostEstimate = {
  unpricedItems?: number
  monthlyUsd: number
  reportedUsd: number | null
  periodStart: string | null
  periodEnd: string | null
  basis: string
  scope: string
  details: { name: string; usd: number }[]
  limitations: string[]
}

export function monthHours(now: Date) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).getUTCDate() * 24
}
export function finiteMoney(value: unknown) {
  if (typeof value !== 'number' && typeof value !== 'string') throw new Error('Missing monetary amount')
  if (typeof value === 'string' && !/^-?\d+(\.\d+)?$/.test(value)) throw new Error('Invalid monetary amount')
  const amount = Number(value)
  if (!Number.isFinite(amount) || Math.abs(amount) > 100_000_000) throw new Error('Invalid monetary amount')
  return amount
}
type FocusRecord = { BilledCost: unknown; BillingCurrency: string; ServiceName: string; ChargePeriodStart: string; ChargePeriodEnd: string }
export class FocusAccumulator {
  private totals = new Map<string, number>()
  private start = Infinity
  private end = -Infinity
  private count = 0
  add(value: unknown) {
    if (!value || typeof value !== 'object') throw new Error('Invalid FOCUS record')
    const row = value as FocusRecord
    if (row.BillingCurrency !== 'USD' || typeof row.ServiceName !== 'string' || !row.ServiceName || row.ServiceName.length > 200) throw new Error('Unsupported FOCUS record')
    const start = Date.parse(row.ChargePeriodStart), end = Date.parse(row.ChargePeriodEnd)
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) throw new Error('Invalid billing period')
    this.totals.set(row.ServiceName, (this.totals.get(row.ServiceName) ?? 0) + finiteMoney(row.BilledCost))
    this.start = Math.min(this.start, start); this.end = Math.max(this.end, end); this.count++
    if (this.count > 100_000) throw new Error('Billing record limit exceeded')
  }
  finish(now: Date): CostEstimate {
    if (!this.count || this.end > now.getTime() + 86_400_000) throw new Error('No usable billing window')
    const details = [...this.totals].map(([name, usd]) => ({ name, usd })).sort((a, b) => b.usd - a.usd)
    const reportedUsd = details.reduce((sum, row) => sum + row.usd, 0)
    // FOCUS already contains prorated subscriptions: never add a second $20 base.
    const coveredDays = Math.max(1, (this.end - this.start) / 86_400_000)
    return { monthlyUsd: Math.max(0, reportedUsd / coveredDays * monthHours(now) / 24), reportedUsd,
      periodStart: new Date(this.start).toISOString(), periodEnd: new Date(this.end).toISOString(),
      basis: 'Linear spend-rate projection from the returned billing window, including subscriptions and builds. Not an invoice forecast from Vercel.',
      scope: 'Entire configured Vercel team; may include other projects', details,
      limitations: ['Recent build activity and credits can make this projection volatile, especially early in a month.', 'Provider billing-day boundaries and posting delays may differ from calendar-month boundaries.'] }
  }
}

export type AddonSelection = { type: string; variant: { name: string; price: { type: string; interval: string; amount: number } } }
export type SupabaseProjectPrice = { ref: string; name: string; active: boolean; addons: AddonSelection[] }
export function supabaseConfigurationEstimate(plan: string | undefined, projects: SupabaseProjectPrice[], now: Date): CostEstimate {
  if (!['free', 'pro'].includes(plan || '')) throw new Error('This plan requires a verified custom base price')
  const base = plan === 'pro' ? 25 : 0
  const details = [{ name: `${plan === 'pro' ? 'Pro' : 'Free'} organization plan`, usd: base }]
  let compute = 0
  const seen = new Set<string>()
  const variable = new Set<string>()
  const unpriced: string[] = []
  for (const project of projects) {
    if (seen.has(project.ref)) continue
    seen.add(project.ref)
    const selectedCompute = project.addons.filter(addon => addon.type === 'compute_instance')
    if (selectedCompute.length > 1) throw new Error('Ambiguous compute price')
    if (plan === 'pro' && project.active && selectedCompute.length === 0) unpriced.push(`Compute price unavailable for active project or branch: ${project.name}. Its cost is excluded from this known subtotal, not assumed to be zero.`)
    for (const addon of project.addons) {
      const { price } = addon.variant
      const amount = finiteMoney(price.amount)
      if (amount < 0) throw new Error('Negative add-on price')
      if (addon.type === 'compute_instance') {
        if (!project.active || plan === 'free') continue
        if (!['monthly', 'hourly'].includes(price.interval)) throw new Error('Unsupported compute interval')
        const usd = amount * (price.interval === 'hourly' ? monthHours(now) : 1)
        compute += usd; details.push({ name: `${project.name} · ${addon.variant.name}`, usd })
      } else if (price.type === 'fixed') {
        if (!['monthly', 'hourly'].includes(price.interval)) throw new Error('Unsupported add-on interval')
        details.push({ name: `${project.name} · ${addon.variant.name}`, usd: amount * (price.interval === 'hourly' ? monthHours(now) : 1) })
      } else { variable.add(addon.variant.name) }
    }
  }
  if (plan === 'pro') details.push({ name: 'Included organization compute credit (applied once)', usd: -Math.min(10, compute) })
  return { monthlyUsd: details.reduce((sum, row) => sum + row.usd, 0), unpricedItems: unpriced.length, reportedUsd: null, periodStart: null, periodEnd: null,
    basis: 'Current plan and selected add-ons at continuous current operation for this calendar month; hourly prices use the actual number of hours in the month.',
    scope: 'Configured Supabase organization, including discovered active branches', details,
    limitations: [...unpriced, 'Configuration estimate, not the current Supabase invoice. Past changes, deleted branches and already-accrued charges are not reconstructed.', 'Metered overages above included allowances are not exposed by this public API and are not included.', ...[...variable].map(name => `Usage-based add-on not priced: ${name}`)] }
}

export type AdditionalCost = { id: string; label: string; amount_usd: number | null; interval: 'monthly' | 'annual'; not_used: boolean; confirmed_at: string | null }
export function combinedMonthlyEstimate(sources: { monthlyUsd: number | null; stale: boolean; unpricedItems?: number }[], extras: AdditionalCost[]) {
  const unknown = sources.filter(source => source.monthlyUsd === null).length + sources.reduce((sum, source) => sum + (source.unpricedItems ?? 0), 0) + extras.filter(row => !row.not_used && row.amount_usd === null).length
  const sourcesTotal = sources.reduce((sum, source) => sum + (source.monthlyUsd ?? 0), 0)
  const extraTotal = extras.reduce((sum, row) => sum + (row.not_used || row.amount_usd === null ? 0 : row.amount_usd / (row.interval === 'annual' ? 12 : 1)), 0)
  return { monthlyUsd: sourcesTotal + extraTotal, unknown, staleSources: sources.filter(source => source.stale).length, complete: unknown === 0 }
}
