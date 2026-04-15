"use client"

import { useEffect, useMemo, useState } from "react"

type PlanetSignalMomentProps = {
  region: string
  moonMode?: boolean
  questionLabel?: string | null
  lat?: number | null
  lng?: number | null
}

type Point = {
  name: string
  top: string
  left: string
}

const EARTH_POINTS: Point[] = [
  { name: "North America", top: "36%", left: "30%" },
  { name: "South America", top: "63%", left: "36%" },
  { name: "Europe", top: "34%", left: "53%" },
  { name: "Africa", top: "54%", left: "53%" },
  { name: "Middle East", top: "42%", left: "60%" },
  { name: "Asia Pacific", top: "42%", left: "72%" },
]

const MOON_POINTS: Point[] = [
  { name: "Mare Tranquillitatis", top: "43%", left: "58%" },
  { name: "Oceanus Procellarum", top: "45%", left: "34%" },
  { name: "Tycho", top: "69%", left: "49%" },
  { name: "Copernicus", top: "50%", left: "45%" },
]

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function latLngToPercent(lat: number, lng: number): {
  top: string
  left: string
} {
  const x = ((lng + 180) / 360) * 100
  const y = ((90 - lat) / 180) * 100

  return {
    top: `${clamp(y, 10, 90)}%`,
    left: `${clamp(x, 8, 92)}%`,
  }
}

export default function PlanetSignalMoment({
  region,
  moonMode = false,
  questionLabel,
  lat,
  lng,
}: PlanetSignalMomentProps) {
  const points = moonMode ? MOON_POINTS : EARTH_POINTS
  const [introVisible, setIntroVisible] = useState(true)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setIntroVisible(false)
    }, 320)

    return () => {
      window.clearTimeout(timer)
    }
  }, [])

  const computedPoint = useMemo(() => {
    if (moonMode) return null
    if (typeof lat !== "number" || typeof lng !== "number") return null
    return latLngToPercent(lat, lng)
  }, [lat, lng, moonMode])

  const activePresetPoint = points.find((point) => point.name === region) ?? points[0]

  const activePoint = computedPoint
    ? {
        name: region,
        top: computedPoint.top,
        left: computedPoint.left,
      }
    : activePresetPoint

  const planetGlowShadow = moonMode
    ? "0 0 60px rgba(203,213,225,0.18), 0 0 160px rgba(148,163,184,0.18), inset 0 -40px 80px rgba(2,6,23,0.6)"
    : "0 0 60px rgba(56,189,248,0.24), 0 0 160px rgba(59,130,246,0.22), inset 0 -40px 80px rgba(2,6,23,0.6)"

  const planetReactShadow = moonMode
    ? "0 0 120px rgba(226,232,240,0.42), 0 0 220px rgba(148,163,184,0.28), inset 0 -40px 80px rgba(2,6,23,0.6)"
    : "0 0 120px rgba(125,211,252,0.6), 0 0 220px rgba(56,189,248,0.4), inset 0 -40px 80px rgba(2,6,23,0.6)"

  return (
    <div className="pointer-events-none relative h-[280px] w-full overflow-hidden rounded-[32px]">
      <style jsx>{`
        @keyframes planetFloat {
          0% {
            transform: scale(0.94);
            opacity: 0;
          }
          100% {
            transform: scale(1.02);
            opacity: 1;
          }
        }

        @keyframes planetSweep {
          0% {
            transform: translateX(-120%) rotate(10deg);
            opacity: 0;
          }
          20% {
            opacity: 0.22;
          }
          100% {
            transform: translateX(140%) rotate(10deg);
            opacity: 0;
          }
        }

        @keyframes signalPulse {
          0% {
            transform: translate(-50%, -50%) scale(0.7);
            opacity: 0.18;
          }
          70% {
            transform: translate(-50%, -50%) scale(2);
            opacity: 0.5;
          }
          100% {
            transform: translate(-50%, -50%) scale(2.35);
            opacity: 0;
          }
        }

        @keyframes signalDotIn {
          0% {
            transform: translate(-50%, -50%) scale(0.4);
            opacity: 0;
          }
          100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
          }
        }

        @keyframes textRise {
          0% {
            transform: translateY(10px);
            opacity: 0;
          }
          100% {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes arcReveal {
          0% {
            opacity: 0;
            transform: translateY(6px) scaleX(0.92);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scaleX(1);
          }
        }

        @keyframes arcGlow {
          0% {
            opacity: 0.18;
          }
          50% {
            opacity: 0.42;
          }
          100% {
            opacity: 0.18;
          }
        }

        @keyframes signalTravel {
          0% {
            stroke-dashoffset: 220;
            opacity: 0;
          }
          20% {
            opacity: 1;
          }
          100% {
            stroke-dashoffset: 0;
            opacity: 0;
          }
        }

        @keyframes impactFlash {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.6);
          }
          40% {
            opacity: 0.6;
            transform: translate(-50%, -50%) scale(1.2);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(1.8);
          }
        }

        @keyframes planetReact {
          0% {
            box-shadow: ${planetGlowShadow};
          }
          50% {
            box-shadow: ${planetReactShadow};
          }
          100% {
            box-shadow: ${planetGlowShadow};
          }
        }
      `}</style>

      <div
        className="absolute inset-0 bg-black transition-opacity duration-700"
        style={{ opacity: introVisible ? 1 : 0 }}
      />

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.04),transparent_55%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.35),rgba(2,6,23,0.65))]" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,6,23,0.22),rgba(2,6,23,0.04)_38%,rgba(2,6,23,0.12)_62%,rgba(2,6,23,0.28))]" />

      <div className="absolute left-[8%] top-[50%] h-[180px] w-[260px] -translate-y-1/2 rounded-full bg-sky-400/10 blur-3xl" />

      <div className="absolute inset-x-[18%] bottom-[18%] h-[52%] rounded-[999px] bg-[radial-gradient(circle_at_center,rgba(37,99,235,0.22),rgba(2,6,23,0.02)_72%)] blur-3xl" />

      <div
        className="absolute left-[58%] top-[45%] h-[270px] w-[270px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          animation:
            "planetFloat 900ms cubic-bezier(0.22,1,0.36,1) forwards, planetReact 1.4s ease-out 400ms",
          background: moonMode
            ? "radial-gradient(circle at 35% 30%, rgba(226,232,240,0.34), rgba(148,163,184,0.18) 30%, rgba(51,65,85,0.78) 72%, rgba(2,6,23,0.96) 100%)"
            : "radial-gradient(circle at 35% 30%, rgba(125,211,252,0.36), rgba(59,130,246,0.24) 28%, rgba(15,23,42,0.82) 70%, rgba(2,6,23,0.96) 100%)",
          boxShadow: planetGlowShadow,
        }}
      >
        <div
          className="absolute h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-300/30 blur-xl"
          style={{
            left: activePoint.left,
            top: activePoint.top,
            animation: "impactFlash 900ms ease-out forwards",
          }}
        />

        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "linear-gradient(to right, rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.08) 1px, transparent 1px)",
            backgroundSize: "26px 26px",
            maskImage:
              "radial-gradient(circle at center, black 62%, transparent 74%)",
            WebkitMaskImage:
              "radial-gradient(circle at center, black 62%, transparent 74%)",
            opacity: moonMode ? 0.12 : 0.18,
          }}
        />

        <div
          className="absolute inset-y-[-20%] w-[34%] bg-white/20 blur-2xl"
          style={{
            left: 0,
            animation: "planetSweep 3.8s ease-out infinite",
          }}
        />

        <div
          className="absolute inset-0 rounded-full"
          style={{
            border: moonMode
              ? "1px solid rgba(226,232,240,0.18)"
              : "1px solid rgba(125,211,252,0.22)",
            boxShadow: moonMode
              ? "inset 0 0 24px rgba(255,255,255,0.06)"
              : "inset 0 0 28px rgba(125,211,252,0.08)",
          }}
        />

        {points.map((point) => {
          const active = !computedPoint && point.name === activePoint.name

          return (
            <div
              key={point.name}
              className="absolute"
              style={{
                top: point.top,
                left: point.left,
              }}
            >
              {active ? (
                <>
                  <span
                    className="absolute h-12 w-12 rounded-full bg-white/20"
                    style={{
                      animation: "signalPulse 1.8s ease-out infinite",
                    }}
                  />
                  <span
                    className="absolute h-7 w-7 rounded-full bg-sky-300/20 blur-md"
                    style={{
                      transform: "translate(-50%, -50%)",
                    }}
                  />
                </>
              ) : null}

              <span
                className={`absolute h-3 w-3 rounded-full ${
                  active
                    ? "bg-white shadow-[0_0_28px_rgba(255,255,255,1),0_0_40px_rgba(125,211,252,0.6)]"
                    : "bg-white/55"
                }`}
                style={{
                  animation: active
                    ? "signalDotIn 650ms cubic-bezier(0.22,1,0.36,1) forwards"
                    : undefined,
                }}
              />
            </div>
          )
        })}

        {computedPoint ? (
          <div
            className="absolute"
            style={{
              top: activePoint.top,
              left: activePoint.left,
            }}
          >
            <span
              className="absolute h-12 w-12 rounded-full bg-white/20"
              style={{
                animation: "signalPulse 1.8s ease-out infinite",
              }}
            />
            <span
              className="absolute h-7 w-7 rounded-full bg-sky-300/20 blur-md"
              style={{
                transform: "translate(-50%, -50%)",
              }}
            />
            <span
              className="absolute h-3 w-3 rounded-full bg-white shadow-[0_0_28px_rgba(255,255,255,1),0_0_40px_rgba(125,211,252,0.6)]"
              style={{
                animation:
                  "signalDotIn 650ms cubic-bezier(0.22,1,0.36,1) forwards",
              }}
            />
          </div>
        ) : null}
      </div>

      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1000 280"
        preserveAspectRatio="none"
      >
        <path
          d="M185 205 C 310 160, 430 138, 555 146"
          fill="none"
          stroke={moonMode ? "rgba(226,232,240,0.18)" : "rgba(125,211,252,0.24)"}
          strokeWidth="2"
          strokeLinecap="round"
          style={{
            filter: "blur(0.4px)",
            animation:
              "arcReveal 900ms cubic-bezier(0.22,1,0.36,1) 120ms both, arcGlow 2.4s ease-in-out infinite",
          }}
        />
        <path
          d="M215 220 C 332 174, 430 154, 540 160"
          fill="none"
          stroke={moonMode ? "rgba(226,232,240,0.08)" : "rgba(96,165,250,0.14)"}
          strokeWidth="1"
          strokeLinecap="round"
          style={{
            animation: "arcReveal 1000ms cubic-bezier(0.22,1,0.36,1) 180ms both",
          }}
        />
        <path
          d="M185 205 C 310 160, 430 138, 555 146"
          fill="none"
          stroke="rgba(125,211,252,0.6)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="220"
          style={{
            animation: "signalTravel 1.2s cubic-bezier(0.22,1,0.36,1) forwards",
          }}
        />
      </svg>

      <div
        className="absolute left-[18%] top-[58%] h-[2px] w-[38%]"
        style={{
          background:
            "linear-gradient(90deg, rgba(125,211,252,0.0), rgba(125,211,252,0.9), rgba(125,211,252,0.0))",
          filter: "blur(1px)",
          opacity: 0.6,
          transform: "rotate(-8deg)",
          animation:
            "arcReveal 900ms cubic-bezier(0.22,1,0.36,1) 200ms both, planetSweep 4s linear infinite",
        }}
      />

      <div
        className="absolute left-8 top-10 z-20"
        style={{
          animation: "textRise 700ms cubic-bezier(0.22,1,0.36,1) 720ms both",
        }}
      >
        <div className="text-[10px] uppercase tracking-[0.3em] text-white/55">
          Audience signal
        </div>
        <div className="mt-2 text-[26px] font-semibold tracking-tight text-white">
          {moonMode ? `Question from ${activePoint.name}` : `Question from ${region}`}
        </div>
        {questionLabel ? (
          <div className="mt-2 max-w-[520px] text-sm text-white/72">
            {questionLabel}
          </div>
        ) : null}
      </div>

      <div
        className="absolute bottom-8 right-6 rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-white/60 backdrop-blur"
        style={{
          animation: "textRise 700ms cubic-bezier(0.22,1,0.36,1) 820ms both",
        }}
      >
        {moonMode ? "Lunar uplink" : "Earth view"}
      </div>
    </div>
  )
}