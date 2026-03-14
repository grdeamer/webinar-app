import Link from "next/link"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type EventRow = {
  id: string
  slug: string
  title: string
}

export default async function AdminEventPageEditorListPage() {
  const { data } = await supabaseAdmin
    .from("events")
    .select("id,slug,title")
    .order("created_at", { ascending: false })

  const events: EventRow[] = (data ?? []).map((e: any) => ({
    id: String(e.id),
    slug: String(e.slug),
    title: String(e.title ?? "Untitled Event"),
  }))

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
        <div className="text-sm uppercase tracking-[0.22em] text-white/40">Page Editor</div>
        <h1 className="mt-2 text-3xl font-bold">Event Page Preview</h1>
        <p className="mt-3 max-w-3xl text-white/70">
          Choose an event to open its current event landing page in a dedicated preview tab.
        </p>
      </div>

      {events.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-white/70">
          No events found.
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {events.map((event) => (
            <div
              key={event.id}
              className="rounded-3xl border border-white/10 bg-white/5 p-6"
            >
              <div className="text-lg font-semibold">{event.title}</div>
              <div className="mt-2 text-sm text-white/50">/{event.slug}</div>

              <div className="mt-6 flex gap-3">
                <Link
                  href={`/admin/page-editor/event/${event.slug}`}
                  target="_blank"
                  className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950"
                >
                  Open Preview
                </Link>

                <Link
                  href={`/admin/events/${event.id}`}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10"
                >
                  Event Admin
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}