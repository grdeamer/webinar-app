import Link from "next/link"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export default async function AdminDashboardPage() {
  const { data: gs } = await supabaseAdmin
    .from("general_session_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle()

  const published = Boolean(gs?.is_published)
  const sourceType = gs?.source_type ?? "—"

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-white/60">Quick access to the tools you’ve built.</p>
        </div>

        <Link
          href="/general-session"
          className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950"
        >
          Open General Session ↗
        </Link>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="text-sm text-white/60">General Session</div>
          <div className="mt-1 text-lg font-semibold">
            {published ? "Published" : "Draft"}
          </div>
          <div className="mt-1 text-sm text-white/60">Source: {sourceType}</div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/admin/general-session"
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
            >
              Edit Player & Publish
            </Link>
            <Link
              href="/admin/general-session/qa"
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
            >
              Moderate Q&amp;A
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="text-sm text-white/60">Core</div>
          <div className="mt-1 grid gap-2">
            <Link className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10" href="/admin/webinars">
              Webinars
            </Link>
            <Link className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10" href="/admin/users">
              Users
            </Link>
            <Link className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10" href="/admin/analytics">
              Analytics
            </Link>
            <Link className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10" href="/admin/dev-tools">
              Dev Tools
            </Link>
            <Link className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10" href="/presenter">
              Presenter Mode
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}