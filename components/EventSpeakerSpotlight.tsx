import type { SpeakerCard } from "@/lib/eventExperience"

export default function EventSpeakerSpotlight({ speaker }: { speaker?: SpeakerCard | null }) {
  if (!speaker) return null

  return (
    <section className="overflow-hidden rounded-3xl border border-white/10 bg-[linear-gradient(135deg,rgba(2,6,23,0.96),rgba(30,41,59,0.96),rgba(76,29,149,0.85))] p-6 shadow-xl shadow-black/20">
      <div className="grid gap-5 md:grid-cols-[0.75fr_1.25fr] md:items-center">
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-black/25 aspect-[4/5]">
          {speaker.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={speaker.imageUrl} alt={speaker.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-sky-500/30 to-violet-500/25 text-5xl font-semibold text-white/90">
              {initials(speaker.name)}
            </div>
          )}
        </div>
        <div>
          <div className="inline-flex rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-medium text-white/75">
            Speaker spotlight
          </div>
          <h2 className="mt-4 text-3xl font-bold tracking-tight">{speaker.name}</h2>
          {speaker.role ? <div className="mt-2 text-base text-sky-200">{speaker.role}</div> : null}
          {speaker.company ? <div className="mt-2 text-sm text-white/60">{speaker.company}</div> : null}
          <p className="mt-4 text-sm leading-7 text-white/68">
            {speaker.bio || "Use structured speaker cards in the webinar editor to turn this section into a real keynote spotlight with role, company, headshot, and bio."}
          </p>
        </div>
      </div>
    </section>
  )
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() || "").join("") || "SP"
}
