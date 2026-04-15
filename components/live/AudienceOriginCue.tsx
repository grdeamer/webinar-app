"use client"

import { useEffect, useState } from "react"

type AudienceOriginCueProps = {
  visible?: boolean
  region: string
  moonMode?: boolean
  entering?: boolean
  questionLabel?: string | null
  compact?: boolean
  broadcast?: boolean
}

const EARTH_POINTS = [
  { name: "North America", top: "34%", left: "22%" },
  { name: "South America", top: "64%", left: "31%" },
  { name: "Europe", top: "30%", left: "50%" },
  { name: "Africa", top: "52%", left: "50%" },
  { name: "Middle East", top: "40%", left: "58%" },
  { name: "Asia Pacific", top: "42%", left: "75%" },
]

const MOON_POINTS = [
  { name: "Mare Tranquillitatis", top: "42%", left: "58%" },
  { name: "Oceanus Procellarum", top: "45%", left: "28%" },
  { name: "Tycho", top: "72%", left: "48%" },
  { name: "Copernicus", top: "52%", left: "42%" },
]

export default function AudienceOriginCue({
  visible = true,
  region,
  moonMode = false,
  entering = false,
  questionLabel = null,
  compact = false,
  broadcast = false,
}: AudienceOriginCueProps) {
  const [hasEntered, setHasEntered] = useState(false)

  useEffect(() => {
    const id = window.setTimeout(() => {
      setHasEntered(true)
    }, 20)

    return () => window.clearTimeout(id)
  }, [region, moonMode])

  const points = moonMode ? MOON_POINTS : EARTH_POINTS
  const activePoint = points.find((point) => point.name === region) ?? points[0]

  const heightClass = broadcast ? "h-[132px]" : compact ? "h-[150px]" : "h-[320px]"
const wrapperClass = broadcast
  ? "rounded-[24px] border border-white/6 bg-black/0 shadow-none backdrop-blur-0"
: compact
  ? "rounded-none border-0 bg-transparent shadow-none backdrop-blur-0"
    : "rounded-3xl border border-white/15 bg-black shadow-2xl"

  const eyebrowClass = broadcast
    ? "text-[9px] uppercase tracking-[0.28em] text-white/50"
    : "text-[10px] uppercase tracking-[0.35em] text-white/60"

  const titleClass = broadcast
    ? "mt-1.5 text-lg font-semibold"
    : "mt-2 text-2xl font-semibold"

  const labelClass = broadcast
    ? "mt-1.5 max-w-[420px] text-xs text-white/65"
    : "mt-2 max-w-[520px] text-sm text-white/70"

  const topInset = broadcast ? "left-4 top-4" : "left-5 top-5"

  const chipClass = broadcast
    ? "absolute bottom-3 right-3 z-20 rounded-full border border-white/10 bg-white/8 px-2.5 py-1 text-[10px] uppercase tracking-[0.22em] text-white/60 backdrop-blur"
    : "absolute bottom-4 right-4 z-20 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.28em] text-white/70 backdrop-blur"

  const shouldShow = visible
  const animatedIn = hasEntered && shouldShow

  return (
    <div
className={[
  "relative overflow-hidden text-white transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] w-full mix-blend-screen",
  heightClass,
  wrapperClass,
  animatedIn
    ? "opacity-100 translate-y-0 scale-100"
    : "pointer-events-none opacity-0 translate-y-3 scale-[0.985]",
].join(" ")}
    >
<div
  className="absolute inset-0 transition-transform duration-[1400ms] ease-out"
  style={{
    background: moonMode
      ? "radial-gradient(circle at 50% 45%, rgba(148,163,184,0.18), rgba(15,23,42,0.34) 42%, rgba(2,6,23,0.12) 72%, rgba(2,6,23,0.01) 100%)"
      : "radial-gradient(circle at 50% 45%, rgba(59,130,246,0.18), rgba(15,23,42,0.30) 42%, rgba(2,6,23,0.10) 72%, rgba(2,6,23,0.01) 100%)",
    maskImage: compact
      ? "radial-gradient(circle at center, black 82%, transparent 100%)"
      : "radial-gradient(circle at center, black 68%, transparent 100%)",
    WebkitMaskImage: compact
      ? "radial-gradient(circle at center, black 82%, transparent 100%)"
      : "radial-gradient(circle at center, black 68%, transparent 100%)",
    transform: animatedIn ? "scale(1)" : "scale(1.08)",
  }}
/>

<div className={broadcast ? "absolute inset-0 opacity-[0.07]" : "absolute inset-0 opacity-[0.14]"}>
  <div
    className="h-full w-full"
    style={{
      backgroundImage:
        "linear-gradient(to right, rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.08) 1px, transparent 1px)",
      backgroundSize: broadcast ? "32px 32px" : "40px 40px",
    }}
  />
</div>

      <div className={`absolute z-20 transition-all duration-700 ${topInset} ${animatedIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}>
        <div className={eyebrowClass}>Audience origin</div>
        <div className={titleClass}>
          {moonMode ? "Question from the Moon" : `Question from ${region}`}
        </div>
        {questionLabel ? <div className={labelClass}>{questionLabel}</div> : null}
      </div>

      <div className="absolute inset-0 z-10">
        {points.map((point) => {
          const active = point.name === activePoint.name

          return (
            <div
              key={point.name}
              className="absolute"
              style={{
                top: point.top,
                left: point.left,
                transform: animatedIn
                  ? "translate(-50%, -50%) scale(1)"
                  : "translate(-50%, -50%) scale(0.9)",
                opacity: animatedIn ? 1 : 0,
                transition: "transform 700ms ease, opacity 700ms ease",
              }}
            >
              <div className="relative flex items-center justify-center">
                <div
                  className={[
                    "absolute rounded-full",
                    active
                      ? broadcast
                        ? "h-8 w-8 bg-white/8 animate-ping"
                        : "h-10 w-10 bg-white/10 animate-ping"
                      : broadcast
                        ? "h-4 w-4 bg-white/5"
                        : "h-6 w-6 bg-white/5",
                  ].join(" ")}
                />
                <div
                  className={[
                    "relative rounded-full border",
                    active
                      ? broadcast
                        ? "h-3 w-3 border-white bg-white shadow-[0_0_12px_rgba(255,255,255,0.55)]"
                        : "h-4 w-4 border-white bg-white shadow-[0_0_18px_rgba(255,255,255,0.7)]"
                      : broadcast
                        ? "h-2.5 w-2.5 border-white/45 bg-white/55"
                        : "h-3 w-3 border-white/50 bg-white/60",
                  ].join(" ")}
                />
              </div>

              {active ? (
                <div
                  className={
                    broadcast
                      ? "absolute left-1/2 mt-2 -translate-x-1/2 whitespace-nowrap rounded-full border border-white/10 bg-black/55 px-2 py-0.5 text-[10px] text-white/85 backdrop-blur"
                      : "absolute left-1/2 mt-3 -translate-x-1/2 whitespace-nowrap rounded-full border border-white/15 bg-black/70 px-3 py-1 text-xs text-white/90 backdrop-blur"
                  }
                >
                  {point.name}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>

      <div
        className={`${chipClass} transition-all duration-700 ${
          animatedIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
        }`}
      >
        {moonMode ? "Lunar view" : "Earth view"}
      </div>
    </div>
  )
}