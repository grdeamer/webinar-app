import { supabaseAdmin } from "@/lib/supabase/admin"

type AgendaSeedRow = {
  event_id: string
  title: string
  description: string | null
  speaker: string | null
  track: string | null
  location: string | null
  start_at: string | null
  end_at: string | null
  sort_index: number
}

type BreakoutSeedRow = {
  event_id: string
  title: string
  description: string | null
  join_link: string | null
  start_at: string | null
  end_at: string | null
}

type SponsorSeedRow = {
  event_id: string
  name: string
  description: string | null
  tier: string | null
  sort_index: number
}

type LibrarySeedRow = {
  event_id: string
  kind: string
  title: string
  description: string | null
  url: string | null
  sort_index: number
}

export async function scaffoldEventContent(eventId: string) {
  const summary = {
    agendaCreated: 0,
    breakoutsCreated: 0,
    sponsorsCreated: 0,
    libraryCreated: 0,
  }

  const { data: eventData, error: eventError } = await supabaseAdmin
    .from("events")
    .select("id,title,description")
    .eq("id", eventId)
    .maybeSingle()

  if (eventError) throw new Error(eventError.message)
  if (!eventData) throw new Error("Event not found")

  const eventTitle = String((eventData as any).title || "Event")
  const baseDescription = String((eventData as any).description || "").trim()

  const [
    { count: agendaCount, error: agendaCountError },
    { count: breakoutsCount, error: breakoutsCountError },
    { count: sponsorsCount, error: sponsorsCountError },
    { count: libraryCount, error: libraryCountError },
  ] = await Promise.all([
    supabaseAdmin.from("event_agenda_items").select("id", { count: "exact", head: true }).eq("event_id", eventId),
    supabaseAdmin.from("event_breakouts").select("id", { count: "exact", head: true }).eq("event_id", eventId),
    supabaseAdmin.from("event_sponsors").select("id", { count: "exact", head: true }).eq("event_id", eventId),
    supabaseAdmin.from("event_library_items").select("id", { count: "exact", head: true }).eq("event_id", eventId),
  ])

  if (agendaCountError) throw new Error(agendaCountError.message)
  if (breakoutsCountError) throw new Error(breakoutsCountError.message)
  if (sponsorsCountError) throw new Error(sponsorsCountError.message)
  if (libraryCountError) throw new Error(libraryCountError.message)

  const start = new Date()
  start.setMinutes(0, 0, 0)
  start.setHours(start.getHours() + 1)

  const plusMinutes = (minutes: number): string =>
    new Date(start.getTime() + minutes * 60_000).toISOString()

  if ((agendaCount || 0) === 0) {
    const agendaRows: AgendaSeedRow[] = [
      {
        event_id: eventId,
        title: `${eventTitle} Opening Session`,
        description: baseDescription || "Kick off the event with a headline welcome and opening remarks.",
        speaker: "Jane Doe",
        track: "Main Stage",
        location: "General Session",
        start_at: plusMinutes(0),
        end_at: plusMinutes(45),
        sort_index: 0,
      },
      {
        event_id: eventId,
        title: "Featured Breakout Preview",
        description: "A short overview of the sessions, breakout rooms, and networking opportunities attendees should visit first.",
        speaker: "Event Host",
        track: "Highlights",
        location: "Studio A",
        start_at: plusMinutes(60),
        end_at: plusMinutes(90),
        sort_index: 1,
      },
      {
        event_id: eventId,
        title: "Closing Q&A",
        description: "Wrap up the day with moderated audience questions and final takeaways.",
        speaker: "Panel Team",
        track: "Main Stage",
        location: "General Session",
        start_at: plusMinutes(120),
        end_at: plusMinutes(150),
        sort_index: 2,
      },
    ]

    const { error } = await supabaseAdmin.from("event_agenda_items").insert(agendaRows)
    if (error) throw new Error(error.message)
    summary.agendaCreated = agendaRows.length
  }

  if ((breakoutsCount || 0) === 0) {
    const breakoutRows: BreakoutSeedRow[] = [
      {
        event_id: eventId,
        title: "Clinical Innovation Room",
        description: "A focused room for deep dives, product demos, and smaller group discussion.",
        join_link: null,
        start_at: plusMinutes(70),
        end_at: plusMinutes(110),
      },
      {
        event_id: eventId,
        title: "Speaker Meet & Greet",
        description: "Invite attendees to connect with presenters and moderators after the main session.",
        join_link: null,
        start_at: plusMinutes(95),
        end_at: plusMinutes(125),
      },
    ]

    const { error } = await supabaseAdmin.from("event_breakouts").insert(breakoutRows)
    if (error) throw new Error(error.message)
    summary.breakoutsCreated = breakoutRows.length
  }

  if ((sponsorsCount || 0) === 0) {
    const sponsorRows: SponsorSeedRow[] = [
      {
        event_id: eventId,
        name: "Northstar Health",
        description: "Premier event partner",
        tier: "Platinum",
        sort_index: 0,
      },
      {
        event_id: eventId,
        name: "Streamline Media",
        description: "Production partner",
        tier: "Gold",
        sort_index: 1,
      },
    ]

    const { error } = await supabaseAdmin.from("event_sponsors").insert(sponsorRows)
    if (error) throw new Error(error.message)
    summary.sponsorsCreated = sponsorRows.length
  }

  if ((libraryCount || 0) === 0) {
    const libraryRows: LibrarySeedRow[] = [
      {
        event_id: eventId,
        kind: "link",
        title: "Event recap",
        description: "Add a recap URL, replay page, or PDF handout here once the event is complete.",
        url: null,
        sort_index: 0,
      },
      {
        event_id: eventId,
        kind: "link",
        title: "Speaker resources",
        description: "Use this tile for follow-up materials, product sheets, or related content.",
        url: null,
        sort_index: 1,
      },
    ]

    const { error } = await supabaseAdmin.from("event_library_items").insert(libraryRows)
    if (error) throw new Error(error.message)
    summary.libraryCreated = libraryRows.length
  }

  return summary
}