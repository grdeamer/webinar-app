import 'server-only'
import { CostExplorerClient, GetCostAndUsageCommand } from '@aws-sdk/client-cost-explorer'
import { EC2Client, DescribeInstancesCommand } from '@aws-sdk/client-ec2'
import { fromWebToken } from '@aws-sdk/credential-providers'
import { getVercelOidcToken } from '@vercel/oidc'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { billingPeriod, currentComputeEstimate } from './policy'

type AwsBill = { periodStart: string; periodEnd: string; estimated: boolean; complete: boolean; totalUsd: number; services: { name: string; usd: number }[] }
type CacheRow = { payload: AwsBill | null; fetched_at: string | null; attempt_day: string; last_error: string | null }
async function awsOptions() {
  const roleArn = process.env.PRODUCER_ENGINE_EC2_ROLE_ARN
  if (!roleArn) throw new Error('AWS billing connection is not configured')
  return { region: 'us-east-1', maxAttempts: 1, credentials: fromWebToken({ roleArn, webIdentityToken: await getVercelOidcToken(), roleSessionName: 'jupiter-owner-costs' }) }
}
async function awsBilling(now: Date) {
  const { day, start, end } = billingPeriod(now)
  const key = 'aws-account'
  const { data, error } = await supabaseAdmin.from('owner_cost_cache').select('payload,fetched_at,attempt_day,last_error').eq('key', key).single<CacheRow>()
  if (error) return { payload: null, fetchedAt: null, error: 'Billing cache unavailable; no paid request made.' }
  let row = data
  if (row.attempt_day !== day) {
    // An atomic database compare-and-set survives concurrent requests and cold starts.
    // Reserve the day's attempt BEFORE calling the paid API, including failures.
    const claim = await supabaseAdmin.from('owner_cost_cache').update({ attempt_day: day }).eq('key', key).eq('attempt_day', row.attempt_day).select('key')
    if (!claim.error && claim.data?.length === 1) {
      try {
        const result = await new CostExplorerClient(await awsOptions()).send(new GetCostAndUsageCommand({ TimePeriod: { Start: start, End: end }, Granularity: 'MONTHLY', Metrics: ['UnblendedCost'], GroupBy: [{ Type: 'DIMENSION', Key: 'SERVICE' }] }))
        if (!result.ResultsByTime?.length) throw new Error('No billing period returned')
        const groups = result.ResultsByTime.flatMap(period => period.Groups ?? [])
        const services = groups.map(group => {
          const metric = group.Metrics?.UnblendedCost
          const usd = Number(metric?.Amount)
          if (metric?.Unit !== 'USD' || !Number.isFinite(usd)) throw new Error('Invalid billing currency')
          return { name: group.Keys?.[0] || 'Other AWS service', usd }
        }).sort((a, b) => b.usd - a.usd)
        const payload: AwsBill = { periodStart: start, periodEnd: end, estimated: result.ResultsByTime?.some(period => period.Estimated) ?? true, complete: !result.NextPageToken, totalUsd: services.reduce((sum, service) => sum + service.usd, 0), services }
        const fetchedAt = now.toISOString()
        const saved = await supabaseAdmin.from('owner_cost_cache').update({ payload, fetched_at: fetchedAt, last_error: null }).eq('key', key)
        if (saved.error) throw new Error('Cache write failed')
        row = { payload, fetched_at: fetchedAt, attempt_day: day, last_error: null }
      } catch {
        const message = 'AWS billing refresh unavailable. Last successful figures retained; next attempt tomorrow UTC.'
        await supabaseAdmin.from('owner_cost_cache').update({ last_error: message }).eq('key', key)
        row = { ...row, last_error: message }
      }
    }
  }
  return { payload: row.payload, fetchedAt: row.fetched_at, error: row.last_error }
}
export async function ownerCostReport() {
  const now = new Date()
  const [billing, infrastructure] = await Promise.all([
    awsBilling(now),
    (async () => {
      try {
        const id = process.env.PRODUCER_ENGINE_EC2_INSTANCE_ID
        if (!id) throw new Error('Not configured')
        const result = await new EC2Client(await awsOptions()).send(new DescribeInstancesCommand({ InstanceIds: [id] }))
        const instance = result.Reservations?.flatMap(r => r.Instances ?? [])[0]
        const state = instance?.State?.Name || 'unknown'
        const deletedAt = instance?.Tags?.find(tag => tag.Key === 'JupiterIoLightsailDeletedAt')?.Value
        const lightsailDeletedAt = deletedAt && Number.isFinite(Date.parse(deletedAt)) ? deletedAt : null
        return { state, hourlyUsd: 0.357, currentRunComputeUsd: currentComputeEstimate(state, instance?.LaunchTime, now.getTime()), checkedAt: now.toISOString(), lightsailDeletedAt }
      } catch { return { state: 'unavailable', hourlyUsd: 0.357, currentRunComputeUsd: null, checkedAt: now.toISOString(), lightsailDeletedAt: null } }
    })(),
  ])
  return {
    checkedAt: now.toISOString(), billing, infrastructure,
    recurring: [
      { service: 'EC2 retained disk + IPv4', monthlyUsd: 6.05, kind: 'Estimate', asOf: '2026-11-01', note: '30 GB gp3 and one stable IPv4; charged while stopped. Compute and transfer extra.' },
      { service: 'Vercel website', monthlyUsd: 20, kind: 'Base estimate', asOf: '2026-10-31', note: 'One-seat Pro base. Builds, functions and other usage extra; no live billing API connected.' },
      { service: 'Supabase', monthlyUsd: 45.85, kind: 'Provider projection', asOf: '2026-10-31', note: 'Oct 6–Nov 6 billing cycle projection, including projects/branching. Not a fixed monthly fee.' },
      { service: 'Resend', monthlyUsd: 0, kind: 'Verified Free plan', asOf: '2026-10-31', note: 'Paid overages disabled at last verification.' },
      { service: 'LiveKit Cloud', monthlyUsd: 0, kind: 'Verified Build plan', asOf: '2026-11-01', note: 'Producer relay is self-hosted; former Jupiter Cloud key revoked.' },
      { service: 'Io Lightsail receiver', monthlyUsd: infrastructure.lightsailDeletedAt ? 0 : 12, kind: 'Migration status', asOf: infrastructure.lightsailDeletedAt?.slice(0, 10) || '2026-11-01', note: infrastructure.lightsailDeletedAt ? 'Deletion verified and recorded on the EC2 receiver. Previously accrued charges may post later.' : infrastructure.state === 'unavailable' ? 'Deletion status unavailable; last known $12 rate retained conservatively.' : 'Retained until migration and permanent deletion are verified. Stopping alone does not remove its storage charges.' },
    ],
    exclusions: 'Domain renewal, Zoom/other subscriptions and unconnected provider overages are not included. AWS billing covers the entire AWS account and may include other workloads. Do not add current-run compute to AWS month-to-date: they overlap.',
    billingRefresh: 'At most one paid AWS billing request per UTC day, on owner visit; about $0.01/request, up to $0.31/month. Refreshing this panel does not force another billing request. AWS posting can lag 24–48 hours or longer.',
  }
}
