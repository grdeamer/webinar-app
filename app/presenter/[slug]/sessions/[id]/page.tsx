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
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-5xl px-6 py-10">
        {/* Header */}
        <div className="mb-8 rounded-3xl border border-white/10 bg-white/[0.04] p-6">
          <div className="text-xs uppercase tracking-[0.18em] text-violet-200/50">
            Backstage
          </div>
          <h1 className="mt-2 text-3xl font-semibold">{session.title}</h1>
          <p className="mt-2 max-w-2xl text-sm text-white/60">
            You are in the presenter room. Your camera and microphone are not live to the audience until the producer brings you on stage.
          </p>
        </div>

        {/* Status Strip */}
        <div className="mb-6 flex items-center gap-3 text-sm">
          <span className="flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-emerald-200">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Connected
          </span>

          <span className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-white/70">
            Backstage
          </span>
        </div>

        {/* Video / LiveKit */}
        <div className="rounded-3xl border border-white/10 bg-black/40 p-4">
          <div className="mb-3 text-xs uppercase tracking-[0.18em] text-white/40">
            Camera Preview
          </div>

          <div className="rounded-2xl overflow-hidden border border-white/10">
            <SimplePresenterClient
              tokenEndpoint={`/api/events/${slug}/sessions/${session.id}/live/presenter-token`}
            />
          </div>
        </div>

        {/* Production Note */}
        <div className="mt-6 rounded-2xl border border-violet-300/20 bg-violet-500/10 p-4 text-sm text-violet-100/80">
          Join at least 15 minutes early so the production team can confirm your camera, microphone, and connection before going live.
        </div>
      </div>
    </div>
  )
}