import type { ReactNode } from "react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { getEventUserOrNull } from "@/lib/eventAuth"
import { ClassMaterialsBubble, type Material } from "@/components/ClassMaterialsBubble"
import GeneralSessionPlayer from "@/components/GeneralSessionPlayer"
import EventSpeakerCards from "@/components/EventSpeakerCards"
import { getPlaybackSource, parseSpeakerCards } from "@/lib/eventExperience"
import RemoteRefreshListener from "@/components/RemoteRefreshListener"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)
}

async function toSignedUrl(maybeStorageUrl: string | null, expiresIn = 60 * 60) {
  if (!maybeStorageUrl) return null
  if (!maybeStorageUrl.startsWith("storage:")) return maybeStorageUrl

  const raw = maybeStorageUrl.replace("storage:", "")
  const firstSlash = raw.indexOf("/")
  if (firstSlash === -1) return null

  const bucket = raw.slice(0, firstSlash)
  const path = raw.slice(firstSlash + 1)

  const { data, error } = await supabaseAdmin.storage.from(bucket).createSignedUrl(path, expiresIn)
  if (error) return null
  return data.signedUrl
}

export default async function EventWebinarPage(props: {
  params: Promise<{ slug: string; webinarId: string }>
}) {
  const { slug, webinarId } = await props.params
  if (!isUuid(webinarId)) notFound()

  const authed = await getEventUserOrNull({ slug })
  if (!authed) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white/70">
        Please enter your event email to continue.
      </div>
    )
  }

  const { event, user } = authed

  const { data: allowed } = await supabaseAdmin
    .from("event_user_webinars")
    .select("webinar_id")
    .eq("event_id", event.id)
    .eq("user_id", (user as any).id)
    .eq("webinar_id", webinarId)
    .maybeSingle()

  if (!allowed) {
    return (
      <main className="space-y-4">
        <Link href={`/events/${slug}/lobby`} className="text-sm text-white/70 hover:text-white">
          ← Back to lobby
        </Link>
        <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-6 text-red-100">
          You are not assigned to this session for {event.title}.
        </div>
      </main>
    )
  }

  const { data: webinar, error } = await supabaseAdmin
    .from("webinars")
    .select("id,title,description,webinar_date,join_link,join_url,tag,speaker,presenter,agenda_pdf_url,materials,thumbnail_url,playback_type,playback_mp4_url,playback_m3u8_url,speaker_cards")
    .eq("id", webinarId)
    .maybeSingle()

  if (error || !webinar) notFound()

  const materialsRaw: Material[] = Array.isArray((webinar as any).materials)
    ? ((webinar as any).materials as Material[])
    : []

  const agendaSigned = await toSignedUrl((webinar as any).agenda_pdf_url ?? null)
  const materialsSigned: Material[] = await Promise.all(
    materialsRaw.map(async (m) => ({
      ...m,
      url: (await toSignedUrl(m.url)) ?? m.url,
    }))
  )

  const joinUrl =
    ((webinar as any).join_link as string | null) ??
    ((webinar as any).join_url as string | null) ??
    null

  const scheduleLabel = formatDate((webinar as any).webinar_date)
  const playback = getPlaybackSource(webinar)
  const posterUrl = (webinar as any).thumbnail_url as string | null
  const speakerCards = parseSpeakerCards((webinar as any).speaker_cards, (webinar as any).speaker, (webinar as any).presenter)

  return (
    <main className="space-y-6">
      <RemoteRefreshListener scopeType="event" scopeId={event.id} />
      <RemoteRefreshListener scopeType="webinar" scopeId={webinarId} />
      <section className="overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-br from-slate-900 via-indigo-950/70 to-sky-950/70 shadow-2xl shadow-black/25">
        <div className="grid gap-6 p-6 lg:grid-cols-[1.15fr_0.85fr] lg:p-8">
          <div>
            <Link href={`/events/${slug}/lobby`} className="text-sm text-white/65 hover:text-white">
              ← Back to lobby
            </Link>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-white/60">
              <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1">{event.title}</span>
              {(webinar as any).tag ? <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1">{(webinar as any).tag}</span> : null}
              <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-emerald-200">
                {playback ? `Watch now: ${playback.sourceType.toUpperCase()}` : joinUrl ? "External join ready" : "Waiting on media"}
              </span>
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight lg:text-4xl">{(webinar as any).title}</h1>
            {((webinar as any).speaker || (webinar as any).presenter || (webinar as any).webinar_date) ? (
              <div className="mt-4 flex flex-wrap gap-3 text-sm text-white/65">
                {(webinar as any).speaker ? <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2">Speaker: {(webinar as any).speaker}</span> : null}
                {!(webinar as any).speaker && (webinar as any).presenter ? <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2">Presenter: {(webinar as any).presenter}</span> : null}
                <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2">{scheduleLabel}</span>
              </div>
            ) : null}
            {(webinar as any).description ? (
              <p className="mt-5 max-w-3xl text-sm leading-7 text-white/70">{(webinar as any).description}</p>
            ) : null}
            <div className="mt-6 flex flex-wrap gap-3">
              {playback ? (
                <a href="#watch-now" className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-slate-100">
                  Watch now
                </a>
              ) : null}
              {joinUrl ? (
                <a href={joinUrl} target="_blank" rel="noopener noreferrer" className="rounded-2xl border border-white/10 bg-white/10 px-5 py-3 text-sm font-medium hover:bg-white/15">
                  Open external room ↗
                </a>
              ) : null}
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-white/10 bg-black/25">
            <div className="relative aspect-[16/10] bg-slate-900">
              {posterUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={posterUrl} alt={(webinar as any).title} className="h-full w-full object-cover opacity-90" />
              ) : (
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.24),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.18),transparent_35%)]" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4">
                <div className="text-xs uppercase tracking-[0.2em] text-white/45">Session access</div>
                <div className="mt-2 text-2xl font-semibold text-white">{playback ? "Embedded player ready" : joinUrl ? "External room ready" : "Media coming soon"}</div>
                <p className="mt-2 text-sm leading-6 text-white/65">
                  {playback
                    ? "This page now supports autoplay-safe watch-now playback directly inside the event experience."
                    : joinUrl
                      ? "Use the external room button to launch the webinar in a new tab."
                      : "Once the admin adds an MP4, HLS stream, or room URL, this page becomes your launch point."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-12">
        <section className="space-y-5 lg:col-span-8">
          <div id="watch-now" className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl shadow-black/20">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Watch now</h2>
                <p className="mt-1 text-sm text-white/55">Autoplay-safe playback starts muted when the browser allows it.</p>
              </div>
              <div className="text-sm text-white/55">{playback ? playback.sourceType.toUpperCase() : "External"}</div>
            </div>

            <div className="mt-4 overflow-hidden rounded-3xl border border-white/10 bg-black/40">
              {playback ? (
                <GeneralSessionPlayer
                  sourceType={playback.sourceType}
                  src={playback.src}
                  posterUrl={posterUrl}
                  autoPlay
                  title={(webinar as any).title}
                />
              ) : joinUrl ? (
                <div className="relative aspect-video">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.24),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.18),transparent_35%)]" />
                  <div className="relative flex h-full items-center justify-center p-6 text-center">
                    <div className="max-w-xl">
                      <div className="text-sm text-white/60">Ready when you are</div>
                      <div className="mt-3 text-2xl font-semibold lg:text-3xl">Open this webinar room</div>
                      <p className="mt-3 text-sm leading-6 text-white/65">
                        Your live meeting opens in a separate tab so you can keep this page available for agenda, materials, and event navigation.
                      </p>
                      <a
                        href={joinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-6 inline-flex items-center justify-center rounded-2xl bg-blue-600 px-6 py-3 text-sm font-semibold hover:bg-blue-500"
                      >
                        Launch session ↗
                      </a>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative aspect-video">
                  <div className="relative flex h-full items-center justify-center p-6 text-center">
                    <div className="max-w-xl">
                      <div className="text-sm text-white/55">No stream link yet</div>
                      <div className="mt-3 text-2xl font-semibold">This session is not live yet.</div>
                      <p className="mt-3 text-sm leading-6 text-white/60">
                        Once the admin adds an MP4, HLS stream, or meeting link, this page becomes your quick launch point.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {(webinar as any).description ? (
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <h3 className="text-sm font-semibold text-white/80">About this session</h3>
              <p className="mt-2 text-sm leading-7 text-white/68">{(webinar as any).description}</p>
            </div>
          ) : null}
        </section>

        <aside className="space-y-4 lg:col-span-4">
          <Panel title="Your access">
            <p className="text-sm text-white/60">Signed in as {(user as any).email}</p>
            <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-xs leading-6 text-white/50">
              This page only appears because your email is assigned to this event session.
            </div>
          </Panel>

          <Panel title="Agenda & materials">
            <div className="space-y-3">
              {agendaSigned ? (
                <a
                  href={agendaSigned}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm hover:bg-black/30"
                >
                  Agenda PDF ↗
                </a>
              ) : (
                <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/50">No agenda uploaded yet.</div>
              )}

              <ClassMaterialsBubble materials={materialsSigned} />
            </div>
          </Panel>

          <Panel title="Quick links">
            <div className="space-y-2">
              <QuickLink href={`/events/${slug}`}>Event home</QuickLink>
              <QuickLink href={`/events/${slug}/lobby`}>Back to lobby</QuickLink>
              <QuickLink href={`/events/${slug}/agenda`}>Full agenda</QuickLink>
            </div>
          </Panel>
        </aside>
      </div>

      <EventSpeakerCards speakers={speakerCards} title="Speaker cards" compact />
      </main>
  )
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl shadow-black/20">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  )
}

function QuickLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="block rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm hover:bg-black/30">
      {children}
    </Link>
  )
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Schedule to be announced"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Schedule to be announced"
  return date.toLocaleString()
}