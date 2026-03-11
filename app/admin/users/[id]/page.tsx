import Link from "next/link"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v
  )
}

type WebinarRow = {
  id: string
  title: string
  webinar_date: string | null
  tag?: string | null
  speaker?: string | null
}

export default async function AdminUserDetailPage(props: {
  params: Promise<{ id: string }>
}) {
  const { id } = await props.params

  if (!id || typeof id !== "string" || !isUuid(id)) {
    return (
      <main className="min-h-screen bg-slate-950 text-white p-10">
        <Link href="/admin/users" className="text-white/70 hover:text-white">
          ← Back to users
        </Link>
        <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-8">
          <div className="text-xl font-semibold">User not found</div>
          <div className="mt-2 text-white/60">Invalid user id in URL.</div>
        </div>
      </main>
    )
  }

  const { data: user, error: userError } = await supabaseAdmin
    .from("users")
    .select("id,email,created_at")
    .eq("id", id)
    .single()

  if (userError || !user) {
    return (
      <main className="min-h-screen bg-slate-950 text-white p-10">
        <Link href="/admin/users" className="text-white/70 hover:text-white">
          ← Back to users
        </Link>
        <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-8">
          <div className="text-xl font-semibold">User not found</div>
          <div className="mt-2 text-white/60">
            {userError?.message ?? "No record returned."}
          </div>
        </div>
      </main>
    )
  }

  // assignments
  const { data: userWebinars, error: uwError } = await supabaseAdmin
    .from("user_webinars")
    .select("webinar_id,created_at")
    .eq("user_id", user.id)

  if (uwError) {
    return (
      <main className="min-h-screen bg-slate-950 text-white p-10">
        <Link href="/admin/users" className="text-white/70 hover:text-white">
          ← Back to users
        </Link>
        <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-8 text-red-200">
          Error loading assignments: {uwError.message}
        </div>
      </main>
    )
  }

  const webinarIds = (userWebinars ?? [])
    .map((r: any) => r.webinar_id)
    .filter((x: any) => typeof x === "string")

  // webinars for those assignments
  let webinars: WebinarRow[] = []
  if (webinarIds.length > 0) {
    const { data: webinarRows, error: wErr } = await supabaseAdmin
      .from("webinars")
      .select("id,title,webinar_date,tag,speaker")
      .in("id", webinarIds)

    if (wErr) {
      console.error("user webinars fetch error:", wErr)
    } else {
      webinars = (webinarRows ?? []) as WebinarRow[]
    }
  }

  // clicks by this user
  const { data: clicks } = await supabaseAdmin
    .from("webinar_clicks")
    .select("id,webinar_id,created_at")
    .eq("user_id", user.id)

  const clickCountByWebinar = new Map<string, number>()
  clicks?.forEach((c: any) => {
    if (!c.webinar_id) return
    clickCountByWebinar.set(
      c.webinar_id,
      (clickCountByWebinar.get(c.webinar_id) ?? 0) + 1
    )
  })

  const totalClicks = clicks?.length ?? 0

  const webinarMap = new Map(webinars.map((w) => [w.id, w] as const))
  const assignedWebinars: WebinarRow[] = webinarIds
    .map((wid) => webinarMap.get(wid))
    .filter(Boolean) as WebinarRow[]

  // Sort upcoming first by date, with nulls at bottom
  assignedWebinars.sort((a, b) => {
    const ta = a.webinar_date ? new Date(a.webinar_date).getTime() : Number.POSITIVE_INFINITY
    const tb = b.webinar_date ? new Date(b.webinar_date).getTime() : Number.POSITIVE_INFINITY
    return ta - tb
  })

  const missingWebinarCount = webinarIds.length - assignedWebinars.length

  return (
    <main className="min-h-screen bg-slate-950 text-white p-10">
      <div className="flex items-center justify-between gap-4">
        <Link href="/admin/users" className="text-white/70 hover:text-white">
          ← Back
        </Link>

        <div className="flex gap-2">
          <Link
            href="/admin/webinars"
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 transition"
          >
            Webinar Analytics
          </Link>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-8">
        <div className="text-2xl font-semibold">{user.email}</div>
        <div className="mt-2 text-white/60 text-sm">
          Created: {user.created_at ? new Date(user.created_at).toLocaleString() : "—"}
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-2">
            <div className="text-xs text-white/60">Assigned webinars</div>
            <div className="text-lg font-semibold">{webinarIds.length}</div>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-2">
            <div className="text-xs text-white/60">Total clicks</div>
            <div className="text-lg font-semibold">{totalClicks}</div>
          </div>

          {missingWebinarCount > 0 && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2">
              <div className="text-xs text-red-200">Missing webinar records</div>
              <div className="text-lg font-semibold text-red-100">{missingWebinarCount}</div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-8">
        <div className="text-lg font-semibold mb-4">Assigned webinars</div>

        {webinarIds.length === 0 ? (
          <div className="text-white/60">No webinars assigned.</div>
        ) : assignedWebinars.length === 0 ? (
          <div className="text-white/70">
            Assignments exist, but the referenced webinars weren’t found.
          </div>
        ) : (
          <div className="space-y-3">
            {assignedWebinars.map((w) => {
              const count = clickCountByWebinar.get(w.id) ?? 0
              return (
                <div
                  key={w.id}
                  className="rounded-xl border border-white/10 bg-black/20 p-5"
                >
                  <div className="flex items-start justify-between gap-6">
                    <div>
                      <div className="text-lg font-medium">{w.title}</div>
                      <div className="mt-1 text-sm text-white/60">
                        {w.webinar_date
                          ? new Date(w.webinar_date).toLocaleString()
                          : "No date"}
                      </div>

                      {(w.tag || w.speaker) && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {w.tag && (
                            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80">
                              {w.tag}
                            </span>
                          )}
                          {w.speaker && (
                            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80">
                              {w.speaker}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="text-right">
                      <div className="text-2xl font-semibold">{count}</div>
                      <div className="text-xs text-white/60">Clicks</div>

                      <Link
                        href={`/admin/webinars/${w.id}`}
                        className="mt-3 inline-block rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10 transition"
                      >
                        View webinar →
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-8">
        <div className="text-lg font-semibold mb-4">Recent click log</div>

        {totalClicks === 0 ? (
          <div className="text-white/60">No clicks recorded yet.</div>
        ) : (
          <ul className="space-y-2 text-sm text-white/70">
            {clicks!
              .slice()
              .sort(
                (a: any, b: any) =>
                  new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
              )
              .slice(0, 50)
              .map((c: any) => (
                <li
                  key={c.id}
                  className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 flex items-center justify-between gap-4"
                >
                  <span>{new Date(c.created_at).toLocaleString()}</span>
                  <span className="text-white/60 text-xs truncate">
                    webinar: {c.webinar_id}
                  </span>
                </li>
              ))}
          </ul>
        )}

        {totalClicks > 50 && (
          <div className="mt-4 text-xs text-white/50">Showing latest 50 clicks.</div>
        )}
      </div>
    </main>
  )
}