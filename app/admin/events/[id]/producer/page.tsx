import Link from "next/link"
import EventAdminNav from "@/components/admin/EventAdminNav"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export default async function AdminProducerPage(props: {
  params: Promise<{ id: string }>
}) {
  const { id } = await props.params
  const eventId = id
  const base = `/admin/events/${eventId}/producer`

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-8 text-white">
      <div className="mx-auto max-w-7xl space-y-8">
        <EventAdminNav eventId={eventId} />

        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-white/40">
            Broadcast Control
          </div>
          <h1 className="mt-2 text-3xl font-semibold">Mission Control</h1>
          <p className="mt-2 text-sm text-white/60">
            Access your producer tools without typing direct URLs.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <ControlCard
            href={`${base}/room`}
            title="Producer Room"
            description="Open the live switching interface for stage control."
          />

          <ControlCard
            href={`/admin/events/${eventId}/routing`}
            title="Live Routing"
            description="Control where attendees are sent during the event."
          />

          <ControlCard
            href={`${base}/scenes`}
            title="Scenes"
            description="Manage saved stage looks and reusable layouts."
          />

          {/* ✅ NEW: Studio entry point */}
          <ControlCard
            href={`/admin/events/${eventId}/studio`}
            title="Studio"
            description="Open the unified workspace for experience design and live production."
          />

          <ControlCard
            href={`${base}/overlays`}
            title="Overlays"
            description="Future home for graphics, lower thirds, and on-air elements."
          />
        </div>
      </div>
    </div>
  )
}

function ControlCard({
  href,
  title,
  description,
  newTab = false,
}: {
  href: string
  title: string
  description: string
  newTab?: boolean
}) {
  return (
    <Link
      href={href}
      target={newTab ? "_blank" : undefined}
      rel={newTab ? "noreferrer" : undefined}
      className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 transition hover:border-white/20 hover:bg-white/[0.07]"
    >
      <div className="text-lg font-semibold text-white">{title}</div>
      <div className="mt-2 text-sm leading-6 text-white/60">
        {description}
      </div>
      <div className="mt-5 text-sm font-medium text-sky-200">
        {newTab ? "Open in new tab →" : "Open →"}
      </div>
    </Link>
  )
}