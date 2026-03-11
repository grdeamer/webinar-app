import type { SpeakerCard } from "@/lib/eventExperience"

export default function EventSpeakerCards(props: {
  speakers: SpeakerCard[]
  title?: string
  compact?: boolean
}) {
  const { speakers, title = "Featured speakers", compact = false } = props
  if (!speakers.length) return null

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl shadow-black/20">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-white/55">Meet the people featured in this experience.</p>
        </div>
        <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-white/45">
          {speakers.length} speaker{speakers.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className={`mt-5 grid gap-4 ${compact ? "md:grid-cols-2" : "md:grid-cols-2 xl:grid-cols-3"}`}>
        {speakers.map((speaker) => (
          <article key={`${speaker.name}-${speaker.role || "speaker"}`} className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-sky-500/30 to-violet-500/30 text-sm font-semibold text-white">
                {speaker.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={speaker.imageUrl} alt={speaker.name} className="h-full w-full object-cover" />
                ) : (
                  initials(speaker.name)
                )}
              </div>
              <div className="min-w-0">
                <div className="text-base font-semibold text-white">{speaker.name}</div>
                {speaker.role ? <div className="mt-1 text-sm text-sky-200">{speaker.role}</div> : null}
                {speaker.company ? <div className="mt-1 text-sm text-white/55">{speaker.company}</div> : null}
              </div>
            </div>
            {speaker.bio ? <p className="mt-4 text-sm leading-6 text-white/62">{speaker.bio}</p> : null}
          </article>
        ))}
      </div>
    </section>
  )
}

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || "")
      .join("") || "SP"
  )
}
