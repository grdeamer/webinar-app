import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import jwt from "jsonwebtoken"
import AttendeePresenceHeartbeat from "@/components/AttendeePresenceHeartbeat"
import JoinButton from "../../components/JoinButton"
import { supabaseAdmin } from "../../lib/supabaseAdmin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type WebinarRow = {
  id: string
  title: string
  description: string | null
  webinar_date: string | null
  join_link: string | null
  tag: string | null
}

function formatDatePretty(iso: string | null) {
  if (!iso) return null
  const d = new Date(iso)
  if (isNaN(d.getTime())) return null
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
}

function isUpcoming(iso: string | null) {
  if (!iso) return false
  const d = new Date(iso)
  if (isNaN(d.getTime())) return false
  return d.getTime() >= Date.now()
}

function tagBadge(tag: string | null, iso: string | null) {
  const t = (tag || "").trim().toLowerCase()

  if (t === "live") return { label: "LIVE", cls: "bg-rose-500/15 text-rose-200 ring-1 ring-rose-500/30" }
  if (t === "on-demand" || t === "ondemand")
    return { label: "ON-DEMAND", cls: "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/30" }
  if (t === "upcoming")
    return { label: "UPCOMING", cls: "bg-indigo-500/15 text-indigo-200 ring-1 ring-indigo-500/30" }

  // fallback based on date if tag is missing
  if (isUpcoming(iso)) return { label: "UPCOMING", cls: "bg-indigo-500/15 text-indigo-200 ring-1 ring-indigo-500/30" }
  return { label: "ON-DEMAND", cls: "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/30" }
}

export default async function MyWebinarsPage() {
  // cookies() in Next 16 can behave async under certain runtimes/bundlers
  const cookieStore = await cookies()
  const token = cookieStore.get("user_token")?.value

  if (!token) redirect("/")

  const JWT_SECRET = process.env.JWT_SECRET
  if (!JWT_SECRET) {
    // hard fail in prod; in dev show something usable
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <AttendeePresenceHeartbeat />
        <div className="mx-auto max-w-5xl px-6 py-14">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h1 className="text-xl font-semibold">Server misconfigured</h1>
            <p className="mt-2 text-white/70">Missing JWT_SECRET in environment.</p>
          </div>
        </div>
      </main>
    )
  }

  let userId: string | null = null
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any
    userId = decoded?.userId ?? null
  } catch {
    // invalid/expired token
    redirect("/")
  }

  if (!userId) redirect("/")

  // Fetch assigned webinars via join table.
  // NOTE: This assumes:
  // - user_webinars.user_id references users.id
  // - user_webinars.webinar_id references webinars.id
  const { data, error } = await supabaseAdmin
    .from("user_webinars")
    .select(
      `
      webinar_id,
      webinars:webinar_id (
        id,
        title,
        description,
        webinar_date,
        join_link,
        tag
      )
    `
    )
    .eq("user_id", userId)

  if (error) {
    console.error("my-webinars query error:", error)
  }

  // Normalize rows
  const rows: WebinarRow[] =
    (data || [])
      .map((r: any) => r?.webinars)
      .filter(Boolean)
      .map((w: any) => ({
        id: String(w.id),
        title: String(w.title ?? ""),
        description: w.description ?? null,
        webinar_date: w.webinar_date ?? null,
        join_link: w.join_link ?? null,
        tag: w.tag ?? null,
      })) || []

  // If assignments exist but webinars missing, show that explicitly
  const assignmentsCount = (data || []).length
  const webinarsCount = rows.length

  // Sort by date ascending (nulls last)
  rows.sort((a, b) => {
    const ta = a.webinar_date ? new Date(a.webinar_date).getTime() : Number.POSITIVE_INFINITY
    const tb = b.webinar_date ? new Date(b.webinar_date).getTime() : Number.POSITIVE_INFINITY
    return ta - tb
  })

  const showNoAssigned = assignmentsCount === 0
  const showMissingWebinars = assignmentsCount > 0 && webinarsCount === 0

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <AttendeePresenceHeartbeat />
      {/* soft glow */}
      <div className="pointer-events-none fixed inset-0 opacity-40">
        <div className="absolute -top-24 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-indigo-500 blur-[140px]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6 py-12">
        {/* header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Event Lobby</h1>
            <p className="mt-1 text-white/60">Your assigned sessions, sorted by date/time.</p>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/webinars"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium hover:bg-white/10 transition"
            >
              Public List
            </a>
            <a
              href="/access"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium hover:bg-white/10 transition"
            >
              Change Email
            </a>
          </div>
        </div>

        {/* Empty states */}
        {(showNoAssigned || showMissingWebinars) && (
          <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-10 text-center">
            <h2 className="text-xl font-semibold">
              {showNoAssigned ? "No webinars assigned" : "No webinars found"}
            </h2>
            <p className="mt-2 text-white/60">
              {showNoAssigned
                ? "If you think this is a mistake, contact the admin."
                : "Assignments exist, but the referenced webinars weren’t found."}
            </p>

            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a
                href="/access"
                className="rounded-xl bg-indigo-600 px-5 py-3 font-medium hover:bg-indigo-700 transition"
              >
                Re-enter email →
              </a>
              <a
                href="/webinars"
                className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 font-medium hover:bg-white/10 transition"
              >
                Browse public list
              </a>
            </div>
          </div>
        )}

        {/* Cards */}
        {webinarsCount > 0 && (
          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
            {rows.map((w) => {
              const badge = tagBadge(w.tag, w.webinar_date)
              const datePretty = formatDatePretty(w.webinar_date)

              return (
                <div
                  key={w.id}
                  className="rounded-3xl border border-white/10 bg-white/5 p-7 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${badge.cls}`}>
                      {badge.label}
                    </span>

                    {datePretty && (
                      <span className="text-xs text-white/60">{datePretty}</span>
                    )}
                  </div>

                  <h3 className="mt-4 text-xl font-semibold leading-snug">{w.title}</h3>

                  {w.description ? (
                    <p className="mt-2 text-white/65 line-clamp-3">{w.description}</p>
                  ) : (
                    <p className="mt-2 text-white/45">No description provided.</p>
                  )}

                  <div className="mt-6 flex gap-3">
                    {w.join_link ? (
                      <JoinButton webinarId={w.id} href={w.join_link} />
                    ) : (
                      <button
                        disabled
                        className="inline-flex mt-6 items-center justify-center rounded-xl bg-white/10 px-5 py-3 font-medium opacity-60 cursor-not-allowed"
                      >
                        No link available
                      </button>
                    )}

                    <a
                      href={`/webinars/${w.id}`}
                      className="inline-flex mt-6 items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 transition px-5 py-3 font-medium"
                    >
                      Details
                    </a>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}