import { supabaseAdmin } from "@/lib/supabase/admin"

type EventTemplate = "blank" | "webinar" | "pharma" | "conference"

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

function normalizeTemplate(value: unknown): EventTemplate {
  const v = String(value || "").toLowerCase().trim()
  if (v === "blank") return "blank"
  if (v === "pharma") return "pharma"
  if (v === "conference") return "conference"
  return "webinar"
}

export async function scaffoldEventContent(
  eventId: string,
  templateInput: EventTemplate | string = "webinar"
) {
  const template = normalizeTemplate(templateInput)

  const summary = {
    template,
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
    supabaseAdmin
      .from("event_agenda_items")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId),
    supabaseAdmin
      .from("event_breakouts")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId),
    supabaseAdmin
      .from("event_sponsors")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId),
    supabaseAdmin
      .from("event_library_items")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId),
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

  let agendaRows: AgendaSeedRow[] = []
  let breakoutRows: BreakoutSeedRow[] = []
  let sponsorRows: SponsorSeedRow[] = []
  let libraryRows: LibrarySeedRow[] = []

  if (template === "blank") {
    agendaRows = []
    breakoutRows = []
    sponsorRows = []
    libraryRows = []
  }

  if (template === "webinar") {
    agendaRows = [
      {
        event_id: eventId,
        title: `${eventTitle} Opening Session`,
        description:
          baseDescription ||
          "Kick off the event with a headline welcome and opening remarks.",
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
        description:
          "A short overview of the sessions, breakout rooms, and networking opportunities attendees should visit first.",
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
        description:
          "Wrap up the day with moderated audience questions and final takeaways.",
        speaker: "Panel Team",
        track: "Main Stage",
        location: "General Session",
        start_at: plusMinutes(120),
        end_at: plusMinutes(150),
        sort_index: 2,
      },
    ]

    breakoutRows = [
      {
        event_id: eventId,
        title: "Clinical Innovation Room",
        description:
          "A focused room for deep dives, product demos, and smaller group discussion.",
        join_link: null,
        start_at: plusMinutes(70),
        end_at: plusMinutes(110),
      },
      {
        event_id: eventId,
        title: "Speaker Meet & Greet",
        description:
          "Invite attendees to connect with presenters and moderators after the main session.",
        join_link: null,
        start_at: plusMinutes(95),
        end_at: plusMinutes(125),
      },
    ]

    sponsorRows = [
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

    libraryRows = [
      {
        event_id: eventId,
        kind: "link",
        title: "Event recap",
        description:
          "Add a recap URL, replay page, or PDF handout here once the event is complete.",
        url: null,
        sort_index: 0,
      },
      {
        event_id: eventId,
        kind: "link",
        title: "Speaker resources",
        description:
          "Use this tile for follow-up materials, product sheets, or related content.",
        url: null,
        sort_index: 1,
      },
    ]
  }

  if (template === "pharma") {
    agendaRows = [
      {
        event_id: eventId,
        title: `${eventTitle} Welcome & Opening Remarks`,
        description:
          baseDescription ||
          "Open the summit with host remarks, brand context, and the day’s strategic focus.",
        speaker: "Executive Host",
        track: "Main Stage",
        location: "General Session",
        start_at: plusMinutes(0),
        end_at: plusMinutes(30),
        sort_index: 0,
      },
      {
        event_id: eventId,
        title: "Clinical Keynote",
        description:
          "Present core efficacy, safety, and patient outcome data for the lead therapy.",
        speaker: "Dr. Jane Smith",
        track: "Clinical",
        location: "Main Auditorium",
        start_at: plusMinutes(30),
        end_at: plusMinutes(75),
        sort_index: 1,
      },
      {
        event_id: eventId,
        title: "Market Access & Commercial Strategy",
        description:
          "Review payer environment, commercialization planning, and field alignment.",
        speaker: "Commercial Lead",
        track: "Commercial",
        location: "Strategy Room",
        start_at: plusMinutes(90),
        end_at: plusMinutes(130),
        sort_index: 2,
      },
      {
        event_id: eventId,
        title: "Medical Affairs Q&A",
        description:
          "Conclude with moderated questions from attendees and discussion leaders.",
        speaker: "Medical Affairs Panel",
        track: "Main Stage",
        location: "General Session",
        start_at: plusMinutes(140),
        end_at: plusMinutes(180),
        sort_index: 3,
      },
    ]

    breakoutRows = [
      {
        event_id: eventId,
        title: "HCP Education Breakout",
        description:
          "Focused discussion for educational strategy, scientific exchange, and follow-up content.",
        join_link: null,
        start_at: plusMinutes(95),
        end_at: plusMinutes(135),
      },
      {
        event_id: eventId,
        title: "Sales Enablement Room",
        description:
          "Review positioning, objection handling, and launch readiness assets.",
        join_link: null,
        start_at: plusMinutes(95),
        end_at: plusMinutes(135),
      },
      {
        event_id: eventId,
        title: "KOL Discussion Lounge",
        description:
          "Smaller-group discussion room for faculty, moderators, and invited guests.",
        join_link: null,
        start_at: plusMinutes(100),
        end_at: plusMinutes(145),
      },
    ]

    sponsorRows = [
      {
        event_id: eventId,
        name: "Cardiovex Therapeutics",
        description: "Presenting brand sponsor",
        tier: "Title Sponsor",
        sort_index: 0,
      },
      {
        event_id: eventId,
        name: "Northstar Health",
        description: "Medical education partner",
        tier: "Platinum",
        sort_index: 1,
      },
      {
        event_id: eventId,
        name: "Streamline Media",
        description: "Broadcast and production partner",
        tier: "Gold",
        sort_index: 2,
      },
    ]

    libraryRows = [
      {
        event_id: eventId,
        kind: "link",
        title: "Clinical slide deck",
        description:
          "Add core presentation slides, MOA visuals, or efficacy charts here.",
        url: null,
        sort_index: 0,
      },
      {
        event_id: eventId,
        kind: "link",
        title: "Prescribing information",
        description:
          "Use this tile for prescribing info, fair balance, or approved claims support.",
        url: null,
        sort_index: 1,
      },
      {
        event_id: eventId,
        kind: "link",
        title: "Speaker resources",
        description:
          "Store speaker bios, faculty packets, and follow-up resources here.",
        url: null,
        sort_index: 2,
      },
    ]
  }

  if (template === "conference") {
    agendaRows = [
      {
        event_id: eventId,
        title: `${eventTitle} Opening Keynote`,
        description:
          baseDescription ||
          "Launch the conference with a featured keynote and broad audience welcome.",
        speaker: "Conference Host",
        track: "Main Stage",
        location: "General Session",
        start_at: plusMinutes(0),
        end_at: plusMinutes(45),
        sort_index: 0,
      },
      {
        event_id: eventId,
        title: "Track A Sessions",
        description:
          "Parallel content block for the primary audience track.",
        speaker: "Track A Speakers",
        track: "Track A",
        location: "Room A",
        start_at: plusMinutes(60),
        end_at: plusMinutes(105),
        sort_index: 1,
      },
      {
        event_id: eventId,
        title: "Track B Sessions",
        description:
          "Parallel content block for a second audience segment.",
        speaker: "Track B Speakers",
        track: "Track B",
        location: "Room B",
        start_at: plusMinutes(60),
        end_at: plusMinutes(105),
        sort_index: 2,
      },
      {
        event_id: eventId,
        title: "Closing Panel",
        description:
          "End the day with a featured panel and attendee Q&A.",
        speaker: "Leadership Panel",
        track: "Main Stage",
        location: "General Session",
        start_at: plusMinutes(130),
        end_at: plusMinutes(170),
        sort_index: 3,
      },
    ]

    breakoutRows = [
      {
        event_id: eventId,
        title: "Networking Lounge",
        description:
          "An attendee room for informal connection and follow-up discussion.",
        join_link: null,
        start_at: plusMinutes(75),
        end_at: plusMinutes(150),
      },
      {
        event_id: eventId,
        title: "Product Demo Room",
        description:
          "A dedicated room for demos, guided walkthroughs, and sponsor activations.",
        join_link: null,
        start_at: plusMinutes(80),
        end_at: plusMinutes(140),
      },
      {
        event_id: eventId,
        title: "Speaker Green Room",
        description:
          "Private speaker prep and coordination space.",
        join_link: null,
        start_at: plusMinutes(0),
        end_at: plusMinutes(180),
      },
    ]

    sponsorRows = [
      {
        event_id: eventId,
        name: "Northstar Health",
        description: "Premier conference sponsor",
        tier: "Platinum",
        sort_index: 0,
      },
      {
        event_id: eventId,
        name: "Streamline Media",
        description: "Experience and production partner",
        tier: "Gold",
        sort_index: 1,
      },
      {
        event_id: eventId,
        name: "SummitCloud",
        description: "Technology sponsor",
        tier: "Silver",
        sort_index: 2,
      },
    ]

    libraryRows = [
      {
        event_id: eventId,
        kind: "link",
        title: "Conference guide",
        description:
          "Add a downloadable attendee guide, run-of-show, or PDF handout here.",
        url: null,
        sort_index: 0,
      },
      {
        event_id: eventId,
        kind: "link",
        title: "Session resources",
        description:
          "Use this tile for decks, resources, and follow-up session content.",
        url: null,
        sort_index: 1,
      },
      {
        event_id: eventId,
        kind: "link",
        title: "Sponsor directory",
        description:
          "Add sponsor pages, demo links, and partner resources here.",
        url: null,
        sort_index: 2,
      },
    ]
  }

  if ((agendaCount || 0) === 0 && agendaRows.length > 0) {
    const { error } = await supabaseAdmin.from("event_agenda_items").insert(agendaRows)
    if (error) throw new Error(error.message)
    summary.agendaCreated = agendaRows.length
  }

  if ((breakoutsCount || 0) === 0 && breakoutRows.length > 0) {
    const { error } = await supabaseAdmin.from("event_breakouts").insert(breakoutRows)
    if (error) throw new Error(error.message)
    summary.breakoutsCreated = breakoutRows.length
  }

  if ((sponsorsCount || 0) === 0 && sponsorRows.length > 0) {
    const { error } = await supabaseAdmin.from("event_sponsors").insert(sponsorRows)
    if (error) throw new Error(error.message)
    summary.sponsorsCreated = sponsorRows.length
  }

  if ((libraryCount || 0) === 0 && libraryRows.length > 0) {
    const { error } = await supabaseAdmin.from("event_library_items").insert(libraryRows)
    if (error) throw new Error(error.message)
    summary.libraryCreated = libraryRows.length
  }

  return summary
}