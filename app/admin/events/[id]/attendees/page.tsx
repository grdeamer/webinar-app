import { notFound } from "next/navigation"
import { listDistrictSessions } from "@/lib/districtAccess"
import { supabaseAdmin } from "@/lib/supabase/admin"
import PeopleClient from "./PeopleClient"

type Role = "registrant" | "presenter"
type Person = {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  name: string
  session_ids: string[]
  role: Role
  created_at: string | null
  source: "event_registrants"
}
type Session = { id: string; code: string | null; title: string; starts_at: string | null; ends_at: string | null; external_join_url: string | null }

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export default async function PeoplePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data: event, error } = await supabaseAdmin
    .from("events")
    .select("id,slug,title")
    .eq("id", id)
    .maybeSingle()

  if (error || !event) notFound()

  // Load attendees and sessions server-side to avoid API call issues
  const { data: sessions, error: sessionsError } = await supabaseAdmin
    .from("event_sessions")
    .select("id,code,title,starts_at,ends_at,external_join_url")
    .eq("event_id", id)
    .order("sort_order", { ascending: true })
    .order("starts_at", { ascending: true, nullsFirst: false })

  const districts = await listDistrictSessions(id)

  const { data: registrants, error: registrantsError } = await supabaseAdmin
    .from("event_registrants")
    .select("id,email,first_name,last_name,tag,created_at")
    .eq("event_id", id)
    .order("email", { ascending: true })

  // Get session assignments
  let registrantSessionMap: Record<string, string[]> = {}
  if (registrants && registrants.length > 0) {
    const registrantIds = registrants.map(r => r.id)
    const { data: registrantSessions } = await supabaseAdmin
      .from("event_registrant_sessions")
      .select("registrant_id,session_id")
      .in("registrant_id", registrantIds)

    for (const row of (registrantSessions || [])) {
      if (!registrantSessionMap[row.registrant_id]) {
        registrantSessionMap[row.registrant_id] = []
      }
      registrantSessionMap[row.registrant_id].push(row.session_id)
    }
  }

  const attendees = (registrants || []).map(r => ({
    id: r.id,
    email: r.email,
    first_name: r.first_name,
    last_name: r.last_name,
    name: [r.first_name, r.last_name].filter(Boolean).join(" ").trim() || r.email,
    session_ids: registrantSessionMap[r.id] || [],
    role: (String(r.tag || "").toLowerCase().includes("presenter") ? "presenter" : "registrant") as "registrant" | "presenter",
    created_at: r.created_at,
    source: "event_registrants" as const,
  }))

  return (
    <main className="event-editorial-page">
      <PeopleClient 
        eventId={event.id} 
        eventSlug={event.slug} 
        eventTitle={event.title}
        initialAttendees={attendees}
        initialSessions={sessions || []}
        initialDistricts={districts}
      />
    </main>
  )
}
