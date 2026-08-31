import Link from "next/link"
import { notFound } from "next/navigation"
import { Activity, ArrowLeft, CheckCircle2, Cloud, Database, Globe2, History, Radio, TriangleAlert } from "lucide-react"
import { getEventInfrastructureSnapshot } from "@/lib/cloud/status"
import { getEventTeamAccess } from "@/lib/eventTeamAccess"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export default async function EventInfrastructurePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const access = await getEventTeamAccess(id)
  if (!access) notFound()
  const snapshot = await getEventInfrastructureSnapshot(access.eventId)

  return <main className="event-editorial-page"><div className="mx-auto max-w-[1180px] space-y-5">
    <header className="flex flex-col gap-5 border-b border-[#1a2231] pb-6 lg:flex-row lg:items-end lg:justify-between"><div><div className="text-[9px] font-bold tracking-[.18em] text-cyan-300/70">EVENT / JUPITER CLOUD</div><h1 className="mt-3 text-4xl font-medium tracking-[-.045em]">Infrastructure readiness</h1><p className="mt-3 text-[#9aa6bb]">Operational services, capacity and history for {snapshot.event.title}.</p></div><Link href={`/admin/events/${access.eventId}`} className="inline-flex items-center gap-2 text-sm font-semibold text-blue-300"><ArrowLeft size={15} />Back to overview</Link></header>

    <section className="rounded-2xl border border-[#202c43] bg-[radial-gradient(circle_at_top_right,rgba(73,105,255,.14),transparent_34%),#070c16] p-5 sm:p-6"><div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-4"><div className="grid h-16 w-16 place-items-center rounded-full border-2 border-emerald-300/60 text-lg font-semibold text-emerald-200 shadow-[0_0_28px_rgba(52,211,153,.12)]">{snapshot.readiness}%</div><div><div className="text-lg font-semibold">{snapshot.readiness >= 85 ? "Infrastructure ready" : "Configuration in progress"}</div><div className="mt-1 text-sm text-[#7f8ca5]">{snapshot.region} · {snapshot.deploymentModel}</div></div></div><span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/8 px-3 py-1.5 text-xs font-bold text-emerald-200"><Cloud size={14} />JUPITER MANAGED</span></div></section>

    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{snapshot.checks.map((check) => <article key={check.id} className="rounded-2xl border border-[#1a2231] bg-[#070c16] p-5"><div className="flex items-start justify-between gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl border border-white/8 bg-white/[.035] text-[#a6b3ca]">{check.id === "media" ? <Radio size={18} /> : check.id === "data" ? <Database size={18} /> : <Cloud size={18} />}</span>{check.state === "ready" ? <CheckCircle2 size={17} className="text-emerald-300" /> : <TriangleAlert size={17} className="text-amber-300" />}</div><h2 className="mt-4 font-semibold">{check.label}</h2><p className="mt-2 text-sm text-[#77849d]">{check.detail}</p></article>)}</section>

    <section className="grid gap-5 lg:grid-cols-[.8fr_1.2fr]"><div className="rounded-2xl border border-[#1a2231] bg-[#070c16] p-5"><div className="flex items-center gap-2 text-sm font-semibold"><Activity size={16} className="text-cyan-300" />Event usage</div><div className="mt-5 grid grid-cols-2 gap-3"><Metric value={snapshot.usage.registrants} label="Registrants" /><Metric value={snapshot.usage.sessions} label="Sessions" /><Metric value={snapshot.usage.activeAudience} label="Audience now" /><Metric value={snapshot.usage.messages} label="Messages" /><Metric value={snapshot.usage.campaigns} label="Campaigns" /><Metric value={snapshot.usage.publishes} label="Publishes" /></div></div><div className="rounded-2xl border border-[#1a2231] bg-[#070c16] p-5"><div className="flex items-center gap-2 text-sm font-semibold"><History size={16} className="text-violet-300" />Event audit history</div><div className="mt-4 divide-y divide-white/8">{snapshot.audit.map((item) => <div key={item.id} className="flex items-start gap-3 py-3"><span className="mt-1.5 h-2 w-2 rounded-full bg-violet-400" /><div className="min-w-0 flex-1"><div className="text-sm text-white/76">{item.summary}</div><div className="mt-1 text-xs text-[#65728a]">{item.actor} · {item.category}</div></div><time className="text-xs text-[#59657b]">{new Date(item.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" })}</time></div>)}{snapshot.audit.length === 0 ? <div className="py-8 text-sm text-[#65728a]">New administrative actions will appear here.</div> : null}</div></div></section>

    <section className="rounded-2xl border border-[#1a2231] bg-[#070c16] p-5"><div className="flex items-center gap-2 text-sm font-semibold"><Globe2 size={16} className="text-blue-300" />Deployment posture</div><div className="mt-5 grid gap-4 sm:grid-cols-3"><Detail label="Primary region" value={snapshot.region} /><Detail label="Deployment model" value={snapshot.deploymentModel} /><Detail label="Redundancy" value={snapshot.redundancy} /></div></section>
  </div></main>
}

function Metric({ value, label }: { value: number; label: string }) { return <div className="rounded-xl bg-[#111827] px-4 py-3"><div className="text-xl font-semibold">{value.toLocaleString()}</div><div className="mt-1 text-xs text-[#6f7c94]">{label}</div></div> }
function Detail({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-white/8 bg-[#0b111e] px-4 py-4"><div className="text-[9px] font-bold uppercase tracking-[.16em] text-[#65728a]">{label}</div><div className="mt-2 text-sm font-semibold">{value}</div></div> }
