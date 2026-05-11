import type { JSX } from "react"
import { Globe2, Orbit, Waves } from "lucide-react"

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
    <div className="relative overflow-hidden rounded-[30px] border border-sky-200/14 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.16),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(99,102,241,0.14),transparent_32%),linear-gradient(180deg,rgba(4,10,22,0.96),rgba(1,4,12,1))] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.42),0_0_34px_rgba(56,189,248,0.08),inset_0_1px_0_rgba(255,255,255,0.05)]">
      <div className="pointer-events-none absolute inset-0 opacity-[0.06] [background:repeating-linear-gradient(0deg,rgba(255,255,255,0.9)_0px,rgba(255,255,255,0.9)_1px,transparent_1px,transparent_5px)]" />
      <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-sky-100/45 to-transparent" />

      <div className="relative z-10 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.26em] text-sky-100/70">
            <Orbit size={14} />
            Audience Origin Cue
          </div>
          <div className="mt-2 max-w-[420px] text-sm leading-relaxed text-white/58">
            Simulate cinematic audience-response overlays from Earth regions or lunar relay stations.
          </div>
        </div>

        <div className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-emerald-100 shadow-[0_0_24px_rgba(52,211,153,0.18)]">
          Live Telemetry
        </div>
      </div>

      <div className="relative z-10 mt-5 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="relative overflow-hidden rounded-[28px] border border-sky-200/12 bg-[radial-gradient(circle_at_50%_35%,rgba(59,130,246,0.20),transparent_38%),linear-gradient(180deg,rgba(3,8,20,0.92),rgba(1,2,8,1))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
          <div className="absolute left-1/2 top-1/2 h-[240px] w-[240px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-sky-300/20 bg-[radial-gradient(circle_at_35%_30%,rgba(125,211,252,0.95),rgba(37,99,235,0.92)_48%,rgba(2,6,23,1)_76%)] shadow-[0_0_60px_rgba(56,189,248,0.35),0_0_120px_rgba(37,99,235,0.16)]">
            <div className="absolute inset-[14%] rounded-full border border-white/10 opacity-60" />
            <div className="absolute inset-[28%] rounded-full border border-white/10 opacity-40" />
            <div className="absolute left-[20%] top-[28%] h-[22%] w-[26%] rounded-full bg-emerald-300/28 blur-md" />
            <div className="absolute right-[18%] top-[34%] h-[18%] w-[22%] rounded-full bg-emerald-300/20 blur-md" />
            <div className="absolute bottom-[20%] left-[36%] h-[20%] w-[28%] rounded-full bg-emerald-300/18 blur-md" />
          </div>

          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_54%,rgba(255,255,255,0.03)_70%,transparent_76%)]" />

          <div className="relative z-10 flex min-h-[320px] flex-col justify-between">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/42">
                  Earth Audience Network
                </div>
                <div className="mt-1 text-xs text-white/28">
                  Global attendee visualization relay
                </div>
              </div>

              <div className="rounded-full border border-sky-300/18 bg-sky-400/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-sky-100">
                GEO-SYNC
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <button
                onClick={() =>
                  onTriggerCue({
                    region: "Europe",
                    moonMode: false,
                    questionLabel: "How are outcomes differing across regions?",
                  })
                }
                className="rounded-2xl border border-white/10 bg-black/32 px-3 py-3 text-left transition hover:-translate-y-0.5 hover:border-sky-300/22 hover:bg-sky-400/10"
              >
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/50">
                  <Globe2 size={12} /> Europe
                </div>
                <div className="mt-2 text-xs text-white/34">
                  Regional audience cue
                </div>
              </button>

              <button
                onClick={() =>
                  onTriggerCue({
                    region: "North America",
                    moonMode: false,
                    questionLabel: "What trends are you seeing in North America?",
                  })
                }
                className="rounded-2xl border border-white/10 bg-black/32 px-3 py-3 text-left transition hover:-translate-y-0.5 hover:border-sky-300/22 hover:bg-sky-400/10"
              >
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/50">
                  <Globe2 size={12} /> North America
                </div>
                <div className="mt-2 text-xs text-white/34">
                  Audience routing check
                </div>
              </button>

              <button
                onClick={() =>
                  onTriggerCue({
                    region: "Asia-Pacific",
                    moonMode: false,
                    questionLabel: "APAC check-in: are translations aligned?",
                  })
                }
                className="rounded-2xl border border-white/10 bg-black/32 px-3 py-3 text-left transition hover:-translate-y-0.5 hover:border-sky-300/22 hover:bg-sky-400/10"
              >
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/50">
                  <Globe2 size={12} /> APAC
                </div>
                <div className="mt-2 text-xs text-white/34">
                  Translation sync test
                </div>
              </button>

              <button
                onClick={onHideCue}
                className="rounded-2xl border border-red-300/18 bg-red-500/10 px-3 py-3 text-left transition hover:-translate-y-0.5 hover:bg-red-500/18"
              >
                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-red-100/72">
                  Clear Cue
                </div>
                <div className="mt-2 text-xs text-red-100/42">
                  Remove live overlay
                </div>
              </button>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-[28px] border border-violet-200/12 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.22),transparent_38%),linear-gradient(180deg,rgba(12,8,26,0.96),rgba(3,2,10,1))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
          <div className="absolute right-[-10%] top-[12%] h-[220px] w-[220px] rounded-full bg-[radial-gradient(circle_at_35%_30%,rgba(255,255,255,0.95),rgba(209,213,219,0.88)_48%,rgba(55,65,81,1)_78%)] shadow-[0_0_70px_rgba(168,85,247,0.24)]" />

          <div className="relative z-10 flex h-full min-h-[320px] flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-violet-100/70">
                <Waves size={14} /> Lunar Relay
              </div>

              <div className="mt-3 max-w-[240px] text-sm leading-relaxed text-white/56">
                Experimental moon-base audience telemetry visualization.
              </div>
            </div>

            <div className="space-y-3">
              <div className="rounded-[22px] border border-white/10 bg-black/28 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.16em] text-white/45">
                  <span>Mare Tranquillitatis</span>
                  <span className="text-violet-100/68">ONLINE</span>
                </div>

                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full w-[82%] rounded-full bg-gradient-to-r from-violet-300 via-sky-300 to-emerald-300 shadow-[0_0_20px_rgba(168,85,247,0.45)]" />
                </div>
              </div>

              <button
                onClick={() =>
                  onTriggerCue({
                    region: "Mare Tranquillitatis",
                    moonMode: true,
                    questionLabel:
                      "Moon base check-in: how is the signal holding?",
                  })
                }
                className="w-full rounded-[22px] border border-violet-300/22 bg-violet-500/12 px-4 py-4 text-left transition hover:-translate-y-0.5 hover:bg-violet-500/18"
              >
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-100/78">
                  Trigger Lunar Cue
                </div>
                <div className="mt-2 text-sm text-violet-50/68">
                  Activate moon-origin cinematic audience overlay.
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}