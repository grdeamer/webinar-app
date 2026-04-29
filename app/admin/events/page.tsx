import Link from "next/link"
import { supabaseAdmin } from "@/lib/supabase/admin"
import Image from "next/image"
export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export default async function AdminEventsPage() {
  const { data, error } = await supabaseAdmin
    .from("events")
    .select("id,slug,title,start_at,end_at")
    .order("created_at", { ascending: false })

  if (error) throw new Error(error.message)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
<div>
  <div className="mb-3">
    <Image
      src="/jupiter-logo.svg"
      alt="Jupiter Events"
      width={220}
      height={60}
      priority
    />
  </div>

  <h1 className="text-3xl font-bold">Events</h1>
  <p className="mt-1 text-white/60">Create and manage full event experiences.</p>
</div>
        <Link
          href="/admin/events/new"
          className="rounded-xl bg-emerald-600 px-4 py-2 font-semibold hover:bg-emerald-500"
        >
          + New Event
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {(data || []).map((e: any) => (
          <Link
            key={e.id}
            href={`/admin/events/${e.id}`}
            className="rounded-2xl border border-white/10 bg-white/5 p-5 hover:bg-white/10"
          >
            <div className="text-lg font-semibold">{e.title}</div>
            <div className="mt-1 text-sm text-white/60">/{e.slug}</div>
            <div className="mt-3 text-xs text-white/40">
              {e.start_at ? new Date(e.start_at).toLocaleString() : "Date TBD"}
            </div>
          </Link>
        ))}
        {(data || []).length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-white/60">
            No events yet.
          </div>
        ) : null}
      </div>
    </div>
  )
}
