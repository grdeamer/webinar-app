import Link from "next/link"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = user
    ? await supabaseAdmin.from("profiles").select("role").eq("id", user.id).maybeSingle()
    : { data: null }
  const isGlobalAdmin = profile?.role === "admin"
  const { data: memberships } = !isGlobalAdmin && user
    ? await supabaseAdmin.from("event_team_members").select("event_id").eq("user_id", user.id).eq("is_active", true)
    : { data: null }
  const eventIds = (memberships ?? []).map((membership) => membership.event_id)

  let query = supabaseAdmin
    .from("events")
    .select("id,slug,title,start_at,lifecycle_stage")
    .order("created_at", { ascending: false })
  if (!isGlobalAdmin) query = eventIds.length ? query.in("id", eventIds) : query.in("id", ["00000000-0000-0000-0000-000000000000"])
  const { data, error } = await query

  if (error) throw new Error(error.message)

  return (
    <div className="global-editorial-page mx-auto max-w-[1440px] space-y-8">
      <div className="flex items-start justify-between gap-6 border-b border-white/10 pb-8">
<div>
  <div className="mb-5">
    <JupiterLogo className="text-white" markClassName="h-10 w-10" wordmarkClassName="text-xl font-semibold tracking-[0.18em]" />
  </div>

  <h1 className="text-5xl font-semibold tracking-[-.045em]">Events</h1>
  <p className="mt-3 text-white/58">Create and manage full event experiences.</p>
</div>
        {isGlobalAdmin ? <Link
          href="/admin/events/new"
          className="rounded-xl bg-emerald-600 px-5 py-3 font-semibold hover:bg-emerald-500"
        >
          + New Event
        </Link> : null}
      </div>

      <EventsListClient canManage={isGlobalAdmin} initialEvents={(data || []).map((event) => ({
        id: event.id,
        slug: event.slug,
        title: event.title,
        lifecycle_stage: event.lifecycle_stage,
        start_label: event.start_at ? eventDateFormatter.format(new Date(event.start_at)) : "Date TBD",
      }))} />
    </div>
  )
}
