import type { JSX } from "react"

export default function AudienceOriginTestPanel({
  onTriggerCue,
  onHideCue,
}: {
  onTriggerCue: (options: {
    region?: string
    moonMode?: boolean
    questionLabel?: string
    durationMs?: number
  }) => void
  onHideCue: () => void
}): JSX.Element {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
        Audience Origin Test
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() =>
            onTriggerCue({
              region: "Europe",
              moonMode: false,
              questionLabel: "How are outcomes differing across regions?",
            })
          }
          className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
        >
          Trigger Europe Cue
        </button>

        <button
          onClick={() =>
            onTriggerCue({
              region: "North America",
              moonMode: false,
              questionLabel: "What trends are you seeing in North America?",
            })
          }
          className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
        >
          Trigger North America Cue
        </button>

        <button
          onClick={() =>
            onTriggerCue({
              region: "Mare Tranquillitatis",
              moonMode: true,
              questionLabel: "Moon base check-in: how is the signal holding?",
            })
          }
          className="rounded-xl border border-violet-400/20 bg-violet-500/10 px-4 py-2 text-sm font-semibold text-violet-100 transition hover:bg-violet-500/15"
        >
          Trigger Moon Cue
        </button>

        <button
          onClick={onHideCue}
          className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-100 transition hover:bg-red-500/15"
        >
          Hide Cue
        </button>
      </div>
    </div>
  )
}