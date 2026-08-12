import ActivityTreeClient from "./tree-client"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export default function AdminActivityPage() {
  return (
    <div className="space-y-4">
      <div className="rounded-[26px] border border-white/10 bg-[linear-gradient(120deg,rgba(14,165,233,.07),rgba(139,92,246,.05),rgba(255,255,255,.025))] p-6">
        <div className="text-[10px] font-black uppercase tracking-[.22em] text-sky-100/40">Live platform activity</div>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-.035em]">Jupiter Activity Constellation</h1>
        <p className="mt-1 text-sm text-white/60">
          See audience movement illuminate the destinations and pathways across the entire platform.
        </p>
      </div>

      <ActivityTreeClient roomKey="general" />
    </div>
  )
}
