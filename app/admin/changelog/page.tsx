export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export default function AdminChangeLogPage() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <h1 className="text-2xl font-bold">Change Log</h1>
      <p className="mt-2 text-sm text-white/60">
        This will show an audit trail: who changed what, and when.
      </p>
    </div>
  )
}