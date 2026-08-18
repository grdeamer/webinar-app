import Link from "next/link"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import EventsListClient from "./EventsListClient"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
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
    .select("id,slug,title,start_at,lifecycle_stage,accent_color")
    .order("created_at", { ascending: false })
  if (!isGlobalAdmin) query = eventIds.length ? query.in("id", eventIds) : query.in("id", ["00000000-0000-0000-0000-000000000000"])
  const { data, error } = await query

  if (error) throw new Error(error.message)

  return (
    <div className="global-editorial-page events-editorial-page mx-auto max-w-[1440px]">
      <header className="events-editorial-header">
        <div>
          <p className="events-editorial-kicker">Event directory</p>
          <h1 className="events-editorial-title">Events</h1>
          <p className="events-editorial-description">Create, prepare, and return to every production from one place.</p>
        </div>
        {isGlobalAdmin ? <Button asChild variant="jupiterPrimary" size="lg" className="events-editorial-create">
          <Link href="/admin/events/new"><Plus data-icon="inline-start" />New event</Link>
        </Button> : null}
      </header>

      <EventsListClient canManage={isGlobalAdmin} initialEvents={(data || []).map((event) => ({
        id: event.id,
        slug: event.slug,
        title: event.title,
        lifecycle_stage: event.lifecycle_stage,
        accent_color: event.accent_color || "blue",
        start_at: event.start_at,
        start_label: event.start_at ? eventDateFormatter.format(new Date(event.start_at)) : "Date TBD",
      }))} />
    </div>
  )
}
