import { notFound } from "next/navigation"
import { Activity, ArrowUpRight, Cloud, Database, Globe2, HardDrive, History, LockKeyhole, Mail, Radio, Rocket, ServerCog } from "lucide-react"
import { getPlatformCloudSnapshot, type CloudService, type CloudServiceState } from "@/lib/cloud/status"
import { requireAdmin } from "@/lib/requireAdmin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const serviceIcons = {
  database: Database,
  storage: HardDrive,
  media: Radio,
  email: Mail,
  delivery: Rocket,
}

const stateStyles: Record<CloudServiceState, string> = {
  operational: "border-emerald-300/25 bg-emerald-300/10 text-emerald-200",
  configured: "border-cyan-300/25 bg-cyan-300/10 text-cyan-200",
  degraded: "border-amber-300/25 bg-amber-300/10 text-amber-200",
  unavailable: "border-rose-300/25 bg-rose-300/10 text-rose-200",
}

function StateBadge({ state }: { state: CloudServiceState }) {
  return <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.12em] ${stateStyles[state]}`}>{state}</span>
}

function ServiceCard({ service }: { service: CloudService }) {
  const Icon = serviceIcons[service.id as keyof typeof serviceIcons] || Cloud
  return <article className="rounded-2xl border border-white/10 bg-[linear-gradient(145deg,rgba(13,23,43,.94),rgba(5,10,22,.94))] p-5 shadow-[inset_0_1px_rgba(255,255,255,.035)]">
    <div className="flex items-start justify-between gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl border border-violet-300/15 bg-violet-300/10 text-violet-200"><Icon size={20} /></span><StateBadge state={service.state} /></div>
    <div className="mt-5 text-xs font-semibold uppercase tracking-[.16em] text-white/34">{service.layer}</div>
    <h2 className="mt-2 text-lg font-semibold">{service.name}</h2>
    <p className="mt-2 min-h-10 text-sm leading-5 text-white/48">{service.detail}</p>
    <div className="mt-4 border-t border-white/8 pt-3 text-xs text-white/34">{service.latencyMs === null ? "Configuration check" : `${service.latencyMs} ms probe`}</div>
  </article>
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/New_York" }).format(new Date(value))
}

export default async function JupiterCloudPage() {
  const auth = await requireAdmin()
  if (auth.profile.role !== "admin") notFound()
  const snapshot = await getPlatformCloudSnapshot()
  const healthyServices = snapshot.services.filter((service) => service.state === "operational" || service.state === "configured").length

  return <div className="global-editorial-page mx-auto max-w-[1460px] space-y-6">
    <header className="relative overflow-hidden rounded-[28px] border border-blue-300/10 bg-[#030817] px-7 py-8 sm:px-10 sm:py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_82%_18%,rgba(93,93,255,.22),transparent_31%),radial-gradient(circle_at_62%_120%,rgba(48,193,255,.12),transparent_34%)]" />
      <div className="pointer-events-none absolute -right-16 top-[-150px] h-[360px] w-[360px] rounded-full border border-blue-200/10 bg-[radial-gradient(circle_at_36%_32%,#8f704f_0%,#5a4133_24%,#1d273a_53%,#050915_73%)] opacity-75 shadow-[0_0_70px_rgba(76,121,255,.24)] blur-[1px]" />
      <div className="relative flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
        <div><div className="text-[11px] font-bold uppercase tracking-[.26em] text-blue-200/52">Mission Control / Infrastructure</div><h1 className="mt-4 text-4xl font-semibold tracking-[-.045em] sm:text-6xl">Jupiter Cloud</h1><p className="mt-4 max-w-2xl text-base leading-7 text-white/56">The control plane for every event, audience connection, production service and deployed experience.</p></div>
        <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-black/20 px-5 py-4 backdrop-blur-xl"><span className={`h-3 w-3 rounded-full ${snapshot.overallState === "operational" ? "bg-emerald-300 shadow-[0_0_18px_rgba(110,231,183,.9)]" : "bg-amber-300 shadow-[0_0_18px_rgba(252,211,77,.7)]"}`} /><div><div className="text-sm font-semibold">{snapshot.overallState === "operational" ? "All core systems ready" : "Operational with attention items"}</div><div className="mt-1 text-xs text-white/38">{healthyServices} of {snapshot.services.length} services ready · {snapshot.region}</div></div></div>
      </div>
    </header>

    <section>
      <div className="mb-3 flex items-center justify-between"><div><div className="text-[10px] font-bold uppercase tracking-[.2em] text-white/32">Service health</div><h2 className="mt-1 text-xl font-semibold">Cloud layers</h2></div><div className="text-xs text-white/34">Updated {formatTime(snapshot.generatedAt)}</div></div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">{snapshot.services.map((service) => <ServiceCard key={service.id} service={service} />)}</div>
    </section>

    <section className="grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
      <div className="rounded-2xl border border-white/10 bg-white/[.025] p-6">
        <div className="flex flex-wrap items-start justify-between gap-4"><div><div className="text-[10px] font-bold uppercase tracking-[.2em] text-white/32">Current deployment</div><h2 className="mt-2 text-xl font-semibold">Production control plane</h2></div><StateBadge state={snapshot.deployment.status === "ready" ? "operational" : "configured"} /></div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><CloudDetail label="Provider" value="Vercel" /><CloudDetail label="Environment" value={snapshot.deployment.environment} /><CloudDetail label="Region" value={snapshot.region} /><CloudDetail label="Commit" value={snapshot.deployment.commitSha?.slice(0, 8) || "Local build"} /></div>
        {snapshot.deployment.url ? <a href={snapshot.deployment.url} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-blue-300 hover:text-blue-200">Open production<ArrowUpRight size={15} /></a> : null}
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/[.025] p-6"><div className="flex items-center gap-2 text-sm font-semibold"><Activity size={17} className="text-cyan-300" />Live capacity</div><div className="mt-6 grid grid-cols-2 gap-4"><UsageMetric value={snapshot.usage.activeAudience} label="Audience now" /><UsageMetric value={snapshot.usage.activeEvents} label="Active events" /><UsageMetric value={snapshot.usage.events} label="Workspaces" /><UsageMetric value={snapshot.usage.sessions} label="Sessions" /></div></div>
    </section>

    <section className="grid gap-5 xl:grid-cols-[.85fr_1.15fr]">
      <div className="rounded-2xl border border-white/10 bg-white/[.025] p-6"><div className="flex items-center gap-2 text-sm font-semibold"><Database size={17} className="text-violet-300" />Cumulative usage</div><div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-2"><UsageMetric value={snapshot.usage.registrants} label="Registrants" /><UsageMetric value={snapshot.usage.emailMessages} label="Messages" /><UsageMetric value={snapshot.usage.publishedDeployments} label="Publishes" /><UsageMetric value={snapshot.usage.sessions} label="Program units" /></div></div>
      <div className="rounded-2xl border border-white/10 bg-white/[.025] p-6"><div className="flex items-center justify-between"><div className="flex items-center gap-2 text-sm font-semibold"><History size={17} className="text-blue-300" />Audit history</div><span className="text-xs text-white/34">Latest 20 events</span></div><div className="mt-5 divide-y divide-white/8">{snapshot.audit.slice(0, 8).map((item) => <div key={item.id} className="flex items-start gap-3 py-3.5"><span className="mt-1.5 h-2 w-2 rounded-full bg-blue-400 shadow-[0_0_9px_rgba(96,165,250,.65)]" /><div className="min-w-0 flex-1"><div className="text-sm text-white/76">{item.summary}</div><div className="mt-1 text-xs text-white/34">{item.actor} · {item.category}</div></div><time className="text-xs text-white/30">{formatTime(item.createdAt)}</time></div>)}{snapshot.audit.length === 0 ? <div className="py-8 text-sm text-white/40">Infrastructure activity will appear here.</div> : null}</div></div>
    </section>

    <section className="rounded-2xl border border-violet-300/12 bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,.12),transparent_38%),rgba(255,255,255,.02)] p-6 sm:p-7"><div className="flex items-center gap-2 text-sm font-semibold text-violet-100"><ServerCog size={18} />Infrastructure roadmap</div><p className="mt-2 text-sm text-white/44">The control plane is ready for these next deployment models without pretending they are active today.</p><div className="mt-6 grid gap-4 md:grid-cols-3"><RoadmapCard icon={<Rocket size={18} />} title="Automated provisioning" detail="One action creates service namespaces, media rooms, asset paths and delivery configuration." /><RoadmapCard icon={<Globe2 size={18} />} title="Regional redundancy" detail="Replicated data and failover media routing across selected operating regions." /><RoadmapCard icon={<LockKeyhole size={18} />} title="Enterprise private cloud" detail="Dedicated tenancy, customer-owned domains, keys and isolated deployment targets." /></div></section>
  </div>
}

function CloudDetail({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-white/8 bg-black/15 px-4 py-3"><div className="text-[10px] uppercase tracking-[.16em] text-white/30">{label}</div><div className="mt-2 truncate text-sm font-semibold capitalize text-white/74">{value}</div></div> }
function UsageMetric({ value, label }: { value: number; label: string }) { return <div className="rounded-xl border border-white/8 bg-black/15 px-4 py-4"><div className="text-2xl font-semibold tracking-[-.04em]">{value.toLocaleString()}</div><div className="mt-1 text-xs text-white/36">{label}</div></div> }
function RoadmapCard({ icon, title, detail }: { icon: React.ReactNode; title: string; detail: string }) { return <article className="rounded-2xl border border-white/8 bg-black/15 p-5"><span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-300/10 text-violet-200">{icon}</span><div className="mt-4 flex items-center gap-2"><h3 className="font-semibold">{title}</h3><span className="rounded-full border border-white/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[.12em] text-white/35">Planned</span></div><p className="mt-2 text-sm leading-5 text-white/42">{detail}</p></article> }
