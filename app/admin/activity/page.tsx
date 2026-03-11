import ActivityTreeClient from "./tree-client"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export default function AdminActivityPage() {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h1 className="text-2xl font-bold">Activity Tree</h1>
        <p className="mt-1 text-sm text-white/60">
          Live routing map of attendee activity.
        </p>
      </div>

      <ActivityTreeClient roomKey="general" />
    </div>
  )
}