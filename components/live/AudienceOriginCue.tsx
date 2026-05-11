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

const STARFIELD = Array.from({ length: 42 }).map((_, index) => {
  const x = Math.sin(index * 12.9898) * 43758.5453
  const y = Math.sin(index * 78.233) * 24634.6345
  const sizeSeed = Math.sin(index * 31.4159) * 9999
  const opacitySeed = Math.sin(index * 19.19) * 7777

  return {
    id: index,
    top: `${Math.abs(y % 100)}%`,
    left: `${Math.abs(x % 100)}%`,
    size: 1 + Math.abs(sizeSeed % 2.5),
    opacity: 0.2 + Math.abs(opacitySeed % 0.8),
  }
})

const CLOUD_BANDS = [
  { top: "28%", left: "-18%", width: "138%", rotate: "-9deg", opacity: 0.18 },
  { top: "43%", left: "-22%", width: "146%", rotate: "6deg", opacity: 0.14 },
  { top: "61%", left: "-18%", width: "136%", rotate: "-5deg", opacity: 0.12 },
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
  className="absolute inset-0 transition-transform duration-[1600ms] ease-out"
  style={{
    background: moonMode
      ? "radial-gradient(circle at 50% 45%, rgba(168,85,247,0.16), rgba(15,23,42,0.42) 42%, rgba(2,6,23,0.16) 72%, rgba(2,6,23,0.01) 100%)"
      : "radial-gradient(circle at 50% 45%, rgba(59,130,246,0.22), rgba(15,23,42,0.36) 42%, rgba(2,6,23,0.14) 72%, rgba(2,6,23,0.01) 100%)",
    maskImage: compact
      ? "radial-gradient(circle at center, black 82%, transparent 100%)"
      : "radial-gradient(circle at center, black 68%, transparent 100%)",
    WebkitMaskImage: compact
      ? "radial-gradient(circle at center, black 82%, transparent 100%)"
      : "radial-gradient(circle at center, black 68%, transparent 100%)",
    transform: animatedIn ? "scale(1)" : "scale(1.08)",
  }}
/>

<div className="pointer-events-none absolute inset-0 opacity-70">
  <div className="absolute left-1/2 top-1/2 h-[92%] w-[92%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-sky-100/8 animate-[jupiter-orbit-roll_18s_linear_infinite]" />
  <div className="absolute left-1/2 top-1/2 h-[72%] w-[72%] -translate-x-1/2 -translate-y-1/2 rotate-[28deg] rounded-full border border-white/8 animate-[jupiter-orbit-roll_24s_linear_infinite_reverse]" />
</div>

<div className="absolute inset-0 overflow-hidden">
  {STARFIELD.map((star) => (
    <div
      key={star.id}
      className="absolute rounded-full bg-white"
      style={{
        top: star.top,
        left: star.left,
        width: `${star.size}px`,
        height: `${star.size}px`,
        opacity: star.opacity,
        boxShadow: "0 0 12px rgba(255,255,255,0.45)",
      }}
    />
  ))}
</div>

<div
  className={`absolute left-1/2 top-1/2 overflow-hidden rounded-full transition-all duration-[1800ms] ease-out before:pointer-events-none before:absolute before:inset-0 before:z-[8] before:rounded-full before:bg-[radial-gradient(circle_at_28%_22%,rgba(255,255,255,0.45),transparent_18%),radial-gradient(circle_at_70%_58%,transparent_48%,rgba(0,0,0,0.46)_82%)] after:pointer-events-none after:absolute after:inset-[-2px] after:z-[9] after:rounded-full after:border after:border-white/18 after:shadow-[inset_0_0_26px_rgba(255,255,255,0.18),0_0_42px_rgba(125,211,252,0.20)] ${
    moonMode
      ? "h-[220px] w-[220px]"
      : compact
        ? "h-[220px] w-[220px]"
        : broadcast
          ? "h-[180px] w-[180px]"
          : "h-[420px] w-[420px]"
  }`}
  style={{
    transform: animatedIn
      ? "translate(-50%, -50%) scale(1)"
      : "translate(-50%, -50%) scale(0.92)",
    background: moonMode
      ? "radial-gradient(circle at 35% 30%, rgba(255,255,255,0.95), rgba(209,213,219,0.88) 48%, rgba(75,85,99,1) 78%)"
      : "radial-gradient(circle at 35% 30%, rgba(125,211,252,0.98), rgba(37,99,235,0.95) 48%, rgba(2,6,23,1) 76%)",
    boxShadow: moonMode
      ? "0 0 80px rgba(168,85,247,0.24)"
      : "0 0 120px rgba(56,189,248,0.28)",
    animation: animatedIn
      ? moonMode
        ? "jupiter-lunar-drift 36s ease-in-out infinite"
        : "jupiter-earth-drift 42s ease-in-out infinite"
      : undefined,
  }}
>
  {!moonMode ? (
    <>
      <div className="absolute left-[14%] top-[24%] z-[2] h-[22%] w-[26%] rounded-[54%_46%_58%_42%] bg-emerald-300/42 blur-[1px]" />
      <div className="absolute left-[26%] top-[44%] z-[2] h-[34%] w-[18%] rotate-[18deg] rounded-[46%_54%_60%_40%] bg-emerald-300/34 blur-[1px]" />
      <div className="absolute left-[48%] top-[25%] z-[2] h-[18%] w-[16%] rotate-[-12deg] rounded-[54%_46%_48%_52%] bg-emerald-300/36 blur-[1px]" />
      <div className="absolute left-[52%] top-[39%] z-[2] h-[28%] w-[18%] rotate-[8deg] rounded-[46%_54%_58%_42%] bg-emerald-300/30 blur-[1px]" />
      <div className="absolute right-[12%] top-[34%] z-[2] h-[24%] w-[24%] rotate-[-8deg] rounded-[56%_44%_50%_50%] bg-emerald-300/35 blur-[1px]" />
      <div className="absolute bottom-[18%] right-[20%] z-[2] h-[16%] w-[22%] rotate-[12deg] rounded-[52%_48%_58%_42%] bg-emerald-300/26 blur-[1px]" />

      {CLOUD_BANDS.map((band, index) => (
        <div
          key={`cloud-${index}`}
          className="absolute z-[5] h-[10%] rounded-full bg-white blur-md"
          style={{
            top: band.top,
            left: band.left,
            width: band.width,
            opacity: band.opacity,
            transform: `rotate(${band.rotate})`,
          }}
        />
      ))}

      <div className="absolute inset-0 z-[6] rounded-full bg-[linear-gradient(90deg,rgba(255,255,255,0.12),transparent_22%,transparent_72%,rgba(0,0,0,0.30))]" />
    </>
  ) : (
    <>
      <div className="absolute left-[34%] top-[28%] h-[18%] w-[18%] rounded-full bg-black/18 blur-sm" />
      <div className="absolute right-[24%] top-[44%] h-[14%] w-[14%] rounded-full bg-black/16 blur-sm" />
      <div className="absolute bottom-[24%] left-[44%] h-[20%] w-[20%] rounded-full bg-black/18 blur-sm" />
    </>
  )}

  <div className="absolute inset-[10%] rounded-full border border-white/10" />
  <div className="absolute inset-[22%] rounded-full border border-white/8" />
</div>

<div className="pointer-events-none absolute left-1/2 top-1/2 z-[4] h-[62%] w-[62%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-sky-200/12 opacity-70" />
<div className="pointer-events-none absolute left-1/2 top-1/2 z-[4] h-[74%] w-[74%] -translate-x-1/2 -translate-y-1/2 rotate-[-18deg] rounded-full border border-white/8 opacity-55" />
<div className="pointer-events-none absolute left-1/2 top-1/2 z-[4] h-[84%] w-[84%] -translate-x-1/2 -translate-y-1/2 rotate-[22deg] rounded-full border border-sky-100/8 opacity-45" />
<div className="pointer-events-none absolute left-1/2 top-1/2 z-[4] h-px w-[78%] -translate-x-1/2 -translate-y-1/2 rotate-[-12deg] bg-gradient-to-r from-transparent via-sky-100/22 to-transparent" />

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
        <div className={eyebrowClass}>
          {moonMode ? "Lunar relay origin" : "Audience origin"}
        </div>
        <div className={titleClass}>
          {moonMode ? "Incoming Lunar Question" : `Question from ${region}`}
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
                        ? "h-8 w-8 bg-sky-100/12 animate-ping"
                        : "h-12 w-12 bg-sky-100/12 animate-ping"
                      : broadcast
                        ? "h-4 w-4 bg-white/5"
                        : "h-6 w-6 bg-white/5",
                  ].join(" ")}
                />
                {active ? (
                  <div
                    className={[
                      "absolute rounded-full border border-sky-100/18 shadow-[0_0_24px_rgba(125,211,252,0.35)]",
                      broadcast ? "h-12 w-12" : "h-16 w-16",
                    ].join(" ")}
                  />
                ) : null}
                <div
                  className={[
                    "relative rounded-full border",
                    active
                      ? broadcast
                        ? "h-3 w-3 border-sky-50 bg-sky-50 shadow-[0_0_14px_rgba(125,211,252,0.72)]"
                        : "h-4 w-4 border-sky-50 bg-sky-50 shadow-[0_0_22px_rgba(125,211,252,0.85)]"
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

      <style>{`
        @keyframes jupiter-earth-drift {
          0%, 100% {
            filter: saturate(1) brightness(1);
          }
          50% {
            filter: saturate(1.12) brightness(1.08);
          }
        }

        @keyframes jupiter-lunar-drift {
          0%, 100% {
            filter: brightness(1);
          }
          50% {
            filter: brightness(1.12);
          }
        }

        @keyframes jupiter-orbit-roll {
          from {
            transform: translate(-50%, -50%) rotate(0deg);
          }
          to {
            transform: translate(-50%, -50%) rotate(360deg);
          }
        }
      `}</style>
      <div
        className={`${chipClass} transition-all duration-700 ${
          animatedIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
        }`}
      >
        {moonMode ? "Lunar relay" : "Earth telemetry"}
      </div>
    </div>
  )
}