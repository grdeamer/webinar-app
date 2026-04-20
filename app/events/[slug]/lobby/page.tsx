import type { CSSProperties } from "react"
import Link from "next/link"
import { getEventBySlug } from "@/lib/events"
import { getEventUserOrNull } from "@/lib/eventAuth"
import { supabaseAdmin } from "@/lib/supabase/admin"
import EventEmailGate from "../EventEmailGate"
import EventSpeakerCards from "@/components/EventSpeakerCards"
import { getPlaybackSource, parseSpeakerCards } from "@/lib/eventExperience"
import RemoteRefreshListener from "@/components/RemoteRefreshListener"
import { getEventLiveDestination, getEventLiveState } from "@/lib/app/liveState"
import type { EventAssignedWebinar, EventBreakout, EventWebinarAssignmentRow } from "@/lib/types"
import QASubmitBox from "@/components/qa/QASubmitBox"
import QAList from "@/components/qa/QAList"
import type { EventTheme, SectionBlock } from "@/lib/page-editor/sectionTypes"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

type StoredSection = {
  id: string
  type: string
  config?: Record<string, unknown> | null
  blocks?: SectionBlock[]
}

function isEventAssignedWebinar(value: EventAssignedWebinar | null): value is EventAssignedWebinar {
  return Boolean(value)
}

function normalizeSections(input: unknown): StoredSection[] {
  if (!Array.isArray(input)) return []

  return input.map((section: any, idx: number) => ({
    id:
      typeof section?.id === "string" && section.id.trim().length > 0
        ? section.id
        : `section-${idx + 1}`,
    type: typeof section?.type === "string" ? section.type : "content",
    config:
      section?.config && typeof section.config === "object" ? section.config : {},
    blocks: Array.isArray(section?.blocks) ? section.blocks : [],
  }))
}

function normalizeTheme(input: unknown): EventTheme | null {
  if (!input || typeof input !== "object") return null
  return input as EventTheme
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Schedule to be announced"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Schedule to be announced"
  return date.toLocaleString()
}

function getPageStyle(theme: EventTheme | null): CSSProperties {
  const colorA = theme?.gradientColorA || "#020617"
  const colorB = theme?.gradientColorB || "#0f172a"
  const angle = theme?.gradientAngle || "135deg"

  return {
    color: theme?.textColor || "#ffffff",
    backgroundColor: theme?.pageBackgroundColor || "#020617",
    backgroundImage: `linear-gradient(${angle}, ${colorA}, ${colorB})`,
  }
}

function getPanelStyle(theme: EventTheme | null): CSSProperties {
  return {
    backgroundColor: theme?.panelBackgroundColor || "rgba(255,255,255,0.04)",
    borderColor: theme?.panelBorderColor || "rgba(255,255,255,0.10)",
    color: theme?.textColor || "#ffffff",
  }
}

function getSectionStyle(section: StoredSection, theme: EventTheme | null): CSSProperties {
  const config = section.config ?? {}
  const themeMode = String(config.themeMode ?? "inherit")
  const fillType = String(config.sectionBackgroundFillType ?? "solid")

  if (themeMode !== "custom") {
    return getPanelStyle(theme)
  }

  const backgroundColor = String(config.sectionBackgroundColor ?? "")
  const borderColor = String(config.sectionBorderColor ?? "")
  const textColor = String(config.sectionTextColor ?? "")
  const gradientColorA = String(config.sectionGradientColorA ?? "")
  const gradientColorB = String(config.sectionGradientColorB ?? "")
  const gradientAngle = String(config.sectionGradientAngle ?? "135deg")

  const style: CSSProperties = {
    backgroundColor:
      fillType === "solid"
        ? backgroundColor || theme?.panelBackgroundColor || "rgba(255,255,255,0.04)"
        : undefined,
    borderColor: borderColor || theme?.panelBorderColor || "rgba(255,255,255,0.10)",
    color: textColor || theme?.textColor || "#ffffff",
  }

  if (fillType === "linear-gradient" && gradientColorA && gradientColorB) {
    style.backgroundImage = `linear-gradient(${gradientAngle}, ${gradientColorA}, ${gradientColorB})`
  }

  return style
}

function Card({
  title,
  href,
  description,
}: {
  title: string
  href: string
  description: string
}) {
  return (
    <Link
      href={href}
      className="block rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:bg-white/10"
    >
      <div className="font-semibold">{title}</div>
      <div className="mt-1 text-sm text-white/60">{description}</div>
      <div className="mt-3 text-xs text-sky-200">Open →</div>
    </Link>
  )
}

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint: string
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/15">
      <div className="text-[11px] uppercase tracking-[0.2em] text-white/40">{label}</div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
      <div className="mt-1 text-sm text-white/55">{hint}</div>
    </div>
  )
}

function renderRichTextBlock(block: Extract<SectionBlock, { type: "rich_text" }>) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      {block.props.title ? (
        <h3 className="text-lg font-semibold">{String(block.props.title)}</h3>
      ) : null}
      {block.props.body ? (
        <p className="mt-2 text-white/70">{String(block.props.body)}</p>
      ) : null}
    </div>
  )
}

function renderLobbyOverviewBlock(args: {
  eventTitle: string
  eventDescription?: string | null
  userEmail: string
  webinarsCount: number
}) {
  const { eventTitle, eventDescription, userEmail, webinarsCount } = args

  return (
    <section className="overflow-hidden rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.18),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.16),transparent_24%),linear-gradient(135deg,rgba(2,6,23,1),rgba(15,23,42,0.96),rgba(30,41,59,0.94))] p-6 shadow-2xl shadow-black/25">
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr] xl:items-end">
        <div>
          <div className="inline-flex items-center rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-medium text-white/75">
            Conference portal lobby
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight lg:text-4xl">{eventTitle}</h1>
          {eventDescription ? (
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70">{eventDescription}</p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-3 text-sm text-white/65">
            <div className="rounded-full border border-white/10 bg-black/20 px-3 py-2">
              Signed in as {userEmail}
            </div>
            <div className="rounded-full border border-white/10 bg-black/20 px-3 py-2">
              {webinarsCount} assigned session{webinarsCount === 1 ? "" : "s"}
            </div>
            <div className="rounded-full border border-white/10 bg-black/20 px-3 py-2">
              Homepage-style experience active
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-black/25 p-5">
          <div className="text-xs uppercase tracking-[0.2em] text-white/45">Lobby</div>
          <div className="mt-3 text-xl font-semibold">Welcome back</div>
          <div className="mt-2 text-sm text-white/60">
            Use this as the attendee launch point for sessions, agenda, QA, and breakouts.
          </div>
        </div>
      </div>
    </section>
  )
}

function renderNextUpBlock(args: {
  nextWebinar: EventAssignedWebinar | undefined
  slug: string
}) {
  const { nextWebinar, slug } = args

  return (
    <div className="rounded-3xl border border-white/10 bg-black/25 p-5">
      <div className="text-xs uppercase tracking-[0.2em] text-white/45">Next up</div>
      {nextWebinar ? (
        <>
          <div className="mt-3 text-xl font-semibold">{nextWebinar.title}</div>
          <div className="mt-2 text-sm text-white/60">{formatDate(nextWebinar.webinar_date)}</div>
          <div className="mt-2 text-sm text-white/55">
            {getPlaybackSource(nextWebinar)
              ? "Embedded watch available on the session page."
              : "External join flow available on the session page."}
          </div>
          <Link
            href={`/events/${slug}/webinars/${nextWebinar.id}`}
            className="mt-5 inline-flex rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-slate-100"
          >
            Watch now
          </Link>
        </>
      ) : (
        <div className="mt-3 text-sm text-white/60">
          No sessions are assigned yet. Your admin can seed one from Dev Tools.
        </div>
      )}
    </div>
  )
}

function renderLiveRoutingBlock(args: {
  liveDestination: ReturnType<typeof getEventLiveDestination>
  liveState: Awaited<ReturnType<typeof getEventLiveState>>
}) {
  const { liveDestination, liveState } = args

  return (
    <section className="rounded-3xl border border-emerald-400/20 bg-emerald-500/5 p-5 shadow-xl shadow-black/20">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200/80">
            Live routing
          </div>
          <div className="mt-2 text-xl font-semibold">{liveDestination.label}</div>
          <p className="mt-2 text-sm leading-6 text-white/65">{liveDestination.description}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white/65">
          <div>
            Mode: <span className="text-white">{liveState?.mode || "lobby"}</span>
          </div>
          <div className="mt-1">
            Destination: <span className="text-emerald-200">{liveDestination.href}</span>
          </div>
          <div className="mt-1">
            Redirect: <span className="text-white">{liveState?.force_redirect ? "On" : "Off"}</span>
          </div>
        </div>
      </div>
    </section>
  )
}

function renderSessionsPreviewBlock(args: {
  webinars: EventAssignedWebinar[]
  slug: string
}) {
  const { webinars, slug } = args

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl shadow-black/20">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Your sessions</h2>
          <p className="mt-1 text-sm text-white/55">
            A more polished conference-portal view with poster art, speaker info, and watch state.
          </p>
        </div>
        <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-white/50">
          {webinars.length} total
        </span>
      </div>

      {webinars.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-white/10 bg-black/20 p-6 text-sm text-white/60">
          No sessions are assigned to you yet. Once your admin adds sessions, they will appear here
          automatically.
        </div>
      ) : (
        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {webinars.map((w, index) => {
            const playback = getPlaybackSource(w)

            return (
              <article
                key={w.id}
                className="overflow-hidden rounded-3xl border border-white/10 bg-black/20 transition hover:bg-black/30"
              >
                <div className="relative aspect-[16/9] border-b border-white/10 bg-slate-900">
                  {w.thumbnail_url ? (
                    <img
                      src={w.thumbnail_url}
                      alt={w.title}
                      className="h-full w-full object-cover opacity-85"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.25),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.2),transparent_35%)]" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3">
                    <div>
                      <div className="rounded-full border border-white/10 bg-black/35 px-2.5 py-1 text-[11px] font-medium text-white/75">
                        Session {index + 1}
                      </div>
                      <div className="mt-3 text-lg font-semibold text-white">{w.title}</div>
                    </div>
                    <div className="rounded-full border border-white/10 bg-black/35 px-2.5 py-1 text-[11px] text-white/75">
                      {playback ? `Embedded ${playback.sourceType.toUpperCase()}` : "External join"}
                    </div>
                  </div>
                </div>

                <div className="p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    {w.tag ? (
                      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-white/55">
                        {w.tag}
                      </span>
                    ) : null}
                    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-white/55">
                      {formatDate(w.webinar_date)}
                    </span>
                  </div>

                  {w.description ? (
                    <p className="mt-3 text-sm leading-6 text-white/65">{w.description}</p>
                  ) : null}

                  {w.speaker ? (
                    <div className="mt-3 text-sm text-white/60">Speaker: {w.speaker}</div>
                  ) : null}

                  <Link
                    href={`/events/${slug}/webinars/${w.id}`}
                    className="mt-4 inline-flex rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold hover:bg-blue-500"
                  >
                    {playback ? "Watch session" : "Open session"}
                  </Link>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}

function renderMetricGridBlock(args: {
  webinars: EventAssignedWebinar[]
}) {
  const { webinars } = args

  return (
    <section className="grid gap-4 md:grid-cols-3">
      <MetricCard
        label="Sessions"
        value={String(webinars.length)}
        hint="Assigned to your event access"
      />
      <MetricCard
        label="Playback"
        value={String(webinars.filter((w) => Boolean(getPlaybackSource(w))).length)}
        hint="Ready for embedded watch"
      />
      <MetricCard
        label="Portal"
        value="Live"
        hint="Agenda, sponsors, chat, and library all linked here"
      />
    </section>
  )
}

function renderNavigationCardsBlock(args: {
  slug: string
}) {
  const { slug } = args

  return (
    <aside className="space-y-4">
      <Card
        title="Event home"
        href={`/events/${slug}`}
        description="Return to the homepage-style event landing screen."
      />
      <Card
        title="Agenda"
        href={`/events/${slug}/agenda`}
        description="See the main schedule and flow."
      />
      <Card
        title="Breakouts"
        href={`/events/${slug}/breakouts`}
        description="Open side-room content and smaller sessions."
      />
      <Card
        title="Chat"
        href={`/events/${slug}/chat`}
        description="Join event chat and attendee discussion."
      />
      <Card
        title="Networking"
        href={`/events/${slug}/networking`}
        description="View attendee networking spaces."
      />
      <Card
        title="On-demand library"
        href={`/events/${slug}/library`}
        description="Catch replay and support materials."
      />
    </aside>
  )
}

function renderQaBlock() {
  return (
    <div className="mx-auto mt-8 grid max-w-6xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <QASubmitBox roomKey="general" />
      <QAList roomKey="general" />
    </div>
  )
}

function renderBlock(
  block: SectionBlock,
  args: {
    event: { title: string; description?: string | null }
    user: { email?: string | null }
    slug: string
    webinars: EventAssignedWebinar[]
    nextWebinar: EventAssignedWebinar | undefined
    liveDestination: ReturnType<typeof getEventLiveDestination>
    liveState: Awaited<ReturnType<typeof getEventLiveState>>
  }
) {
  if (block.type === "rich_text") {
    return renderRichTextBlock(block)
  }

  if (block.type !== "system_component") {
    return null
  }

  switch (block.props.componentKey) {
    case "live_state":
      return renderLiveRoutingBlock({
        liveDestination: args.liveDestination,
        liveState: args.liveState,
      })

    case "sessions_list":
      return renderSessionsPreviewBlock({
        webinars: args.webinars,
        slug: args.slug,
      })

    case "countdown":
      return renderNextUpBlock({
        nextWebinar: args.nextWebinar,
        slug: args.slug,
      })

    case "speaker_cards":
      return null

    case "speaker_spotlight":
      return null

    case "agenda":
      return (
        <Card
          title="Agenda"
          href={`/events/${args.slug}/agenda`}
          description="See the main schedule and flow."
        />
      )

    case "access_gate":
      return (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-6 text-sm text-white/45">
          Access gate is only shown for signed-out users.
        </div>
      )

    case "featured_breakouts":
      return (
        <Card
          title="Breakouts"
          href={`/events/${args.slug}/breakouts`}
          description="Open side-room content and smaller sessions."
        />
      )

    case "stage_player":
      return (
        <Card
          title="Event home"
          href={`/events/${args.slug}`}
          description="Return to the homepage-style event landing screen."
        />
      )

    default:
      return (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-6 text-sm text-white/45">
          {String(block.props.componentKey)} preview is not enabled on this page yet.
        </div>
      )
  }
}

export default async function LobbyPage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params
  const event = await getEventBySlug(slug)

  const authed = await getEventUserOrNull({ slug })
  if (!authed) {
    return <EventEmailGate slug={slug} eventTitle={event.title} />
  }

  const { user } = authed

  const [{ data: rows }, { data: breakoutRows }, liveState, { data: eventRow }, { data: pageRow }] =
    await Promise.all([
      supabaseAdmin
        .from("event_user_webinars")
        .select(
          "webinar_id, webinars:webinar_id(id,title,description,webinar_date,tag,speaker,thumbnail_url,playback_type,playback_mp4_url,playback_m3u8_url,speaker_cards)"
        )
        .eq("event_id", event.id)
        .eq("user_id", user.id),
      supabaseAdmin
        .from("event_breakouts")
        .select(
          "id,event_id,title,description,join_link,start_at,end_at,speaker_name,speaker_avatar_url,manual_live,auto_open,created_at"
        )
        .eq("event_id", event.id),
      getEventLiveState(event.id),
      supabaseAdmin.from("events").select("event_theme").eq("id", event.id).maybeSingle(),
      supabaseAdmin
        .from("event_page_sections")
        .select("sections")
        .eq("event_id", event.id)
        .eq("page_key", "lobby")
        .maybeSingle(),
    ])

  const assignments = (rows ?? []) as unknown as EventWebinarAssignmentRow[]
  const webinars = assignments.map((row) => row.webinars).filter(isEventAssignedWebinar)

  const nextWebinar = [...webinars].sort((a, b) => {
    const aTime = a.webinar_date ? new Date(a.webinar_date).getTime() : Number.MAX_SAFE_INTEGER
    const bTime = b.webinar_date ? new Date(b.webinar_date).getTime() : Number.MAX_SAFE_INTEGER
    return aTime - bTime
  })[0]

  const liveDestination = getEventLiveDestination({
    slug,
    liveState,
    breakouts: (breakoutRows as EventBreakout[] | null) ?? [],
  })

  const speakers = parseSpeakerCards(
    ...webinars.map((w) => w.speaker_cards),
    ...webinars.map((w) => w.speaker)
  ).slice(0, 6)

  const eventTheme = normalizeTheme(eventRow?.event_theme)
  const sections = normalizeSections(pageRow?.sections)
  const hasSavedSections = sections.length > 0

  const blockArgs = {
    event,
    user,
    slug,
    webinars,
    nextWebinar,
    liveDestination,
    liveState,
  }

  if (!hasSavedSections) {
    return (
      <div className="space-y-6">
        <RemoteRefreshListener scopeType="event" scopeId={event.id} />

        {renderLiveRoutingBlock({
          liveDestination,
          liveState,
        })}

        {renderLobbyOverviewBlock({
          eventTitle: event.title,
          eventDescription: event.description,
          userEmail: user.email ?? "Unknown attendee",
          webinarsCount: webinars.length,
        })}

        {renderMetricGridBlock({ webinars })}

        <div className="grid gap-6 lg:grid-cols-[1.45fr_0.95fr]">
          {renderSessionsPreviewBlock({ webinars, slug })}
          {renderNavigationCardsBlock({ slug })}
        </div>

        {renderQaBlock()}

        <EventSpeakerCards speakers={speakers} title="Session speakers" compact />
      </div>
    )
  }

  return (
    <main className="min-h-screen text-white" style={getPageStyle(eventTheme)}>
      <RemoteRefreshListener scopeType="event" scopeId={event.id} />

      <div className="relative mx-auto max-w-6xl px-6 py-12">
        <div className="space-y-8">
          {sections
            .filter((section) => section.config?.visible !== false)
            .map((section) => {
              const config = section.config ?? {}
              const title = String(config.title ?? "")
              const body = String(config.body ?? "")

              if (section.type === "hero") {
                return (
                  <section
                    key={section.id}
                    className="rounded-3xl border p-8 md:p-10"
                    style={getSectionStyle(section, eventTheme)}
                  >
                    <div className="max-w-3xl">
                      {title ? (
                        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
                          {title}
                        </h1>
                      ) : (
                        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
                          {event.title}
                        </h1>
                      )}

                      {body ? (
                        <p className="mt-3 text-base text-white/70 md:text-lg">{body}</p>
                      ) : event.description ? (
                        <p className="mt-3 text-base text-white/70 md:text-lg">
                          {event.description}
                        </p>
                      ) : null}
                    </div>
                  </section>
                )
              }

              return (
                <section
                  key={section.id}
                  className="rounded-3xl border p-6 md:p-8"
                  style={getSectionStyle(section, eventTheme)}
                >
                  {title ? <h2 className="text-2xl font-semibold">{title}</h2> : null}
                  {body ? <p className="mt-2 text-white/70">{body}</p> : null}

                  <div className="mt-6 space-y-6">
                    {(section.blocks ?? []).map((block) => (
                      <div key={block.id}>{renderBlock(block, blockArgs)}</div>
                    ))}
                  </div>
                </section>
              )
            })}

          <EventSpeakerCards speakers={speakers} title="Session speakers" compact />
        </div>
      </div>
    </main>
  )
}