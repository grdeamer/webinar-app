import type { JSX } from "react"
import {
  Activity,
  Wifi,
  Users,
  Radio,
  SlidersHorizontal,
  Mic2,
  Repeat,
  Zap,
  Gauge,
  Sparkles,
} from "lucide-react"

function StatCard({
  label,
  value,
  tone = "neutral",
}: {
  label: string
  value: string
  tone?: "neutral" | "green" | "red" | "blue"
}): JSX.Element {
  const toneClass =
    tone === "green"
      ? "border-emerald-300/18 bg-[radial-gradient(circle_at_top_right,rgba(52,211,153,0.14),transparent_38%),rgba(52,211,153,0.06)] text-emerald-100"
      : tone === "red"
        ? "border-red-300/18 bg-[radial-gradient(circle_at_top_right,rgba(239,68,68,0.14),transparent_38%),rgba(239,68,68,0.06)] text-red-100"
        : tone === "blue"
          ? "border-sky-300/18 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.14),transparent_38%),rgba(56,189,248,0.06)] text-sky-100"
          : "border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.016))] text-white"

  return (
    <div className={`rounded-[24px] border px-4 py-3 shadow-[0_18px_55px_rgba(0,0,0,0.26),inset_0_1px_0_rgba(255,255,255,0.04)] transition hover:-translate-y-0.5 ${toneClass}`}>
      <div className="text-[10px] font-black uppercase tracking-[0.24em] text-white/38">
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold tracking-tight">{value}</div>
    </div>
  )
}

export default function BroadcastCommandDeck({
  isLive,
  audienceCount,
  onStageCount,
  previewProgramDifferent,
  takeBusy,
  onTake,
}: {
  isLive: boolean
  audienceCount: number
  onStageCount: number
  previewProgramDifferent: boolean
  takeBusy: boolean
  onTake: (mode: "cut" | "auto") => void
}): JSX.Element {
  return (
    <div className="mb-4 space-y-3 px-3 md:px-4 xl:px-5 2xl:px-6">
      <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))] px-4 py-2 shadow-[0_18px_50px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.04)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-white/42">
            <Sparkles size={14} />
            Jupiter Command Surface
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/55">
              <Gauge size={12} /> Stable
            </span>
            <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${isLive ? "border-red-300/25 bg-red-500/12 text-red-100" : "border-white/10 bg-black/30 text-white/50"}`}>
              <span className={`h-2 w-2 rounded-full ${isLive ? "animate-pulse bg-red-400" : "bg-white/30"}`} />
              {isLive ? "Live Feed" : "Standby"}
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.12),transparent_34%),linear-gradient(180deg,rgba(10,17,35,0.94),rgba(2,6,18,0.98))] p-4 shadow-[0_28px_100px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.055)]">
        <div className="grid gap-3 xl:grid-cols-[280px_minmax(0,1fr)_190px]">
          <div className="rounded-[26px] border border-white/10 bg-black/24 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-white/38">
              <Radio size={14} />
              Active Session
            </div>

            <div className="mt-1 text-xl font-semibold text-white">
              Session A1
            </div>

            <div className="mt-3 flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] ${
                  isLive
                    ? "border-red-300/25 bg-red-500/15 text-red-100 shadow-[0_0_20px_rgba(239,68,68,0.16)]"
                    : "border-white/10 bg-black/30 text-white/50"
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    isLive
                      ? "animate-pulse bg-red-400 shadow-[0_0_12px_rgba(248,113,113,0.9)]"
                      : "bg-white/30"
                  }`}
                />
                {isLive ? "Live" : "Off Air"}
              </span>

              <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/45">
                58:12
              </span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Stream Health" value="Excellent" tone="green" />
            <StatCard label="Recording" value="Active" tone="red" />
            <StatCard label="Audience" value={String(audienceCount)} tone="blue" />
            <StatCard label="On Stage" value={String(onStageCount)} tone="neutral" />
          </div>

          <div className="flex items-stretch">
            <button className="w-full rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.018))] px-4 py-4 text-[10px] font-black uppercase tracking-[0.18em] text-white/70 shadow-[0_18px_55px_rgba(0,0,0,0.26),inset_0_1px_0_rgba(255,255,255,0.04)] transition hover:-translate-y-0.5 hover:border-white/18 hover:bg-white/[0.055] active:translate-y-0">
              <SlidersHorizontal size={16} className="mx-auto mb-2" />
              Shortcuts
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.12),transparent_34%),linear-gradient(180deg,rgba(8,14,32,0.94),rgba(2,6,18,0.98))] p-4 shadow-[0_28px_100px_rgba(0,0,0,0.38),inset_0_1px_0_rgba(255,255,255,0.055)]">
        <div className="grid gap-3 xl:grid-cols-[1.25fr_0.95fr_1fr_0.9fr]">
          <div className="rounded-[26px] border border-white/10 bg-black/24 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="text-[10px] font-black uppercase tracking-[0.24em] text-white/38">
                Control Stage
              </div>
              <span className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] ${
                previewProgramDifferent
                  ? "border-amber-300/25 bg-amber-400/10 text-amber-100/85"
                  : "border-emerald-300/20 bg-emerald-400/10 text-emerald-100/75"
              }`}>
                {previewProgramDifferent ? "Armed" : "Matched"}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => onTake("cut")}
                disabled={takeBusy || !previewProgramDifferent}
                className="rounded-2xl border border-amber-200/60 bg-amber-300 px-3 py-3 text-sm font-black uppercase tracking-[0.14em] text-black shadow-[0_0_28px_rgba(251,191,36,0.26)] transition hover:-translate-y-0.5 hover:bg-amber-200 active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"
              >
                {takeBusy ? "Taking" : "Take"}
              </button>

              <button
                type="button"
                onClick={() => onTake("cut")}
                disabled={takeBusy || !previewProgramDifferent}
                className="rounded-2xl border border-red-300/25 bg-red-500/12 px-3 py-3 text-sm font-black uppercase tracking-[0.14em] text-red-100 transition hover:-translate-y-0.5 hover:bg-red-500/18 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-45"
              >
                Cut
              </button>

              <button
                type="button"
                onClick={() => onTake("auto")}
                disabled={takeBusy || !previewProgramDifferent}
                className="rounded-2xl border border-emerald-300/25 bg-emerald-500/12 px-3 py-3 text-sm font-black uppercase tracking-[0.14em] text-emerald-100 transition hover:-translate-y-0.5 hover:bg-emerald-500/18 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-45"
              >
                Auto
              </button>
            </div>

            {previewProgramDifferent ? (
              <div className="mt-3 text-xs font-medium text-amber-100/80">
                Pending preview changes ready to take.
              </div>
            ) : (
              <div className="mt-3 text-xs text-white/42">
                Preview matches Program.
              </div>
            )}
          </div>

          <div className="rounded-[26px] border border-white/10 bg-black/24 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
            <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-white/38">
              <Activity size={14} />
              Transition
            </div>

            <div className="grid grid-cols-3 gap-2">
              {["Cut", "Fade", "Dip"].map((item) => (
                <button
                  key={item}
                  className="rounded-2xl border border-white/10 bg-white/[0.045] px-3 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-white/68 transition hover:-translate-y-0.5 hover:border-white/18 hover:bg-white/[0.07] active:translate-y-0"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[26px] border border-emerald-300/14 bg-[radial-gradient(circle_at_top_right,rgba(52,211,153,0.13),transparent_38%),rgba(52,211,153,0.045)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
            <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-white/38">
              <Mic2 size={14} />
              Audio Mixer
            </div>

            <div className="space-y-2">
              {["Host", "Guest", "Program"].map((row) => (
                <div key={row} className="grid grid-cols-[74px_1fr] items-center gap-2">
                  <div className="text-[10px] font-black uppercase tracking-[0.14em] text-white/48">{row}</div>
                  <div className="flex h-3 gap-1 rounded-full border border-white/8 bg-black/35 px-1 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
                    {Array.from({ length: 14 }).map((_, i) => (
                      <div
                        key={i}
                        className={`flex-1 rounded-full ${
                          i > 10
                            ? "bg-red-300 shadow-[0_0_8px_rgba(252,165,165,0.55)]"
                            : i > 8
                              ? "bg-amber-300 shadow-[0_0_8px_rgba(252,211,77,0.5)]"
                              : "bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,0.5)]"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[26px] border border-white/10 bg-black/24 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
            <div className="mb-3 text-[10px] font-black uppercase tracking-[0.24em] text-white/38">
              Quick Actions
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Signal", icon: Wifi },
                { label: "Guests", icon: Users },
                { label: "Replay", icon: Repeat },
                { label: "Boost", icon: Zap },
              ].map(({ label, icon: Icon }) => (
                <button
                  key={label}
                  className="rounded-2xl border border-white/10 bg-white/[0.045] p-3 text-white/70 shadow-[0_12px_28px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.03)] transition hover:-translate-y-0.5 hover:border-white/18 hover:bg-white/[0.07] hover:text-white active:translate-y-0"
                  aria-label={label}
                >
                  <Icon size={16} className="mx-auto" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}