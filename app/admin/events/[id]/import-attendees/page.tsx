import Link from "next/link"
import { supabaseAdmin } from "@/lib/supabase/admin"
import ImportAttendeesUI from "./ui"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export default async function AdminEventImportAttendeesPage(props: {
  params: Promise<{ id: string }>
}) {
  const { id } = await props.params

  const { data: event, error } = await supabaseAdmin
    .from("events")
    .select("id,slug,title")
    .eq("id", id)
    .single()

  if (error || !event) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-rose-200">
        Error loading event: {error?.message || "Not found"}
      </div>
    )
  }

  // Helpful for template generation / UI hints (best effort)
  const { data: webinars } = await supabaseAdmin
    .from("webinars")
    .select("id,title")
    .order("webinar_date", { ascending: true })
    .limit(12)

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Import Attendees</h1>
            <p className="mt-1 text-sm text-white/60">
              Bulk-create users and assign webinar access under <span className="text-white/80">{event.title}</span>.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/admin/events/${event.id}`}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 transition"
            >
              Back to Event
            </Link>
            <Link
              href={`/events/${event.slug}/lobby`}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 transition"
            >
              View Lobby
            </Link>
          </div>
        </div>
      </div>

      <ImportAttendeesUI
        eventId={event.id}
        eventSlug={event.slug}
      />
    </div>
  )
}
