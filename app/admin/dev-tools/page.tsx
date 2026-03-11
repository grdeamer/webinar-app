import Link from "next/link"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export default async function AdminDevToolsPage(props: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const searchParams = props.searchParams ? await props.searchParams : {}
  const seeded = first(searchParams.seeded) === "1"
  const eventSlug = first(searchParams.event) || "test-event"
  const userEmail = first(searchParams.email) || "attendee@testevent.com"
  const webinarTitle = first(searchParams.webinar) || "Welcome Session"

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white lg:px-10">
      <section className="overflow-hidden rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.18),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.16),transparent_26%),linear-gradient(135deg,rgba(2,6,23,1),rgba(15,23,42,0.96),rgba(30,41,59,0.94))] p-7 shadow-2xl shadow-black/25">
        <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <div>
            <div className="inline-flex items-center rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-medium text-white/75">
              Dev Tools · v6 seeding
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight lg:text-4xl">Seed a polished event portal flow</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-white/68">
              Create an event, attendee, webinar, poster art, autoplay-safe playback URLs, and access assignment in one shot.
              This is the fastest way to verify the homepage-style landing page, conference portal lobby, and embedded session player.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard label="Creates" value="Event" />
            <StatCard label="Seeds" value="Poster" />
            <StatCard label="Tests" value="Playback" />
          </div>
        </div>
      </section>

      {seeded ? (
        <section className="mt-6 rounded-3xl border border-emerald-400/20 bg-emerald-500/10 p-5 shadow-lg shadow-emerald-950/20">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-sm font-semibold text-emerald-200">Success — your v6 test flow is ready.</div>
              <p className="mt-2 text-sm text-emerald-50/90">
                Seeded event <span className="font-semibold">{eventSlug}</span>, attendee <span className="font-semibold">{userEmail}</span>, and session <span className="font-semibold">{decodeURIComponent(webinarTitle)}</span>.
              </p>
              <p className="mt-2 text-xs text-emerald-100/70">
                Next step: open the event page, enter the attendee email, and verify the landing screen, lobby posters, speaker cards, and embedded watch-now behavior.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href={`/events/${eventSlug}`} className="rounded-xl bg-emerald-300 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-200">
                Open seeded event
              </Link>
              <Link href={`/events/${eventSlug}/lobby`} className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/15">
                Go to lobby
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <form action="/api/admin/dev-tools/seed" method="post" className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/20">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Create seeded event flow</h2>
              <p className="mt-2 max-w-2xl text-sm text-white/60">
                Existing event and user records are reused when possible, while a fresh webinar session is added for testing.
                Add poster art and playback URLs here so your attendee experience feels close to production. v7 also seeds homepage sponsors, agenda, and breakout tiles when the event is empty.
              </p>
            </div>
            <div className="hidden rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-right text-xs text-white/50 md:block">
              Uses your current admin login cookie
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Field label="Event slug" name="eventSlug" defaultValue="test-event" help="URL-friendly event path" />
            <Field label="Event title" name="eventTitle" defaultValue="Test Event" help="Display name on the homepage and lobby" />
            <Field label="User email" name="userEmail" defaultValue="attendee@testevent.com" help="Use this to enter the event" />
            <Field label="Webinar title" name="webinarTitle" defaultValue="Welcome Session" help="Session title shown in the portal" />
            <Field label="Speaker name(s)" name="speaker" defaultValue="Jane Doe - Keynote Speaker" help="Comma-separated is fine" className="md:col-span-2" />
            <Field label="Poster / thumbnail URL" name="thumbnailUrl" placeholder="https://.../poster.jpg" help="Shown on the lobby and session page" className="md:col-span-2" />
            <Field label="Embedded MP4 URL" name="playbackMp4Url" placeholder="https://.../session.mp4" help="Optional direct playback" className="md:col-span-2" />
            <Field label="Embedded HLS .m3u8 URL" name="playbackM3u8Url" placeholder="https://.../master.m3u8" help="Preferred for live playback when available" className="md:col-span-2" />
            <Field label="Optional join link" name="joinLink" placeholder="https://example.com/live-room" help="Paste a meeting, stream, or room URL" className="md:col-span-2" />
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-slate-100">
              Create test user + webinar + assignment
            </button>
            <Link href="/events/test-event" className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm hover:bg-white/10">
              Open default test event
            </Link>
          </div>

          <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4 text-xs leading-6 text-white/55">
            This tool creates or reuses: <span className="text-white/85">event</span>, <span className="text-white/85">user</span>, <span className="text-white/85">global webinar assignment</span>, <span className="text-white/85">event-scoped webinar assignment</span>, seeded <span className="text-white/85">agenda/sponsor/breakout content</span>, and optional <span className="text-white/85">poster/playback fields</span>.
          </div>
        </form>

        <aside className="space-y-4">
          <InfoCard
            title="Recommended v6 test flow"
            items={[
              "Run this seed once.",
              "Open the event home page and confirm the countdown block.",
              "Enter the seeded attendee email.",
              "Confirm the homepage countdown, sponsor carousel, breakout tiles, lobby posters, and speaker cards.",
              "Open the session page and test embedded playback.",
            ]}
          />
          <InfoCard
            title="Good default values"
            items={[
              "Event slug: test-event",
              "Attendee email: attendee@testevent.com",
              "Speaker: Jane Doe - Keynote Speaker",
              "Add poster and MP4/HLS URLs when available",
            ]}
          />
        </aside>
      </section>
    </main>
  )
}

function first(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
      <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">{label}</div>
      <div className="mt-1 text-lg font-semibold text-white">{value}</div>
    </div>
  )
}

function Field({ label, name, defaultValue, placeholder, help, className }: { label: string; name: string; defaultValue?: string; placeholder?: string; help?: string; className?: string }) {
  return (
    <label className={`grid gap-2 text-sm ${className || ""}`}>
      <span className="text-white/75">{label}</span>
      <input
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none ring-0 transition focus:border-sky-400/40 focus:bg-black/40"
      />
      {help ? <span className="text-xs text-white/45">{help}</span> : null}
    </label>
  )
}

function InfoCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl shadow-black/20">
      <h3 className="text-sm font-semibold text-white/85">{title}</h3>
      <ul className="mt-3 space-y-2 text-sm text-white/60">
        {items.map((item) => (
          <li key={item} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}
