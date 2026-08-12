import Link from "next/link"
import { supabaseAdmin } from "@/lib/supabase/admin"
import JupiterLogo from "@/components/brand/JupiterLogo"
import EventsListClient from "./EventsListClient"
export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const eventDateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/New_York",
})

export default async function AdminEventsPage() {
  const { data, error } = await supabaseAdmin
    .from("events")
    .select("id,slug,title,start_at,lifecycle_stage")
    .order("created_at", { ascending: false })

  if (error) throw new Error(error.message)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
<div>
  <div className="mb-3">
    <JupiterLogo className="text-white" markClassName="h-10 w-10" wordmarkClassName="text-xl font-semibold tracking-[0.18em]" />
  </div>

  <h1 className="text-3xl font-bold">Events</h1>
  <p className="mt-1 text-white/60">Create and manage full event experiences.</p>
</div>
        <Link
          href="/admin/events/new"
          className="rounded-xl bg-emerald-600 px-4 py-2 font-semibold hover:bg-emerald-500"
        >
          + New Event
        </Link>
      </div>

      <EventsListClient initialEvents={(data || []).map((event) => ({
        id: event.id,
        slug: event.slug,
        title: event.title,
        lifecycle_stage: event.lifecycle_stage,
        start_label: event.start_at ? eventDateFormatter.format(new Date(event.start_at)) : "Date TBD",
      }))} />
    </div>
  )
}
