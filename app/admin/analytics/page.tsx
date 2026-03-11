import Link from "next/link"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export default async function AdminAnalyticsPage() {
  const cutoff = new Date(Date.now() - 45_000).toISOString()

  const [{ data: liveRows }, { count: clicksCount }, { count: questionsCount }, { count: webinarCount }, { count: userCount }, { data: recentClicks }] = await Promise.all([
    supabaseAdmin
      .from("general_session_presence")
      .select("session_id")
      .eq("room_key", "general")
      .gte("last_seen_at", cutoff),
    supabaseAdmin.from("webinar_clicks").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("qa_messages").select("*", { count: "exact", head: true }).eq("room_key", "general"),
    supabaseAdmin.from("webinars").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("users").select("*", { count: "exact", head: true }),
    supabaseAdmin
      .from("webinar_clicks")
      .select("webinar_id,created_at")
      .order("created_at", { ascending: false })
      .limit(100),
  ])

  const live = liveRows?.length ?? 0
  const clicksByDay = new Map<string, number>()
  for (const row of recentClicks ?? []) {
    const key = new Date((row as any).created_at).toLocaleDateString()
    clicksByDay.set(key, (clicksByDay.get(key) ?? 0) + 1)
  }

  const trend = Array.from(clicksByDay.entries()).slice(0, 7)

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Analytics</h1>
            <p className="mt-1 text-sm text-white/60">Your high-level platform health view.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/live" className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10">Open Live Dashboard</Link>
            <Link href="/presenter" className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10">Open Presenter</Link>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Metric title="Live viewers" value={String(live)} note="Heartbeat in last 45s" />
        <Metric title="Total webinar clicks" value={String(clicksCount ?? 0)} note="All time" />
        <Metric title="Q&A questions" value={String(questionsCount ?? 0)} note="General room" />
        <Metric title="Webinars" value={String(webinarCount ?? 0)} note="Configured sessions" />
        <Metric title="Users" value={String(userCount ?? 0)} note="Known attendees" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="text-lg font-semibold">Recent click trend</h2>
          <div className="mt-4 space-y-3">
            {trend.length === 0 ? (
              <div className="text-sm text-white/60">No webinar click data yet.</div>
            ) : (
              trend.map(([date, count]) => (
                <div key={date} className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3">
                  <span className="text-sm text-white/70">{date}</span>
                  <span className="text-lg font-semibold">{count}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="text-lg font-semibold">Recommended next checks</h2>
          <div className="mt-4 grid gap-3 text-sm text-white/70">
            <div className="rounded-xl border border-white/10 bg-black/20 p-4">Verify <span className="font-semibold text-white">/events/[slug]</span> routes with your seeded event.</div>
            <div className="rounded-xl border border-white/10 bg-black/20 p-4">Open <span className="font-semibold text-white">/admin/general-session</span> and confirm MP4 / HLS / RTMP saves correctly.</div>
            <div className="rounded-xl border border-white/10 bg-black/20 p-4">Use <span className="font-semibold text-white">/presenter</span> while moderating Q&A to confirm realtime updates.</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Metric({ title, value, note }: { title: string; value: string; note: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="text-xs text-white/50">{title}</div>
      <div className="mt-1 text-3xl font-bold">{value}</div>
      <div className="text-xs text-white/50">{note}</div>
    </div>
  )
}
