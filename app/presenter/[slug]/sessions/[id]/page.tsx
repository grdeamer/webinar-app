import { notFound } from "next/navigation"
import { getEventBySlug } from "@/lib/events"
import { getSessionById } from "@/lib/repos/sessionsRepo"
import SimplePresenterClient from "@/components/live/SimplePresenterClient"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export default async function PresenterSessionPage(props: {
  params: Promise<{ slug: string; id: string }>
}) {
  const { slug, id } = await props.params

  const event = await getEventBySlug(slug)
  if (!event) notFound()

  const session = await getSessionById(event.id, id)
  if (!session) notFound()

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-white/40">
            Presenter Test
          </div>
          <h1 className="mt-2 text-3xl font-semibold">{session.title}</h1>
          <p className="mt-2 text-sm text-white/60">
            This is a temporary presenter page for testing LiveKit publishing.
          </p>
        </div>

        <SimplePresenterClient
          tokenEndpoint={`/api/events/${slug}/sessions/${session.id}/live/presenter-token`}
        />
      </div>
    </div>
  )
}