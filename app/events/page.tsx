import Link from "next/link"
import { listEvents } from "@/lib/events"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export default async function EventsIndex() {
  const events = await listEvents()

  return (
    <main className="min-h-screen bg-slate-950 text-white p-8">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-bold">Events</h1>
        <p className="mt-2 text-white/60">Pick an event to enter the lobby.</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {events.map((e) => (
            <Link
              key={e.id}
              href={`/events/${e.slug}/lobby`}
              className="rounded-2xl border border-white/10 bg-white/5 p-5 hover:bg-white/10"
            >
              <div className="text-lg font-semibold">{e.title}</div>
              {e.description ? (
                <div className="mt-1 text-sm text-white/60 line-clamp-3">{e.description}</div>
              ) : null}
              <div className="mt-3 text-xs text-white/40">
                {e.start_at ? new Date(e.start_at).toLocaleString() : "Date TBD"}
              </div>
            </Link>
          ))}
          {events.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-white/60">
              No events yet. Create one in <span className="text-white">/admin/events</span>.
            </div>
          ) : null}
        </div>
      </div>
    </main>
  )
}
