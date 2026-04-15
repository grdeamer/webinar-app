"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import dynamic from "next/dynamic"

const Globe = dynamic(() => import("react-globe.gl"), {
  ssr: false,
})

type GlobeMomentProps = {
  region: string
  moonMode?: boolean
  questionLabel?: string | null
  lat?: number | null
  lng?: number | null
}

type GlobeHandle = {
  pointOfView: (
    position: { lat: number; lng: number; altitude?: number },
    ms?: number
  ) => void
}

type GlobePoint = {
  lat: number
  lng: number
  size: number
  color: string
}

type GlobeArc = {
  startLat: number
  startLng: number
  endLat: number
  endLng: number
  color: string[]
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function fallbackCoordsForRegion(region: string): { lat: number; lng: number } {
  switch (region) {
    case "North America":
      return { lat: 39, lng: -98 }
    case "South America":
      return { lat: -15, lng: -60 }
    case "Europe":
      return { lat: 50, lng: 10 }
    case "Africa":
      return { lat: 4, lng: 20 }
    case "Middle East":
      return { lat: 29, lng: 45 }
    case "Asia Pacific":
      return { lat: 20, lng: 120 }
    default:
      return { lat: 50, lng: 10 }
  }
}

function buildStars(count: number) {
  return Array.from({ length: count }, (_, index) => {
    const seed = (index * 9301 + 49297) % 233280
    const seed2 = (index * 233 + 17) % 1000
    const left = `${(seed / 233280) * 100}%`
    const top = `${((seed * 1.73) % 233280) / 233280 * 100}%`
    const size = 1 + (seed2 % 3)
    const delay = `${(seed2 % 20) / 10}s`
    const duration = `${3 + (seed2 % 5)}s`

    return {
      left,
      top,
      size,
      delay,
      duration,
    }
  })
}

const STARS = buildStars(42)

export default function GlobeMoment({
  region,
  moonMode = false,
  questionLabel,
  lat,
  lng,
}: GlobeMomentProps) {
  const globeRef = useRef<GlobeHandle | null>(null)

  const [mounted, setMounted] = useState(false)
  const [showGlobe, setShowGlobe] = useState(false)
  const [showSignal, setShowSignal] = useState(false)
  const [showImpact, setShowImpact] = useState(false)
  const [showText, setShowText] = useState(false)

  useEffect(() => {
    setMounted(true)

    const globeTimer = window.setTimeout(() => {
      setShowGlobe(true)
    }, 120)

    const signalTimer = window.setTimeout(() => {
      setShowSignal(true)
    }, 950)

    const impactTimer = window.setTimeout(() => {
      setShowImpact(true)
    }, 1325)

    const textTimer = window.setTimeout(() => {
      setShowText(true)
    }, 1625)

    return () => {
      window.clearTimeout(globeTimer)
      window.clearTimeout(signalTimer)
      window.clearTimeout(impactTimer)
      window.clearTimeout(textTimer)
    }
  }, [])

  const target = useMemo(() => {
    if (
      typeof lat === "number" &&
      typeof lng === "number" &&
      Number.isFinite(lat) &&
      Number.isFinite(lng)
    ) {
      return {
        lat: clamp(lat, -80, 80),
        lng: clamp(lng, -180, 180),
      }
    }

    return fallbackCoordsForRegion(region)
  }, [lat, lng, region])

  useEffect(() => {
    if (!mounted || !showGlobe || !globeRef.current || moonMode) return

    const timer = window.setTimeout(() => {
      globeRef.current?.pointOfView(
        {
          lat: target.lat,
          lng: target.lng,
          altitude: 1.18,
        },
        2100
      )
    }, 360)

    return () => {
      window.clearTimeout(timer)
    }
  }, [mounted, showGlobe, moonMode, target.lat, target.lng])

  const pointsData = useMemo<GlobePoint[]>(() => {
    if (!showSignal) return []

    return [
      {
        lat: target.lat,
        lng: target.lng,
        size: 3.2,
        color: "#ffffff",
      },
      {
        lat: target.lat,
        lng: target.lng,
        size: 2.2,
        color: "#7dd3fc",
      },
      {
        lat: target.lat,
        lng: target.lng,
        size: 1.5,
        color: "#38bdf8",
      },
    ]
  }, [showSignal, target.lat, target.lng])

  const arcsData = useMemo<GlobeArc[]>(() => {
    if (!showSignal || moonMode) return []

    return [
      {
        startLat: 16,
        startLng: -24,
        endLat: target.lat,
        endLng: target.lng,
        color: ["rgba(125,211,252,0.95)", "rgba(125,211,252,0.10)"],
      },
    ]
  }, [showSignal, moonMode, target.lat, target.lng])

  return (
    <div className="pointer-events-none relative h-[500px] w-full overflow-hidden rounded-[40px]">
      <style jsx>{`
        @keyframes introFade {
          0% {
            opacity: 0;
          }
          100% {
            opacity: 1;
          }
        }

        @keyframes globeRise {
          0% {
            opacity: 0;
            transform: translateY(18px) scale(0.96);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes textIn {
          0% {
            opacity: 0;
            transform: translateY(14px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes ambientPulse {
          0% {
            opacity: 0.16;
            transform: scale(0.92);
          }
          50% {
            opacity: 0.34;
            transform: scale(1.08);
          }
          100% {
            opacity: 0.16;
            transform: scale(0.92);
          }
        }

        @keyframes starTwinkle {
          0% {
            opacity: 0.18;
          }
          50% {
            opacity: 0.65;
          }
          100% {
            opacity: 0.18;
          }
        }

        @keyframes impactRingOne {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.18);
          }
          40% {
            opacity: 0.95;
            transform: translate(-50%, -50%) scale(0.7);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(1.7);
          }
        }

        @keyframes impactRingTwo {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.16);
          }
          45% {
            opacity: 0.6;
            transform: translate(-50%, -50%) scale(0.95);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(2.25);
          }
        }

        @keyframes impactCore {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.2);
          }
          100% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }

        @keyframes horizonSweep {
          0% {
            opacity: 0;
            transform: translateX(-18px);
          }
          100% {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(15,23,42,0.26),rgba(2,6,23,0.96)_72%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.04),rgba(2,6,23,0.76))]" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,6,23,0.26),rgba(2,6,23,0.04)_34%,rgba(2,6,23,0.08)_64%,rgba(2,6,23,0.22))]" />

      {STARS.map((star, index) => (
        <span
          key={`star-${index}`}
          className="absolute rounded-full bg-white/70"
          style={{
            left: star.left,
            top: star.top,
            width: `${star.size}px`,
            height: `${star.size}px`,
            animation: `starTwinkle ${star.duration} ease-in-out ${star.delay} infinite`,
          }}
        />
      ))}

      <div className="absolute left-[7%] top-[12%] h-44 w-44 rounded-full bg-sky-500/10 blur-3xl animate-[ambientPulse_4.4s_ease-in-out_infinite]" />
      <div className="absolute right-[8%] top-[14%] h-72 w-72 rounded-full bg-indigo-500/12 blur-3xl animate-[ambientPulse_5.5s_ease-in-out_infinite]" />
      <div className="absolute bottom-[8%] right-[16%] h-[460px] w-[460px] rounded-full bg-sky-400/10 blur-[130px]" />
      <div className="absolute bottom-[12%] left-[28%] h-52 w-52 rounded-full bg-cyan-400/8 blur-3xl animate-[ambientPulse_4.8s_ease-in-out_infinite]" />

      <div className="absolute inset-0 flex items-center justify-end pr-[7%]">
        {mounted && showGlobe ? (
          <div
            className="relative"
            style={{
              animation: "globeRise 1100ms cubic-bezier(0.22,1,0.36,1) both",
            }}
          >
            <Globe
              ref={globeRef as never}
              width={1700}
              height={560}
              globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
              bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
              backgroundColor="rgba(0,0,0,0)"
              atmosphereColor="#7dd3fc"
              atmosphereAltitude={0.18}
              arcsData={arcsData}
              arcColor={"color"}
              arcStroke={1.3}
              arcDashLength={0.28}
              arcDashGap={1.02}
              arcDashAnimateTime={1800}
              pointsData={pointsData}
              pointLat={"lat"}
              pointLng={"lng"}
              pointColor={"color"}
              pointAltitude={0.08}
              pointRadius={3}
              pointsMerge={false}
              enablePointerInteraction={false}
            />
          </div>
        ) : null}
      </div>

      {!moonMode && showSignal ? (
        <div
          className="absolute left-[46%] top-[49%] z-10 h-[2px] w-[17%] bg-gradient-to-r from-sky-300/0 via-sky-300/80 to-sky-300/0 blur-[1px]"
          style={{
            transform: "rotate(11deg)",
            animation: "horizonSweep 500ms ease-out both",
          }}
        />
      ) : null}

      {showImpact && !moonMode ? (
        <>
          <div
            className="absolute left-[61.5%] top-[53.5%] z-10 h-28 w-28 rounded-full border border-sky-300/70"
            style={{
              animation: "impactRingOne 1200ms ease-out forwards",
            }}
          />
          <div
            className="absolute left-[61.5%] top-[53.5%] z-10 h-36 w-36 rounded-full border border-sky-400/40"
            style={{
              animation: "impactRingTwo 1450ms ease-out forwards",
            }}
          />
          <div
            className="absolute left-[61.5%] top-[53.5%] z-10 h-20 w-20 rounded-full bg-sky-400/20 blur-2xl"
            style={{
              animation: "impactRingOne 1200ms ease-out forwards",
            }}
          />
          <div
            className="absolute left-[61.5%] top-[53.5%] z-10 h-5 w-5 rounded-full bg-white shadow-[0_0_40px_rgba(255,255,255,0.98),0_0_80px_rgba(125,211,252,0.82)]"
            style={{
              animation: "impactCore 450ms cubic-bezier(0.22,1,0.36,1) forwards",
            }}
          />
        </>
      ) : null}

      {showText ? (
        <div
          className="absolute left-8 top-10 z-20 max-w-[430px]"
          style={{
            animation: "textIn 800ms cubic-bezier(0.22,1,0.36,1) both",
          }}
        >
          <div className="text-[10px] uppercase tracking-[0.32em] text-white/48">
            Audience signal
          </div>

          <div className="mt-3 text-[24px] font-semibold tracking-tight text-white md:text-[28px]">
            Question from {region}
          </div>

          {questionLabel ? (
            <div className="mt-4 max-w-[380px] text-sm leading-6 text-white/72">
              {questionLabel}
            </div>
          ) : null}
        </div>
      ) : null}

      {showText ? (
        <div
          className="absolute bottom-8 right-8 rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-white/60 backdrop-blur"
          style={{
            animation: "textIn 800ms cubic-bezier(0.22,1,0.36,1) both",
          }}
        >
          {moonMode ? "Lunar uplink" : "Earth view"}
        </div>
      ) : null}
    </div>
  )
}