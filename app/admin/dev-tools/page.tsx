import Link from "next/link"
import type { ReactNode } from "react"
import { ArrowRight, Check, ExternalLink, ShieldCheck } from "lucide-react"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const verificationSteps = [
  "Create the seeded event once.",
  "Open its attendee page and confirm the countdown.",
  "Enter the assigned attendee email.",
  "Review sponsors, agenda, breakouts, posters, and speakers.",
  "Open the session and verify embedded playback.",
]

export default async function AdminDevToolsPage(props: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const searchParams = props.searchParams ? await props.searchParams : {}
  const seeded = first(searchParams.seeded) === "1"
  const eventSlug = first(searchParams.event) || "test-event"
  const userEmail = first(searchParams.email) || "attendee@testevent.com"
  const webinarTitle = first(searchParams.webinar) || "Welcome Session"

  return (
    <main className="global-editorial-page mx-auto max-w-[1440px] pb-12">
      <header className="relative overflow-hidden border-b border-white/10 pb-9 pt-3">
        <div className="pointer-events-none absolute -right-16 -top-32 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(70,117,205,.16),rgba(65,40,90,.06)_48%,transparent_72%)] blur-2xl" />
        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-4xl">
            <div className="text-[10px] font-semibold uppercase tracking-[.26em] text-sky-300/70">
              System / Development tools
            </div>
            <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-[-.045em] text-white sm:text-5xl lg:text-6xl">
              Build the test.<br />Prove the experience.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-white/52">
              Create a complete event path for rehearsal—from attendee access and program content to artwork and playback.
            </p>
          </div>

          <div className="grid w-full max-w-md grid-cols-3 border-y border-white/10 py-4 lg:mb-1">
            <Metric label="Creates" value="Event" />
            <Metric label="Seeds" value="Portal" />
            <Metric label="Verifies" value="Playback" />
          </div>
        </div>
      </header>

      {seeded ? (
        <section className="mt-6 border-y border-emerald-300/18 bg-emerald-300/[.035] px-1 py-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex gap-4">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-emerald-300/20 bg-emerald-300/[.08] text-emerald-200">
                <Check size={15} />
              </span>
              <div>
                <div className="font-semibold text-emerald-100">Test event ready</div>
                <p className="mt-1 text-sm leading-6 text-white/52">
                  <span className="text-white/80">{eventSlug}</span> is assigned to {userEmail}, with {decodeURIComponent(webinarTitle)} ready for review.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href={`/events/${eventSlug}`} className="inline-flex items-center gap-2 rounded-xl bg-emerald-300 px-4 py-2.5 text-sm font-semibold text-[#03100c] transition hover:bg-emerald-200">
                Open event <ExternalLink size={14} />
              </Link>
              <Link href={`/events/${eventSlug}/lobby`} className="inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/[.035] px-4 py-2.5 text-sm font-medium text-white/72 transition hover:bg-white/[.07] hover:text-white">
                View lobby
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      <div className="dev-tools-workspace mt-8 grid xl:grid-cols-[minmax(0,1fr)_340px]">
        <form action="/api/admin/dev-tools/seed" method="post" className="dev-tools-workspace__form min-w-0">
          <div className="flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[.23em] text-white/34">Seed configuration</div>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-.025em] text-white">One controlled event flow</h2>
            </div>
            <div className="flex items-center gap-2 text-xs text-white/38">
              <ShieldCheck size={15} className="text-emerald-300/65" />
              Uses your current admin session
            </div>
          </div>

          <FormSection number="01" title="Event identity" description="The public name and permanent attendee path.">
            <Field label="Event title" name="eventTitle" defaultValue="Test Event" help="Displayed throughout the attendee experience" />
            <Field label="Event slug" name="eventSlug" defaultValue="test-event" help="URL-friendly and permanent" />
          </FormSection>

          <FormSection number="02" title="People and program" description="Create the attendee access record and first session.">
            <Field label="Attendee email" name="userEmail" defaultValue="attendee@testevent.com" help="Use this address to enter the event" />
            <Field label="Session title" name="webinarTitle" defaultValue="Welcome Session" help="Shown in the program and portal" />
            <Field label="Speaker name(s)" name="speaker" defaultValue="Jane Doe - Keynote Speaker" help="Separate multiple speakers with commas" className="md:col-span-2" />
          </FormSection>

          <FormSection number="03" title="Experience media" description="Optional production assets make the rehearsal behave like a live event.">
            <Field label="Poster or thumbnail URL" name="thumbnailUrl" placeholder="https://…/poster.jpg" help="Used in the lobby and session detail" className="md:col-span-2" />
            <Field label="MP4 playback URL" name="playbackMp4Url" placeholder="https://…/session.mp4" help="Direct embedded playback" />
            <Field label="HLS playback URL" name="playbackM3u8Url" placeholder="https://…/master.m3u8" help="Preferred for live or adaptive playback" />
            <Field label="Optional room link" name="joinLink" placeholder="https://example.com/live-room" help="Meeting, stream, or external room URL" className="md:col-span-2" />
          </FormSection>

          <div className="mt-8 flex flex-col gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-lg text-xs leading-5 text-white/34">
              Existing event and attendee records are reused safely. Empty events also receive starter agenda, sponsor, and breakout content.
            </p>
            <button className="inline-flex shrink-0 items-center justify-center gap-3 rounded-xl bg-[linear-gradient(90deg,#2274ff,#7654ff)] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_12px_34px_rgba(45,94,230,.22)] transition hover:brightness-110">
              Build test event <ArrowRight size={16} />
            </button>
          </div>
        </form>

        <aside className="dev-tools-workspace__verification">
          <div className="sticky top-8">
            <div className="text-[10px] font-semibold uppercase tracking-[.23em] text-sky-300/62">Verification run</div>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-.025em] text-white">Follow the signal</h2>
            <p className="mt-3 text-sm leading-6 text-white/45">A short operator path from seed to working playback.</p>

            <ol className="relative mt-8 space-y-0 before:absolute before:bottom-5 before:left-[15px] before:top-5 before:w-px before:bg-gradient-to-b before:from-sky-400/45 before:via-white/12 before:to-transparent">
              {verificationSteps.map((step, index) => (
                <li key={step} className="relative flex gap-4 pb-6 last:pb-0">
                  <span className="relative z-10 flex h-[31px] w-[31px] shrink-0 items-center justify-center rounded-full border border-sky-300/20 bg-[#07101f] text-[10px] font-semibold text-sky-200/78">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="pt-1 text-sm leading-6 text-white/58">{step}</span>
                </li>
              ))}
            </ol>

            <div className="mt-10 border-t border-white/10 pt-6">
              <div className="text-[10px] font-semibold uppercase tracking-[.22em] text-white/30">Default access</div>
              <div className="mt-4 space-y-3 text-sm text-white/52">
                <DetailRow label="Event" value="test-event" />
                <DetailRow label="Attendee" value="attendee@testevent.com" />
                <DetailRow label="Speaker" value="Jane Doe" />
              </div>
              <Link href="/events/test-event" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-sky-300/78 transition hover:text-sky-200">
                Open default event <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </main>
  )
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-l border-white/10 px-4 first:border-l-0 first:pl-0 last:pr-0">
      <div className="text-[9px] font-semibold uppercase tracking-[.2em] text-white/28">{label}</div>
      <div className="mt-2 text-sm font-semibold text-white/72">{value}</div>
    </div>
  )
}

function FormSection({
  number,
  title,
  description,
  children,
}: {
  number: string
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <section className="grid gap-6 border-b border-white/[.08] py-8 lg:grid-cols-[190px_minmax(0,1fr)]">
      <div>
        <div className="text-[10px] font-semibold tracking-[.18em] text-sky-300/58">{number}</div>
        <h3 className="mt-2 text-base font-semibold text-white/82">{title}</h3>
        <p className="mt-2 text-xs leading-5 text-white/34">{description}</p>
      </div>
      <div className="grid gap-x-4 gap-y-5 md:grid-cols-2">{children}</div>
    </section>
  )
}

function Field({
  label,
  name,
  defaultValue,
  placeholder,
  help,
  className,
}: {
  label: string
  name: string
  defaultValue?: string
  placeholder?: string
  help?: string
  className?: string
}) {
  return (
    <label className={`grid content-start gap-2 ${className || ""}`}>
      <span className="text-xs font-medium text-white/58">{label}</span>
      <input
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="dev-tools-field h-12 rounded-[11px] px-4 text-sm text-white/90 outline-none transition placeholder:text-white/22"
      />
      {help ? <span className="text-[11px] leading-4 text-white/30">{help}</span> : null}
    </label>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-white/[.07] pb-3">
      <span className="text-white/32">{label}</span>
      <span className="truncate text-right font-medium text-white/64">{value}</span>
    </div>
  )
}
