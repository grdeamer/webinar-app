import Link from "next/link"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function EventEmailsPage({ params }: PageProps) {
  await params

  return (
    <div className="space-y-6 text-white">
      <section className="rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.16),transparent_38%),rgba(255,255,255,0.04)] p-8">
        <div className="text-xs uppercase tracking-[0.18em] text-violet-100/50">
          Email Center
        </div>

        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Event Emails</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/60">
              Prepare, validate, and launch event communications from one
              controlled workspace.
            </p>
          </div>

          <Link
            href="/admin/import"
            className="w-fit rounded-xl border border-violet-300/20 bg-violet-300/10 px-4 py-2 text-sm font-semibold text-violet-100 transition hover:bg-violet-300/15"
          >
            Open Send Console
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Delivery" value="Ready" detail="Resend mail transport" />
        <MetricCard label="Preflight" value="Active" detail="Recipient review available" />
        <MetricCard label="Talent Access" value="Enabled" detail="Presenter link workflow" />
      </section>

      <section className="space-y-3">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-white/35">
            Campaigns
          </div>
          <h2 className="mt-1 text-xl font-semibold">Production Sends</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <ActionCard
            href="/admin/import"
            eyebrow="Audience"
            title="Attendee Confirmations"
            description="Send confirmed registrants the event details they need to attend."
            action="Prepare send"
          />

          <ActionCard
            href="/admin/import"
            eyebrow="Talent"
            title="Presenter Access"
            description="Issue secure presenter links for speakers assigned to the event."
            action="Prepare links"
          />

          <ActionCard
            href="/admin/import"
            eyebrow="Control"
            title="Recipient Review"
            description="Inspect the recipient list before any production email goes out."
            action="Review list"
          />
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-white/35">
            Preflight
          </div>
          <h2 className="mt-1 text-xl font-semibold">Test Before Launch</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <ActionCard
            href="/admin/import"
            eyebrow="Audience Test"
            title="Confirmation Test"
            description="Preview the attendee confirmation flow before sending to registrants."
            action="Run test"
          />

          <ActionCard
            href="/admin/import"
            eyebrow="Talent Test"
            title="Presenter Link Test"
            description="Verify the presenter access email before sending it to speakers."
            action="Run test"
          />
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
        <div className="text-sm font-semibold text-white">Operator Note</div>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-white/60">
          Sending currently runs through the shared import console so production
          email behavior stays consistent. This workspace is the event-level
          control surface for those communication workflows.
        </p>
      </section>
    </div>
  )
}

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string
  value: string
  detail: string
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <div className="text-xs uppercase tracking-[0.14em] text-white/40">{label}</div>
      <div className="mt-3 text-2xl font-semibold text-white">{value}</div>
      <div className="mt-1 text-sm text-white/50">{detail}</div>
    </div>
  )
}

function ActionCard({
  href,
  eyebrow,
  title,
  description,
  action,
}: {
  href: string
  eyebrow: string
  title: string
  description: string
  action: string
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-white/10 bg-black/20 p-5 transition hover:border-violet-300/25 hover:bg-violet-400/10"
    >
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-100/45">
        {eyebrow}
      </div>
      <div className="mt-3 text-base font-semibold text-white">{title}</div>
      <div className="mt-2 text-sm leading-6 text-white/60">{description}</div>
      <div className="mt-5 text-sm font-semibold text-sky-200 transition group-hover:text-sky-100">
        {action} →
      </div>
    </Link>
  )
}