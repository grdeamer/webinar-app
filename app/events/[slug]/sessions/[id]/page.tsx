import Link from "next/link"
import { notFound } from "next/navigation"
import { getEventBySlug } from "@/lib/events"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type SessionRow = {
  id: string
  event_id: string
  code: string | null
  title: string
  description: string | null
  starts_at: string | null
  ends_at: string | null
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

export default async function EventSessionDetailPage(props: {
  params: Promise<{ slug: string; id: string }>
}) {
  const { slug, id } = await props.params
  const event = await getEventBySlug(slug)

  const { data: session } = await supabaseAdmin
    .from("event_sessions")
    .select("id,event_id,code,title,description,starts_at,ends_at,join_link")
    .eq("id", id)
    .eq("event_id", event.id)
    .maybeSingle<SessionRow>()

  if (!session) notFound()

  const whenLabel = formatDatePretty(session.starts_at, session.ends_at)

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/events/${slug}/sessions`}
          className="text-sm text-white/70 hover:text-white"
        >
          ← Back to Sessions
        </Link>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
        <div className="text-sm text-white/50">Session Detail</div>
        <h1 className="mt-2 text-3xl font-bold">{session.title}</h1>

        {session.code ? (
          <div className="mt-2 text-xs font-mono text-white/45">
            Session code: {session.code}
          </div>
        ) : null}

        <p className="mt-3 text-white/70">{whenLabel}</p>

        {session.description ? (
          <p className="mt-6 text-white/70">{session.description}</p>
        ) : (
          <p className="mt-6 text-white/50">No description provided.</p>
        )}

        <div className="mt-6">
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
            <div className="inline-flex rounded-xl bg-white/10 px-5 py-3 text-sm text-white/60">
              No join link available
            </div>
          )}
        </div>
      </div>
    </div>
  )
}