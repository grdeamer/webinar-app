import Link from "next/link"
import { notFound } from "next/navigation"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { ClassMaterialsBubble, type Material } from "@/components/ClassMaterialsBubble"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v
  )
}

async function toSignedUrl(maybeStorageUrl: string | null, expiresIn = 60 * 60) {
  if (!maybeStorageUrl) return null
  if (!maybeStorageUrl.startsWith("storage:")) return maybeStorageUrl

  const raw = maybeStorageUrl.replace("storage:", "")
  const firstSlash = raw.indexOf("/")
  if (firstSlash === -1) return null

  const bucket = raw.slice(0, firstSlash)
  const path = raw.slice(firstSlash + 1)

  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn)

  if (error) return null
  return data.signedUrl
}

export default async function WebinarDetailsPage(props: {
  params: Promise<{ id: string }>
}) {
  const { id } = await props.params

  if (!id || typeof id !== "string" || !isUuid(id)) notFound()

  const { data: webinar, error } = await supabaseAdmin
    .from("webinars")
    .select("*")
    .eq("id", id)
    .single()

  if (error || !webinar) notFound()

  const materialsRaw: Material[] = (webinar.materials ?? []) as Material[]
  const agendaSigned = await toSignedUrl(webinar.agenda_pdf_url)

  const materialsSigned: Material[] = await Promise.all(
    materialsRaw.map(async (m) => ({
      ...m,
      url: (await toSignedUrl(m.url)) ?? m.url,
    }))
  )

  // If you store any kind of “watch/join” link, we’ll surface it here:
  const joinUrl: string | null =
    (webinar.join_link as string | null) ??
    (webinar.join_url as string | null) ??
    null

  const title = (webinar.title as string | null) ?? "Webinar"
  const desc = (webinar.description as string | null) ?? null

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto w-full max-w-6xl px-6 py-8">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-4">
          <Link href="/my-webinars" className="text-white/70 hover:text-white transition">
            ← Back
          </Link>

          <div className="flex items-center gap-2">
            {agendaSigned ? (
              <a
                href={agendaSigned}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 transition"
              >
                Agenda PDF <span aria-hidden>↗</span>
              </a>
            ) : null}

            <ClassMaterialsBubble materials={materialsSigned} />
          </div>
        </div>

        {/* Title */}
        <div className="mt-8">
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          {webinar.speaker ? (
            <p className="mt-2 text-sm text-white/60">
              {(webinar.speaker as string) || ""}
            </p>
          ) : null}
        </div>

        {/* Two-column layout */}
        <div className="mt-8 grid gap-6 lg:grid-cols-12">
          {/* LEFT: Player + Description */}
          <section className="lg:col-span-8 space-y-4">
            {/* Player card */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">Video</h2>
                <span className="text-xs text-white/50">
                  {webinar.tag ? (webinar.tag as string) : "Session"}
                </span>
              </div>

              <div className="mt-3 aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-black/40">
                {/* Minimal “player” behavior:
                    - If you have a join/watch link, show a nice “Open” overlay button.
                    - Otherwise, show a placeholder (you can swap this for your real player later).
                */}
                <div className="relative h-full w-full flex items-center justify-center">
                  <div className="absolute inset-0 bg-gradient-to-br from-black/10 to-black/40" />

                  {joinUrl ? (
                    <div className="relative text-center px-6">
                      <div className="text-sm text-white/60">Ready when you are</div>
                      <div className="mt-2 text-xl font-semibold">Open the webinar stream</div>
                      <a
                        href={joinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold hover:bg-indigo-500 transition"
                      >
                        Open stream <span className="ml-2" aria-hidden>↗</span>
                      </a>
                      <div className="mt-2 text-xs text-white/50">
                        Opens in a new tab
                      </div>
                    </div>
                  ) : (
                    <div className="relative text-center px-6">
                      <div className="text-sm text-white/60">No stream link set</div>
                      <div className="mt-2 text-xl font-semibold">Player coming soon</div>
                      <div className="mt-3 text-xs text-white/50">
                        Add a <code className="px-1 py-0.5 rounded bg-white/10">join_link</code> to this webinar to enable a one-click “Open stream” button.
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              {desc ? (
                <div className="mt-4">
                  <h3 className="text-sm font-semibold text-white/80">About</h3>
                  <p className="mt-2 text-sm text-white/70 leading-relaxed">{desc}</p>
                </div>
              ) : null}
            </div>
          </section>

          {/* RIGHT: Agenda + Materials + Q&A */}
          <aside className="lg:col-span-4 space-y-4">
            {/* Agenda */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <h2 className="text-sm font-semibold text-white/80">Agenda</h2>
              <p className="mt-1 text-xs text-white/50">
                PDF you can open anytime.
              </p>

              {agendaSigned ? (
                <a
                  href={agendaSigned}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 transition"
                >
                  Open agenda PDF <span aria-hidden>↗</span>
                </a>
              ) : (
                <div className="mt-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/60">
                  No agenda uploaded.
                </div>
              )}
            </div>

            {/* Materials */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <h2 className="text-sm font-semibold text-white/80">Materials</h2>
              <p className="mt-1 text-xs text-white/50">
                Links + files for attendees.
              </p>

              <div className="mt-3">
                <ClassMaterialsBubble materials={materialsSigned} />
              </div>
            </div>

            {/* Q&A placeholder (safe: won’t break build) */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <h2 className="text-sm font-semibold text-white/80">Q&amp;A</h2>
              <p className="mt-1 text-xs text-white/50">
                (Next) Add a per-webinar Q&amp;A room keyed by this webinar ID.
              </p>

              <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-white/70">
                Coming next: attendee questions + admin moderation + featured overlay.
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  )
}