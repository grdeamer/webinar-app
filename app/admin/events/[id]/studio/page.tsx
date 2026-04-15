import Link from "next/link"
import { supabaseAdmin } from "@/lib/supabase/admin"
import EventAdminNav from "@/components/admin/EventAdminNav"
import StudioSidebarNav from "@/components/admin/StudioSidebarNav"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type StudioTool = {
  title: string
  description: string
  href: string
}

type WorkspaceContent = {
  eyebrow: string
  title: string
  body: string
  primaryHref: string
  primaryLabel: string
  secondaryHref: string
  secondaryLabel: string
}

export default async function AdminStudioPage(props: {
  params: Promise<{ id: string }>
  searchParams?: Promise<{ tool?: string }>
}) {
  const { id } = await props.params
  const searchParams = props.searchParams ? await props.searchParams : undefined
  const eventId = id

  const { data: event } = await supabaseAdmin
    .from("events")
    .select("id, name, slug")
    .eq("id", eventId)
    .single()

  const eventName = event?.name ?? "Event"
  const eventSlug = event?.slug ?? eventId

  const studioBase = `/admin/events/${eventId}/studio`
  const fullBuilderHref = `/admin/page-editor/event/${eventSlug}`
  const embeddedBuilderHref = `/embed/page-editor/event/${eventSlug}`

  const tools: StudioTool[] = [
    {
      title: "Experience",
      description: "Edit the attendee-facing event pages and layouts.",
      href: `${studioBase}?tool=experience`,
    },
    {
      title: "Broadcast",
      description: "Open the producer room and control the live stage.",
      href: `${studioBase}?tool=broadcast`,
    },
    {
      title: "Audience Flow",
      description: "Control where attendees are sent during the event.",
      href: `${studioBase}?tool=audience-flow`,
    },
    {
      title: "Scenes",
      description: "Manage saved stage looks and reusable layouts.",
      href: `${studioBase}?tool=scenes`,
    },
    {
      title: "Graphics",
      description: "Manage overlays and on-air visual elements.",
      href: `${studioBase}?tool=graphics`,
    },
  ]

  const selectedTool = searchParams?.tool ?? "experience"

  const workspaceByTool: Record<string, WorkspaceContent> = {
    experience: {
      eyebrow: "Experience",
      title: `Design the attendee experience for ${eventName}`,
      body:
        "Shape the event pages, layout, and attendee-facing flow without leaving Studio. This is the first step in turning Studio into the real home of Jupiter.",
      primaryHref: fullBuilderHref,
      primaryLabel: "Open Full Experience",
      secondaryHref: `${studioBase}?tool=broadcast`,
      secondaryLabel: "Go to Broadcast",
    },
    broadcast: {
      eyebrow: "Broadcast",
      title: `Control the live show for ${eventName}`,
      body:
        "Open the producer room to manage the stage, presenters, layouts, and the live switching workflow.",
      primaryHref: `/admin/events/${eventId}/producer/room`,
      primaryLabel: "Open Broadcast",
      secondaryHref: `${studioBase}?tool=scenes`,
      secondaryLabel: "Go to Scenes",
    },
    "audience-flow": {
      eyebrow: "Audience Flow",
      title: `Direct where attendees go during ${eventName}`,
      body:
        "Manage routing so attendees are sent to the right destination at the right time during the event.",
      primaryHref: `/admin/events/${eventId}/routing`,
      primaryLabel: "Open Audience Flow",
      secondaryHref: `${studioBase}?tool=experience`,
      secondaryLabel: "Back to Experience",
    },
    scenes: {
      eyebrow: "Scenes",
      title: `Manage stage scenes for ${eventName}`,
      body:
        "Create and reuse saved stage looks so your live production can move quickly and stay consistent.",
      primaryHref: `/admin/events/${eventId}/producer/scenes`,
      primaryLabel: "Open Scenes",
      secondaryHref: `${studioBase}?tool=graphics`,
      secondaryLabel: "Go to Graphics",
    },
    graphics: {
      eyebrow: "Graphics",
      title: `Prepare on-air graphics for ${eventName}`,
      body:
        "Manage overlays, lower thirds, and visual elements that support the live show experience.",
      primaryHref: `/admin/events/${eventId}/producer/overlays`,
      primaryLabel: "Open Graphics",
      secondaryHref: `${studioBase}?tool=broadcast`,
      secondaryLabel: "Back to Broadcast",
    },
  }

  const workspace =
    workspaceByTool[selectedTool] ?? workspaceByTool["experience"]

  const isExperience = selectedTool === "experience"

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="w-full px-4 py-8 xl:px-6 2xl:px-8">
        <EventAdminNav eventId={eventId} />

        <div className="mt-8 grid gap-6 xl:grid-cols-[220px_minmax(0,1fr)_300px] 2xl:grid-cols-[240px_minmax(0,1fr)_320px]">
          <aside className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-white/40">
              Jupiter Studio
            </div>
            <h1 className="mt-3 text-2xl font-semibold">Studio</h1>
            <p className="mt-2 text-sm leading-6 text-white/60">
              A unified workspace for designing the event experience and
              controlling the live show.
            </p>

            <StudioSidebarNav
              tools={tools.map(({ title, href }) => ({ title, href }))}
            />
          </aside>

          <main className="min-w-0 rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <div className="text-xs uppercase tracking-[0.18em] text-white/40">
              {workspace.eyebrow}
            </div>

            <h2 className="mt-3 text-3xl font-semibold">{workspace.title}</h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/60">
              {workspace.body}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={workspace.primaryHref}
                className="rounded-2xl bg-white px-5 py-3 text-sm font-medium text-slate-950 transition hover:bg-white/90"
              >
                {workspace.primaryLabel}
              </Link>

              <Link
                href={workspace.secondaryHref}
                className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-medium text-white/80 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
              >
                {workspace.secondaryLabel}
              </Link>
            </div>

            {isExperience ? (
              <div className="mt-8 overflow-hidden rounded-3xl border border-white/10 bg-slate-900/70">
                <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                  <div>
                    <div className="text-sm font-medium text-white">
                      Experience Workspace
                    </div>
                    <div className="text-xs text-white/50">
                      Embedded page builder inside Studio
                    </div>
                  </div>

                  <Link
                    href={fullBuilderHref}
                    className="rounded-xl border border-white/10 px-3 py-2 text-xs font-medium text-white/80 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
                  >
                    Open full page builder
                  </Link>
                </div>

                <div className="h-[calc(100vh-260px)] min-h-[900px] bg-slate-950">
                  <iframe
                    src={embeddedBuilderHref}
                    title="Jupiter Experience Builder"
                    className="h-full w-full"
                  />
                </div>
              </div>
            ) : (
              <div className="mt-8 grid gap-4 md:grid-cols-2">
                {tools.map((tool) => (
                  <Link
                    key={tool.title}
                    href={tool.href}
                    className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 transition hover:border-white/20 hover:bg-white/[0.07]"
                  >
                    <div className="text-lg font-semibold text-white">
                      {tool.title}
                    </div>
                    <div className="mt-2 text-sm leading-6 text-white/60">
                      {tool.description}
                    </div>
                    <div className="mt-5 text-sm font-medium text-sky-200">
                      Open →
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </main>

          <aside className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <div className="text-xs uppercase tracking-[0.18em] text-white/40">
              Preview
            </div>
            <h2 className="mt-3 text-xl font-semibold">Control Sidecar</h2>
            <p className="mt-2 text-sm leading-6 text-white/60">
              This panel will evolve into the persistent sidecar for preview,
              live state, and context-aware actions.
            </p>

            <div className="mt-6 rounded-3xl border border-dashed border-white/10 bg-slate-900/60 p-6">
              <div className="aspect-video rounded-2xl border border-white/10 bg-black/40" />

              <div className="mt-5 space-y-4">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                    Current Tool
                  </div>
                  <div className="mt-2 text-sm font-medium text-white">
                    {workspace.eyebrow}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                    Suggested Next Step
                  </div>
                  <div className="mt-2 text-sm text-white/70">
                    {workspace.secondaryLabel}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                    Quick Actions
                  </div>

                  <div className="mt-3 space-y-2">
                    <Link
                      href={workspace.primaryHref}
                      className="block rounded-xl border border-white/10 px-3 py-2 text-sm text-white/80 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
                    >
                      {workspace.primaryLabel}
                    </Link>

                    <Link
                      href={workspace.secondaryHref}
                      className="block rounded-xl border border-white/10 px-3 py-2 text-sm text-white/80 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
                    >
                      {workspace.secondaryLabel}
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}