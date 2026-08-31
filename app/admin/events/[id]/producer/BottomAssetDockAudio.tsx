import { useState, type JSX } from "react"

import { AssetStatePill, type BroadcastAssetState } from "./BottomAssetDockAssetRenderers"

export type MixerChannelKey = "Program" | "Stage" | "Music" | "Mics" | "SFX" | "Audience"

function percentToDb(level: number): number {
  const normalized = Math.max(0, Math.min(1, level / 100))
  if (normalized <= 0.0001) return -60
  return Math.max(-60, Math.min(0, 20 * Math.log10(normalized)))
}

function dbLabelFromPercent(level: number): string {
  const db = percentToDb(level)
  if (db <= -59) return "-∞"
  return `${Math.round(db)}`
}

function channelIsAudible({
  label,
  muted,
  soloChannel,
}: {
  label: MixerChannelKey
  muted: boolean
  soloChannel: MixerChannelKey | null
}): boolean {
  if (muted) return false
  if (!soloChannel) return true
  return soloChannel === label
}

export function CompactAudioMeter({
  label,
  level,
}: {
  label: string
  level: number
}): JSX.Element {
  const normalized = Math.max(2, Math.min(96, level))

  return (
    <div className="min-w-0 rounded-[9px] border border-white/[0.07] bg-[#080d16] px-2.5 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.018)]">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[8px] font-bold uppercase tracking-[0.10em] text-white/58">{label}</span>
        <span className="text-[8px] font-medium tabular-nums text-white/36">{dbLabelFromPercent(normalized)}</span>
      </div>
      <div className="relative mt-2 h-2 overflow-hidden rounded-[3px] bg-white/[0.06]">
        <div className="absolute inset-y-0 left-0 w-[72%] bg-emerald-400/[0.10]" />
        <div className="absolute inset-y-0 left-[72%] w-[18%] bg-amber-300/[0.10]" />
        <div className="absolute inset-y-0 right-0 w-[10%] bg-red-400/[0.12]" />
        <div
          className="absolute inset-y-0 left-0 rounded-[3px] bg-gradient-to-r from-emerald-500 via-emerald-300 via-[72%] to-amber-300 shadow-[0_0_10px_rgba(52,211,153,0.18)] transition-[width] duration-100"
          style={{ width: `${normalized}%` }}
        />
      </div>
    </div>
  )
}

export function AudioAssetRow({
  label,
  meta,
  active,
  state = "STANDBY",
  route = "Music Bus",
  trigger = "Manual",
  bus = "MSC",
}: {
  label: string
  meta: string
  active?: boolean
  state?: BroadcastAssetState
  route?: string
  trigger?: string
  bus?: string
}): JSX.Element {
  return (
    <button
      type="button"
      className={`group relative flex min-w-0 items-center gap-2 overflow-hidden rounded-[10px] border p-1.5 text-left transition hover:-translate-y-px hover:border-emerald-300/14 hover:bg-emerald-400/[0.035] active:translate-y-0 ${
        active
          ? "border-emerald-300/18 bg-emerald-400/[0.070]"
          : "border-white/[0.040] bg-white/[0.014]"
      }`}
    >
      <div className="pointer-events-none absolute inset-y-1 left-0 w-[2px] rounded-full bg-emerald-300/44" />
      <div className="relative h-8 w-10 shrink-0 overflow-hidden rounded-[9px] border border-emerald-300/12 bg-emerald-400/[0.045] px-1.5 py-1 text-emerald-100/54">
        <div className="absolute inset-x-1.5 bottom-1 flex h-5 items-end justify-between gap-0.5">
          {Array.from({ length: 9 }).map((_, index) => (
            <span
              key={index}
              className="w-0.5 rounded-full bg-emerald-200/48"
              style={{ height: `${4 + ((index * 5) % 15)}px` }}
            />
          ))}
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <div className="truncate text-[10px] font-semibold text-white/76">{label}</div>
          <span className="shrink-0 rounded-full border border-emerald-300/12 bg-emerald-400/[0.050] px-1.5 py-0.5 text-[6.5px] font-black uppercase tracking-[0.08em] text-emerald-100/48">
            {bus}
          </span>
        </div>
        <div className="mt-0.5 text-[8px] font-black uppercase tracking-[0.08em] text-white/30">
          {meta} · {route}
        </div>
        <div className="mt-1 grid grid-cols-2 gap-1 border-t border-white/[0.030] pt-1">
          <span className="rounded-[7px] border border-white/[0.035] bg-black/16 px-1.5 py-0.5 text-[6.5px] font-black uppercase tracking-[0.08em] text-white/34">
            Trigger {trigger}
          </span>
          <span className="rounded-[7px] border border-white/[0.035] bg-black/16 px-1.5 py-0.5 text-[6.5px] font-black uppercase tracking-[0.08em] text-white/34">
            Fade 1.2s
          </span>
        </div>
      </div>
      <AssetStatePill state={state} />
    </button>
  )
}

export function MixerStrip({
  label,
  level,
  soloActive,
  muted,
  audible,
  peakLevel,
  onToggleSolo,
  onToggleMute,
}: {
  label: MixerChannelKey
  level: number
  soloActive: boolean
  muted: boolean
  audible: boolean
  peakLevel: number
  onToggleSolo: () => void
  onToggleMute: () => void
}): JSX.Element {
  const effectiveLevel = audible ? level : Math.min(level, 3)
  const clampedLevel = Math.max(2, Math.min(96, effectiveLevel))
  const clampedPeakLevel = Math.max(2, Math.min(96, audible ? peakLevel : 3))
  const meterOpacity = clampedLevel > 6 ? "opacity-100" : "opacity-30"
  const dbLabel = dbLabelFromPercent(clampedLevel)
  const clipHot = clampedLevel > 92

  return (
    <div className={`flex min-w-0 flex-col items-center gap-1.5 border-r border-white/[0.030] px-1.5 transition-opacity last:border-r-0 ${audible ? "opacity-100" : "opacity-48"}`}>
      <div className="text-[8px] font-semibold text-sky-100/52">{label}</div>
      <div className="relative h-[82px] w-6 rounded-full border border-white/[0.060] bg-black/28 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.018)]">
        <div className="absolute bottom-1 left-1 right-1 overflow-hidden rounded-full bg-white/[0.045]" style={{ height: "70px" }}>
          <div className="absolute inset-x-0 bottom-0 h-[72%] bg-emerald-400/18" />
          <div className="absolute inset-x-0 bottom-[72%] h-[18%] bg-amber-300/18" />
          <div className="absolute inset-x-0 bottom-[90%] h-[10%] bg-red-400/18" />
          <div
            className={`absolute bottom-0 left-0 right-0 rounded-full bg-gradient-to-t from-emerald-400 via-emerald-300 via-[66%] via-amber-300 to-red-400 shadow-[0_0_12px_rgba(52,211,153,0.20)] transition-[height,opacity] duration-75 ease-out ${meterOpacity}`}
            style={{ height: `${clampedLevel}%` }}
          />
          <div
            className="absolute left-0 right-0 h-0.5 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.55)] transition-[bottom] duration-150 ease-out"
            style={{ bottom: `${clampedPeakLevel}%` }}
          />
          <div className="absolute inset-x-0 bottom-[72%] h-px bg-amber-100/24" />
          <div className="absolute inset-x-0 bottom-[90%] h-px bg-red-100/28" />
        </div>
        <div
          className={`absolute left-1/2 h-3 w-6 -translate-x-1/2 rounded-[5px] border shadow-[0_0_10px_rgba(59,130,246,0.22)] transition-[bottom,background,border-color] duration-75 ease-out ${
            clipHot
              ? "border-red-100/34 bg-red-400"
              : "border-sky-100/22 bg-sky-500"
          }`}
          style={{ bottom: `calc(${clampedLevel}% - 4px)` }}
        />
      </div>
      <div className="text-[7px] font-black tabular-nums text-white/32">
        {dbLabel} dB
      </div>
      <div className="grid grid-cols-2 gap-1">
        <button
          type="button"
          onClick={onToggleSolo}
          aria-pressed={soloActive}
          className={`rounded-[6px] border px-1.5 py-1 text-[8px] font-black transition ${
            soloActive
              ? "border-amber-300/24 bg-amber-300/14 text-amber-100/86 shadow-[0_0_12px_rgba(251,191,36,0.12)]"
              : "border-white/[0.05] bg-white/[0.020] text-white/42 hover:bg-white/[0.04] hover:text-white/70"
          }`}
        >
          S
        </button>
        <button
          type="button"
          onClick={onToggleMute}
          aria-pressed={muted}
          className={`rounded-[6px] border px-1.5 py-1 text-[8px] font-black transition ${
            muted
              ? "border-red-300/24 bg-red-400/14 text-red-100/86 shadow-[0_0_12px_rgba(248,113,113,0.12)]"
              : "border-white/[0.05] bg-white/[0.020] text-white/42 hover:bg-white/[0.04] hover:text-white/70"
          }`}
        >
          M
        </button>
      </div>
    </div>
  )
}

export function ExpandedAudioMixerOverlay({
  micLevelPercent,
  programLevel,
  stageLevel,
  musicLevel,
  sfxLevel,
  audienceLevel,
  soloChannel,
  mutedChannels,
  peakLevels,
  onToggleSolo,
  onToggleMute,
  onClose,
}: {
  micLevelPercent: number
  programLevel: number
  stageLevel: number
  musicLevel: number
  sfxLevel: number
  audienceLevel: number
  soloChannel: MixerChannelKey | null
  mutedChannels: Record<MixerChannelKey, boolean>
  peakLevels: Record<MixerChannelKey, number>
  onToggleSolo: (channel: MixerChannelKey) => void
  onToggleMute: (channel: MixerChannelKey) => void
  onClose: () => void
}): JSX.Element {
  const channels: Array<[MixerChannelKey, number, string]> = [
    ["Program", programLevel, "PGM"],
    ["Stage", stageLevel, "STG"],
    ["Music", musicLevel, "MSC"],
    ["Mics", micLevelPercent, "MIC"],
    ["SFX", sfxLevel, "SFX"],
    ["Audience", audienceLevel, "AUD"],
  ]
  const [signalMapOpen, setSignalMapOpen] = useState(false)

  return (
    <div className="fixed left-[96px] top-[118px] z-[999] h-[min(720px,calc(100dvh-160px))] w-[min(980px,calc(100vw-560px))] min-w-[760px] overflow-hidden rounded-[24px] border border-emerald-200/16 bg-[radial-gradient(circle_at_24%_0%,rgba(16,185,129,0.16),transparent_34%),radial-gradient(circle_at_80%_12%,rgba(56,189,248,0.12),transparent_32%),linear-gradient(180deg,rgba(5,13,18,0.985),rgba(2,5,10,0.998))] shadow-[0_34px_110px_rgba(0,0,0,0.72),0_0_42px_rgba(16,185,129,0.12),inset_0_1px_0_rgba(255,255,255,0.045)] backdrop-blur-2xl">
      <div className="pointer-events-none absolute inset-0 opacity-[0.018] bg-[repeating-linear-gradient(to_right,rgba(255,255,255,0.030)_0px,rgba(255,255,255,0.030)_1px,transparent_1px,transparent_32px)]" />
      <div className="relative z-[2500] flex items-start justify-between gap-3 border-b border-white/[0.065] px-4 py-3">
        <div>
          <div className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-100/52">
            Expanded Audio Mixer
          </div>
          <div className="mt-1 text-[22px] font-semibold tracking-[-0.055em] text-white/92">
            Program Audio Control
          </div>
          <div className="mt-1 max-w-2xl text-[12px] leading-relaxed text-white/46">
            Detailed dBFS metering, channel confidence, and operator controls for program monitoring.
          </div>
        </div>

        <div className="relative flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSignalMapOpen((current) => !current)}
            className="rounded-full border border-emerald-300/14 bg-emerald-400/[0.055] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.10em] text-emerald-100/62 transition hover:border-emerald-300/24 hover:bg-emerald-400/[0.095] hover:text-emerald-50"
          >
            Signal Map
          </button>

          <button
            type="button"
            onClick={() => {
              setSignalMapOpen(false)
              onClose()
            }}
            className="rounded-full border border-white/[0.08] bg-white/[0.030] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.10em] text-white/58 transition hover:bg-white/[0.055] hover:text-white/82"
          >
            Close
          </button>

          {signalMapOpen ? (
            <div className="fixed right-10 top-[154px] z-[3000] w-[430px] overflow-hidden rounded-[20px] border border-emerald-200/24 bg-[#02060a] p-3 text-left shadow-[0_40px_110px_rgba(0,0,0,0.96),0_0_34px_rgba(16,185,129,0.14),inset_0_1px_0_rgba(255,255,255,0.060)]">
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,#061416_0%,#02060a_100%)] opacity-100" />
              <div className="pointer-events-none absolute inset-0 opacity-[0.018] bg-[repeating-linear-gradient(to_bottom,rgba(255,255,255,0.05)_0px,rgba(255,255,255,0.05)_1px,transparent_1px,transparent_18px)]" />
              <div className="relative z-10">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[8px] font-black uppercase tracking-[0.18em] text-emerald-100/52">
                      Jupiter Signal Buses
                    </div>
                    <div className="mt-1 text-[12px] font-semibold tracking-[-0.02em] text-white/80">
                      Routing shorthand for the expanded mixer.
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSignalMapOpen(false)}
                    className="shrink-0 rounded-full border border-white/[0.09] bg-white/[0.035] px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.10em] text-white/58 transition hover:bg-white/[0.065] hover:text-white/84"
                  >
                    Close Map
                  </button>
                </div>

                <div className="mt-3 grid gap-1.5">
                  {[
                    ["PGM", "Program", "Final audience / recording output."],
                    ["STG", "Stage", "Live presenters, hosts, and guests."],
                    ["MSC", "Music", "Playback beds, countdowns, and ambient loops."],
                    ["MIC", "Mics", "Operator or presenter microphone inputs."],
                    ["SFX", "SFX", "Stingers, alerts, and transition effects."],
                    ["AUD", "Audience", "Audience return, Q&A, or moderated participation."],
                  ].map(([code, label, description]) => (
                    <div key={code} className="grid grid-cols-[46px_70px_1fr] items-start gap-2 rounded-[12px] border border-white/[0.085] bg-[#071115] px-2.5 py-2">
                      <span className="rounded-full border border-emerald-300/12 bg-emerald-400/[0.050] px-2 py-0.5 text-center text-[8px] font-black text-emerald-100/62">
                        {code}
                      </span>
                      <span className="text-[10px] font-black uppercase tracking-[0.10em] text-white/56">
                        {label}
                      </span>
                      <span className="text-[10px] leading-4 text-white/42">
                        {description}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-3 rounded-[12px] border border-sky-200/18 bg-[#07131a] px-3 py-2 text-[10px] leading-4 text-sky-50/72">
                  Some buses are currently confidence/simulation layers while routing is being wired to LiveKit tracks, media playback, and future audience participation.
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="relative z-10 grid h-[calc(100%-92px)] min-h-0 gap-3 overflow-hidden p-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="min-h-0 overflow-hidden rounded-[18px] border border-white/[0.065] bg-black/24 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.020)]">
          <div className="grid h-full min-h-0 grid-cols-3 gap-3 xl:grid-cols-3 2xl:grid-cols-4">
            {channels.map(([label, level, badge]) => {
              const muted = mutedChannels[label]
              const soloActive = soloChannel === label
              const audible = channelIsAudible({ label, muted, soloChannel })
              const peakLevel = Math.max(2, Math.min(96, audible ? peakLevels[label] : 3))
              const effectiveLevel = audible ? level : Math.min(level, 3)
              const clampedLevel = Math.max(2, Math.min(96, effectiveLevel))
              const dbLabel = dbLabelFromPercent(clampedLevel)
              const clipHot = clampedLevel > 92

              return (
                <div key={label} className={`flex min-h-0 flex-col overflow-hidden rounded-[16px] border p-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.016)] transition ${audible ? "border-white/[0.055] bg-white/[0.020] opacity-100" : "border-white/[0.035] bg-black/20 opacity-52"}`}>
                  <div className="text-[10px] font-black uppercase tracking-[0.13em] text-white/52">
                    {label}
                  </div>
                  <div className="mt-1 text-[8px] font-black uppercase tracking-[0.12em] text-emerald-100/36">
                    {badge}
                  </div>

                  <div className="mt-3 flex min-h-0 flex-1 items-stretch justify-center gap-2">
                    <div className="flex flex-col justify-between py-1 text-right text-[8px] font-black tabular-nums text-white/28">
                      <span>0</span>
                      <span className="text-red-100/42">-3</span>
                      <span className="text-amber-100/42">-12</span>
                      <span className="text-emerald-100/34">-24</span>
                      <span>-60</span>
                    </div>

                    <div className="relative w-10 overflow-hidden rounded-full border border-white/[0.070] bg-black/42 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.020)]">
                      <div className="absolute bottom-1 left-1 right-1 top-1 overflow-hidden rounded-full bg-white/[0.040]">
                        <div className="absolute inset-x-0 bottom-0 h-[72%] bg-emerald-400/14" />
                        <div className="absolute inset-x-0 bottom-[72%] h-[18%] bg-amber-300/16" />
                        <div className="absolute inset-x-0 bottom-[90%] h-[10%] bg-red-400/18" />
                        <div
                          className="absolute bottom-0 left-0 right-0 rounded-full bg-gradient-to-t from-emerald-400 via-emerald-300 via-[66%] via-amber-300 to-red-400 shadow-[0_0_18px_rgba(52,211,153,0.28)] transition-[height] duration-75 ease-out"
                          style={{ height: `${clampedLevel}%` }}
                        />
                        <div
                          className="absolute left-0 right-0 h-0.5 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.62)] transition-[bottom] duration-150 ease-out"
                          style={{ bottom: `${peakLevel}%` }}
                        />
                        <div className="absolute inset-x-0 bottom-[72%] h-px bg-amber-100/28" />
                        <div className="absolute inset-x-0 bottom-[90%] h-px bg-red-100/32" />
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 rounded-[10px] border border-white/[0.055] bg-black/24 px-2 py-1.5 text-[11px] font-black tabular-nums text-white/70">
                    {dbLabel} dBFS
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => onToggleSolo(label)}
                      aria-pressed={soloActive}
                      className={`rounded-[9px] border px-2 py-1.5 text-[9px] font-black uppercase tracking-[0.10em] transition ${
                        soloActive
                          ? "border-amber-300/24 bg-amber-300/14 text-amber-100/86 shadow-[0_0_14px_rgba(251,191,36,0.13)]"
                          : "border-white/[0.06] bg-white/[0.024] text-white/42 hover:bg-white/[0.04]"
                      }`}
                    >
                      Solo
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggleMute(label)}
                      aria-pressed={muted}
                      className={`rounded-[9px] border px-2 py-1.5 text-[9px] font-black uppercase tracking-[0.10em] transition ${
                        muted
                          ? "border-red-300/24 bg-red-400/14 text-red-100/86 shadow-[0_0_14px_rgba(248,113,113,0.13)]"
                          : "border-white/[0.06] bg-white/[0.024] text-white/42 hover:bg-white/[0.04]"
                      }`}
                    >
                      Mute
                    </button>
                  </div>

                  <div className={`mt-2 rounded-full border px-2 py-1 text-[8px] font-black uppercase tracking-[0.12em] ${clipHot ? "border-red-300/20 bg-red-400/10 text-red-100/70" : "border-emerald-300/12 bg-emerald-400/7 text-emerald-100/52"}`}>
                    {muted ? "Muted" : soloActive ? "Solo Active" : clipHot ? "Clip Risk" : audible ? "Signal Safe" : "Dimmed"}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="min-h-0 space-y-3 overflow-y-auto rounded-[18px] border border-white/[0.065] bg-white/[0.020] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.018)]">
          <div>
            <div className="text-[8px] font-black uppercase tracking-[0.14em] text-white/42">
              Master Bus
            </div>
            <div className="mt-2 rounded-[16px] border border-emerald-300/12 bg-emerald-400/[0.045] p-3">
              <div className="text-[22px] font-semibold tracking-[-0.04em] text-white/88">
                {dbLabelFromPercent(Math.max(programLevel, stageLevel, micLevelPercent))} dBFS
              </div>
              <div className="mt-1 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-100/44">
                Program Confidence
              </div>
            </div>
          </div>

          <div className="grid gap-2">
            {[
              ["Target Peak", "-6 dBFS"],
              ["Warning Zone", "-12 to -3"],
              ["Clip Zone", "0 dBFS"],
              ["Monitor", "Control Room"],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between rounded-[12px] border border-white/[0.050] bg-black/20 px-3 py-2">
                <span className="text-[10px] font-semibold text-white/42">{label}</span>
                <span className="text-[10px] font-black uppercase tracking-[0.10em] text-white/64">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
