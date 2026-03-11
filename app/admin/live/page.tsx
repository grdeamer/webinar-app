import LiveViewersChart from "@/components/admin/LiveViewersChart"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export default function AdminLivePage() {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h1 className="text-2xl font-bold">Live</h1>
        <p className="mt-1 text-sm text-white/60">
          Zoom-style live dashboard (viewers + timeline).
        </p>
      </div>

      <LiveViewersChart roomKey="general" />

      <div className="text-xs text-white/50">
        Tip: Open <span className="font-mono">/general-session</span> in multiple tabs (or incognito)
        to see the line jump.
      </div>
    </div>
  )
}