'use client'

import { useCallback, useEffect, useState } from 'react'
import { DollarSign, RefreshCw, LockKeyhole } from 'lucide-react'
import type { ownerCostReport } from '@/lib/costs/report'

type Report = Awaited<ReturnType<typeof ownerCostReport>>
const dollars = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })
function timestamp(value: string | null) { return value ? new Date(value).toLocaleString('en-US', { timeZone: 'America/New_York', timeZoneName: 'short' }) : 'Not yet available' }

export default function OwnerCostsPanel() {
  const [report, setReport] = useState<Report | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const refresh = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/costs', { cache: 'no-store', signal })
      if (!response.ok) throw new Error('Cost information is unavailable.')
      setReport(await response.json())
      setError('')
    } catch (failure) {
      if (!(failure instanceof DOMException && failure.name === 'AbortError')) setError('Cost information is unavailable. Previously loaded figures may be stale.')
    } finally { if (!signal?.aborted) setLoading(false) }
  }, [])
  useEffect(() => {
    const controller = new AbortController()
    void refresh(controller.signal)
    return () => controller.abort()
  }, [refresh])
  const bill = report?.billing.payload
  return <section aria-labelledby="owner-costs-heading" className="dashboard-command-panel rounded-2xl border border-blue-300/20 bg-[#080e1d]/80 p-6">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 id="owner-costs-heading" className="flex items-center gap-2 font-semibold"><DollarSign size={18} />Estimated charges</h2><p className="mt-1 flex items-center gap-1.5 text-xs text-white/50"><LockKeyhole size={12} />Private to your owner account · USD before tax</p></div>
      <button type="button" disabled={loading} onClick={() => void refresh()} className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-sm disabled:opacity-50"><RefreshCw size={14} className={loading ? 'animate-spin' : ''} />{loading ? 'Checking…' : 'Refresh estimates'}</button>
    </header>
    <div aria-live="polite">{error ? <p role="alert" className="mt-4 text-sm text-amber-200">{error}</p> : null}</div>
    {report ? <>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-white/[.025] p-4"><div className="text-xs text-white/50">AWS account · month to date</div><div className="mt-2 text-3xl font-semibold">{bill ? dollars.format(bill.totalUsd) : 'Unavailable'}</div><div className="mt-2 text-xs text-white/50">{bill ? `${bill.periodStart} through ${bill.periodEnd} (end exclusive) · ${bill.complete ? 'all returned services' : 'partial result'}` : 'Awaiting a successful provider refresh'}</div><div className="mt-2 text-xs text-white/50">Updated {timestamp(report.billing.fetchedAt)}</div></div>
        <div className="rounded-xl border border-white/10 bg-white/[.025] p-4"><div className="text-xs text-white/50">EC2 compute right now</div><div className="mt-2 text-3xl font-semibold">{report.infrastructure.state === 'stopped' ? '$0/hour' : report.infrastructure.state === 'running' ? '$0.357/hour' : 'Check status'}</div><div className="mt-2 text-sm text-white/60">Server {report.infrastructure.state}</div><div className="mt-2 text-xs text-white/50">{report.infrastructure.currentRunComputeUsd !== null ? `${dollars.format(report.infrastructure.currentRunComputeUsd)} estimated compute since this boot; transfer extra.` : 'Disk and stable IP remain billable while stopped.'}</div></div>
        <div className="rounded-xl border border-white/10 bg-white/[.025] p-4"><div className="text-xs text-white/50">EC2 standby estimate</div><div className="mt-2 text-3xl font-semibold">$6.05<span className="text-sm font-normal text-white/50">/month</span></div><div className="mt-2 text-xs text-white/50">Retained disk and IPv4 only. This is a rate estimate, not an additional charge to add to AWS month-to-date.</div></div>
      </div>
      {report.billing.error ? <p className="mt-3 text-sm text-amber-200">{report.billing.error}</p> : null}
      <details className="mt-5 border-t border-white/10 pt-4"><summary className="cursor-pointer text-sm font-medium">Service estimates and billing freshness</summary>
        <div className="mt-3 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b border-white/10 text-white/50"><th className="py-2 pr-4">Service</th><th className="pr-4">Monthly amount</th><th>Basis / last verified</th></tr></thead><tbody>{report.recurring.map(row => <tr key={row.service} className="border-b border-white/[.06]"><td className="py-3 pr-4 align-top">{row.service}</td><td className="pr-4 align-top whitespace-nowrap">{dollars.format(row.monthlyUsd)}</td><td className="py-3"><div>{row.kind} · {row.asOf}</div><div className="mt-1 text-xs text-white/45">{row.note}</div></td></tr>)}</tbody></table></div>
        {bill?.services.length ? <div className="mt-4"><h3 className="text-sm font-medium">AWS posted service estimates</h3><ul className="mt-2 space-y-1 text-sm text-white/60">{bill.services.map(service => <li key={service.name} className="flex justify-between gap-4"><span>{service.name}</span><span>{dollars.format(service.usd)}</span></li>)}</ul></div> : null}
        <p className="mt-4 text-xs leading-relaxed text-white/45">{report.exclusions}</p>
        <p className="mt-2 text-xs leading-relaxed text-white/45">{report.billingRefresh}</p>
      </details>
      <p className="mt-4 text-xs text-white/40">Infrastructure checked {timestamp(report.infrastructure.checkedAt)}. Refresh checks status now; provider billing uses its daily cache. This is not a final invoice or a complete all-service total.</p>
    </> : loading ? <p className="mt-5 text-sm text-white/50">Loading private cost estimates…</p> : null}
  </section>
}
