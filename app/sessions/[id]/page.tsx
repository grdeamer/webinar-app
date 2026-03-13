import Link from "next/link"
import { notFound } from "next/navigation"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type SessionRow = {
  id: string
  event_id: string
  code: string | null
  title: string
  description: string | null
  start_at: string | null
  end_at: string | null
  join_link: string | null
}

function formatDatePretty(start: string | null, end: string | null) {
  if (!start) return "Time TBA"

  const s = new Date(start)
  if (isNaN(s.getTime())) return "Time TBA"

  const startText = s.toLocaleString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })

  if (!end) return startText

  const e = new Date(end)
  if (isNaN(e.getTime())) return startText

  const endText = e.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  })

  return `${startText} – ${endText}`
}

export default async function SessionDetailsPage(props: {
  params: Promise<{ id: string }>
}) {
  const { id } = await props.params

  const { data: session, error } = await supabaseAdmin
    .from("event_sessions")
    .select("id,event_id,code,title,description,start_at,end_at,join_link")
    .eq("id", id)
    .maybeSingle<SessionRow>()

  if (error || !session) {
    notFound()
  }

  const whenLabel = formatDatePretty(session.start_at, session.end_at)

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <Link href="/sessions" className="text-sm text-white/70 hover:text-white transition">
          ← Back to Sessions
        </Link>

        <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{session.title}</h1>

              {session.code ? (
                <div className="mt-2 text-xs font-mono text-white/45">
                  Session code: {session.code}
                </div>
              ) : null}

              <p className="mt-3 text-white/70">{whenLabel}</p>
            </div>

            {session.join_link ? (
              <a
                href={session.join_link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-3 font-medium hover:bg-indigo-700 transition"
              >
                Join Session
              </a>
            ) : (
              <div className="rounded-xl bg-white/10 px-5 py-3 text-sm text-white/60">
                No join link available
              </div>
            )}
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.5fr_0.9fr]">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-6">
              <h2 className="text-lg font-semibold">About this session</h2>

              {session.description ? (
                <p className="mt-3 leading-7 text-white/70">{session.description}</p>
              ) : (
                <p className="mt-3 text-white/50">No description provided yet.</p>
              )}
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-6">
              <h2 className="text-lg font-semibold">Session Info</h2>

              <div className="mt-4 space-y-3 text-sm text-white/70">
                <div>
                  <div className="text-white/45">Time</div>
                  <div className="mt-1">{whenLabel}</div>
                </div>

                <div>
                  <div className="text-white/45">Session ID</div>
                  <div className="mt-1 break-all">{session.id}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}