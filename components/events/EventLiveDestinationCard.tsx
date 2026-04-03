import Link from "next/link"
import type { ResolvedEventLiveDestination } from "@/lib/domain/live"

export default function EventLiveDestinationCard({
  destination,
}: {
  destination: ResolvedEventLiveDestination
}) {
  if (destination.kind === "none") {
    if (!destination.headline && !destination.message) return null

    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white">
        {destination.headline ? (
          <h2 className="text-xl font-semibold">{destination.headline}</h2>
        ) : null}

        {destination.message ? (
          <p className="mt-3 text-sm leading-6 text-white/65">{destination.message}</p>
        ) : null}
      </div>
    )
  }

  return (
    <div className="rounded-3xl border border-sky-400/20 bg-sky-400/10 p-6 text-white">
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-200/80">
        Live now
      </div>

      {destination.headline ? (
        <h2 className="mt-3 text-2xl font-semibold">{destination.headline}</h2>
      ) : (
        <h2 className="mt-3 text-2xl font-semibold">Join the live session</h2>
      )}

      {destination.message ? (
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75">{destination.message}</p>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href={destination.href}
          className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950"
        >
          Join live session
        </Link>

        {destination.forceRedirect ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm text-white/65">
            Live redirect is active
          </div>
        ) : null}
      </div>
    </div>
  )
}