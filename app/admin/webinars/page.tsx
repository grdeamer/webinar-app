import Link from "next/link"
import { supabaseAdmin } from "@/lib/supabase/admin"
import WebinarsTableClient from "./table-client"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

type WebinarRow = {
  id: string
  title: string | null
  webinar_date: string | null
}

type ClickRow = {
  id: string
  webinar_id: string | null
  user_id: string | null
  created_at: string | null
}

export default async function AdminWebinarsPage() {
  const { data: webinars, error } = await supabaseAdmin
    .from("webinars")
    .select("id,title,webinar_date")
    .order("webinar_date", { ascending: false })

  if (error) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Webinars</h1>
            <p className="mt-1 text-sm text-white/60">Analytics overview</p>
          </div>
          <Link
            href="/admin"
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 transition"
          >
            Dashboard
          </Link>
        </div>

        <div className="mt-6 rounded-xl border border-white/10 bg-black/20 p-6 text-rose-200">
          Error loading webinars: {error.message}
        </div>
      </div>
    )
  }

  // Click counts + click export rows
  const { data: clicks, error: clicksError } = await supabaseAdmin
    .from("webinar_clicks")
    .select("id,webinar_id,user_id,created_at")

  if (clicksError) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Webinars</h1>
            <p className="mt-1 text-sm text-white/60">Analytics overview</p>
          </div>
          <Link
            href="/admin"
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 transition"
          >
            Dashboard
          </Link>
        </div>

        <div className="mt-6 rounded-xl border border-white/10 bg-black/20 p-6 text-rose-200">
          Error loading clicks: {clicksError.message}
        </div>
      </div>
    )
  }

  const clickMap = new Map<string, number>()
  clicks?.forEach((c: any) => {
    if (!c.webinar_id) return
    clickMap.set(c.webinar_id, (clickMap.get(c.webinar_id) ?? 0) + 1)
  })

  const list = (webinars ?? []) as WebinarRow[]
  const totalClicks = Array.from(clickMap.values()).reduce((a, b) => a + b, 0)

  return (
    <div className="space-y-4">
      {/* Zoom-style header */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Webinars</h1>
            <p className="mt-1 text-sm text-white/60">
              Click analytics by webinar. Click a row for details.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/users"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 transition"
            >
              Users
            </Link>
            <Link
              href="/admin"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 transition"
            >
              Dashboard
            </Link>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-white/60">
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
            Total webinars: <span className="text-white/80">{list.length}</span>
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
            Total clicks: <span className="text-white/80">{totalClicks}</span>
          </span>
        </div>
      </div>

      {/* Client table (search/sort/export) */}
      <WebinarsTableClient
        webinars={list}
        clickCounts={Object.fromEntries(clickMap.entries())}
        clicks={(clicks ?? []) as ClickRow[]}
      />

      <div className="text-xs text-white/50">
        Tip: Next upgrade is date-range filtering + export click detail rows.
      </div>
    </div>
  )
}