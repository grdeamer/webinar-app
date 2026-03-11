import Link from "next/link"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export default async function AdminBreakoutsOverviewPage() {
  const { data, error } = await supabaseAdmin
    .from("events")
    .select("id,slug,title,event_breakouts(count)")
    .order("created_at", { ascending: false })

  if (error) throw new Error(error.message)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Breakouts</h1>
        <p className="mt-1 text-white/60">Manage featured breakout tiles and room links for each event.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {(data || []).map((event: any) => {
          const count = event.event_breakouts?.[0]?.count ?? 0
          return (
            <Link key={event.id} href={`/admin/events/${event.id}/breakouts`} className="rounded-2xl border border-white/10 bg-white/5 p-5 hover:bg-white/10">
              <div className="text-lg font-semibold">{event.title}</div>
              <div className="mt-1 text-sm text-white/50">/{event.slug}</div>
              <div className="mt-4 inline-flex rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-white/60">{count} breakout{count === 1 ? "" : "s"}</div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
