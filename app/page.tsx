"use client"

import Link from "next/link"

const features = [
  {
    icon: "🚀",
    title: "Built to Scale",
    body: "Whether you’re hosting 20 people or 20,000, Jupiter handles it with reliable, high-performance streaming built for real audience size.",
  },
  {
    icon: "🎤",
    title: "Designed for Real Events",
    body: "Run webinars, summits, panels, and live broadcasts with tools made for professional hosts instead of patched-together meeting software.",
  },
  {
    icon: "⚡",
    title: "Simple for Hosts",
    body: "Launch events in minutes with a clean admin experience, flexible media controls, and no technical headaches.",
  },
  {
    icon: "🌎",
    title: "Engage Your Audience",
    body: "Keep audiences involved with live chat, Q&A, and interactive features that carry attention from start to finish.",
  },
]

const useCases = [
  "Corporate webinars",
  "Medical and pharma education",
  "Virtual summits",
  "Product launches",
  "Training programs",
  "Live broadcasts",
]

const stats = [
  { value: "20", label: "Small team events" },
  { value: "20K", label: "Large audience scale" },
  { value: "RTMP", label: "Live broadcast support" },
  { value: "Q&A", label: "Audience engagement" },
]

function JupiterHudOverlay() {
  return (
    <svg
      viewBox="0 0 400 400"
      className="h-full w-full opacity-40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="200" cy="200" r="150" stroke="rgba(255,255,255,0.08)" strokeWidth="1.25" />
      <circle cx="200" cy="200" r="128" stroke="rgba(129,140,248,0.12)" strokeWidth="1" />
      <circle cx="200" cy="200" r="102" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />

      <path
        d="M200 40 A160 160 0 0 1 334 112"
        stroke="rgba(129,140,248,0.55)"
        strokeWidth="3"
        strokeLinecap="round"
      />

      <path
        d="M360 198 A160 160 0 0 1 316 310"
        stroke="rgba(56,189,248,0.45)"
        strokeWidth="3"
        strokeLinecap="round"
      />

      <circle cx="200" cy="40" r="4" fill="white" />
      <circle cx="334" cy="112" r="3" fill="#818cf8" />
      <circle cx="360" cy="198" r="3" fill="#38bdf8" />
    </svg>
  )
}

export default function HomePage() {
  return (
    <main className="relative min-h-screen w-full overflow-x-hidden bg-[radial-gradient(circle_at_top,#0b1437,#020617)] text-white">
      <style jsx>{`
        @keyframes hudRotate {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes hudRotateReverse {
          from {
            transform: rotate(360deg);
          }
          to {
            transform: rotate(0deg);
          }
        }

        @keyframes planetFloat {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-12px);
          }
        }

        @keyframes stormDrift {
          0% {
            transform: translateX(0px);
          }
          50% {
            transform: translateX(6px);
          }
          100% {
            transform: translateX(0px);
          }
        }

        @keyframes orbitSatellite {
          from {
            transform: rotate(0deg) translateX(180px) rotate(0deg);
          }
          to {
            transform: rotate(360deg) translateX(180px) rotate(-360deg);
          }
        }

        @keyframes orbitSatelliteSlow {
          from {
            transform: rotate(0deg) translateX(220px) rotate(0deg);
          }
          to {
            transform: rotate(360deg) translateX(220px) rotate(-360deg);
          }
        }

        @keyframes twinkle {
          0%,
          100% {
            opacity: 0.25;
            transform: scale(1);
          }
          50% {
            opacity: 0.9;
            transform: scale(1.45);
          }
        }

        @keyframes starDriftSlow {
          0% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(10px);
          }
          100% {
            transform: translateY(0px);
          }
        }

        @keyframes starDriftMedium {
          0% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-12px);
          }
          100% {
            transform: translateY(0px);
          }
        }

        .hud-rotate {
          animation: hudRotate 36s linear infinite;
        }

        .hud-rotate-reverse {
          animation: hudRotateReverse 60s linear infinite;
        }

        .planet-float {
          animation: planetFloat 8s ease-in-out infinite;
        }

        .storm-drift {
          animation: stormDrift 12s ease-in-out infinite;
        }

        .satellite-orbit {
          position: absolute;
          left: 50%;
          top: 50%;
          animation: orbitSatellite 18s linear infinite;
        }

        .satellite-orbit-slow {
          position: absolute;
          left: 50%;
          top: 50%;
          animation: orbitSatelliteSlow 28s linear infinite;
        }

        .twinkle {
          animation: twinkle 4.5s ease-in-out infinite;
        }

        .star-drift-slow {
          animation: starDriftSlow 14s ease-in-out infinite;
        }

        .star-drift-medium {
          animation: starDriftMedium 18s ease-in-out infinite;
        }
      `}</style>

      {/* BACKGROUND STARFIELD */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.16),transparent_22%),radial-gradient(circle_at_80%_18%,rgba(56,189,248,0.12),transparent_20%),radial-gradient(circle_at_50%_75%,rgba(244,114,182,0.08),transparent_24%)]" />

        <div className="absolute inset-0 star-drift-slow">
          <div className="twinkle absolute left-[8%] top-[10%] h-1 w-1 rounded-full bg-white/80" />
          <div className="twinkle absolute left-[18%] top-[22%] h-1.5 w-1.5 rounded-full bg-white/70" />
          <div className="twinkle absolute left-[28%] top-[12%] h-1 w-1 rounded-full bg-indigo-200/80" />
          <div className="twinkle absolute left-[42%] top-[18%] h-1.5 w-1.5 rounded-full bg-white/75" />
          <div className="twinkle absolute left-[57%] top-[8%] h-1 w-1 rounded-full bg-sky-200/80" />
          <div className="twinkle absolute left-[70%] top-[16%] h-1.5 w-1.5 rounded-full bg-white/75" />
          <div className="twinkle absolute left-[82%] top-[12%] h-1 w-1 rounded-full bg-fuchsia-200/80" />
          <div className="twinkle absolute left-[90%] top-[26%] h-1.5 w-1.5 rounded-full bg-white/70" />
        </div>

        <div className="absolute inset-0 star-drift-medium">
          <div className="twinkle absolute left-[10%] top-[38%] h-1 w-1 rounded-full bg-white/70" />
          <div className="twinkle absolute left-[24%] top-[48%] h-1.5 w-1.5 rounded-full bg-white/80" />
          <div className="twinkle absolute left-[36%] top-[34%] h-1 w-1 rounded-full bg-indigo-200/70" />
          <div className="twinkle absolute left-[48%] top-[44%] h-1.5 w-1.5 rounded-full bg-white/75" />
          <div className="twinkle absolute left-[63%] top-[40%] h-1 w-1 rounded-full bg-sky-200/75" />
          <div className="twinkle absolute left-[76%] top-[50%] h-1.5 w-1.5 rounded-full bg-white/80" />
          <div className="twinkle absolute left-[88%] top-[36%] h-1 w-1 rounded-full bg-fuchsia-200/75" />
        </div>

        <div className="absolute inset-0 star-drift-slow">
          <div className="twinkle absolute left-[6%] top-[72%] h-1 w-1 rounded-full bg-white/75" />
          <div className="twinkle absolute left-[19%] top-[82%] h-1.5 w-1.5 rounded-full bg-white/70" />
          <div className="twinkle absolute left-[33%] top-[68%] h-1 w-1 rounded-full bg-indigo-200/75" />
          <div className="twinkle absolute left-[46%] top-[84%] h-1.5 w-1.5 rounded-full bg-white/80" />
          <div className="twinkle absolute left-[60%] top-[74%] h-1 w-1 rounded-full bg-sky-200/75" />
          <div className="twinkle absolute left-[72%] top-[88%] h-1.5 w-1.5 rounded-full bg-white/80" />
          <div className="twinkle absolute left-[86%] top-[78%] h-1 w-1 rounded-full bg-fuchsia-200/75" />
        </div>
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 sm:px-6 lg:px-8">
        {/* HEADER */}
        <header className="flex items-center justify-between gap-4 py-6">
          <div className="flex items-center gap-3">
            <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/10 backdrop-blur">
              <div className="absolute inset-0 rounded-2xl bg-indigo-400/20 blur-sm" />
              <span className="relative text-xl">🪐</span>
            </div>

            <div>
              <div className="text-lg font-semibold tracking-tight">Jupiter.events</div>
              <div className="text-xs uppercase tracking-[0.24em] text-white/45">
                Host events with gravity
              </div>
            </div>
          </div>
        </header>

        {/* HERO */}
        <section className="grid flex-1 items-center gap-14 py-10 lg:grid-cols-[1.08fr_0.92fr]">
          {/* LEFT */}
          <div>
            <div className="inline-flex items-center rounded-full border border-indigo-400/30 bg-indigo-400/10 px-4 py-2 text-sm text-indigo-100 backdrop-blur">
              Webinar platform • Summits • Live broadcasts
            </div>

            <h1 className="mt-6 text-5xl font-semibold tracking-tight md:text-7xl">
              Host events with <span className="text-indigo-300">gravity.</span>
            </h1>

            <p className="mt-6 max-w-2xl text-lg text-white/70">
              Run webinars, summits, and live broadcasts on a platform built to scale.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/admin/login"
                className="rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-slate-950 shadow-xl shadow-white/10 transition hover:-translate-y-0.5"
              >
                Start Hosting
              </Link>

              <Link
                href="/access"
                className="rounded-2xl border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/10"
              >
                Access Event
              </Link>
            </div>

            <div className="mt-10 grid max-w-2xl grid-cols-2 gap-4 md:grid-cols-4">
              {stats.map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur"
                >
                  <div className="text-2xl font-semibold">{item.value}</div>
                  <div className="mt-1 text-sm text-white/55">{item.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT PLANET */}
          <div className="relative mx-auto flex w-full max-w-xl flex-col items-center justify-center pb-32">
            <div className="relative h-[320px] w-[320px] planet-float sm:h-[380px] sm:w-[380px] md:h-[460px] md:w-[460px]">
              {/* glow */}
              <div className="absolute inset-0 rounded-full bg-indigo-500/10 blur-3xl" />

              {/* planet */}
              <div className="absolute left-1/2 top-1/2 h-[200px] w-[200px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-[#f6d2a2] via-[#d88d52] to-[#8e4f2c] shadow-[0_0_80px_rgba(251,146,60,0.32)]">
                {/* cloud bands */}
                <div className="absolute inset-0 overflow-hidden rounded-full">
                  <div className="absolute -left-[10%] top-[18%] h-5 w-[120%] rounded-full bg-[#f1d8b8]/70 blur-sm" />
                  <div className="absolute -left-[10%] top-[32%] h-4 w-[120%] rounded-full bg-[#c97843]/40" />
                  <div className="absolute -left-[10%] top-[46%] h-6 w-[120%] rounded-full bg-[#efd0a2]/60 blur-sm" />
                  <div className="absolute -left-[10%] top-[60%] h-4 w-[120%] rounded-full bg-[#9f5a34]/40" />
                  <div className="absolute -left-[10%] top-[74%] h-6 w-[120%] rounded-full bg-[#e5bf92]/40 blur-sm" />

                  {/* storm */}
                  <div className="storm-drift absolute left-[22%] top-[55%] h-8 w-14 rounded-full bg-[#c96d47]/60 blur-[1px]" />
                </div>

                {/* HUD overlays */}
                <div className="pointer-events-none absolute inset-[-20%] hud-rotate">
                  <JupiterHudOverlay />
                </div>

                <div className="pointer-events-none absolute inset-[-10%] hud-rotate-reverse opacity-20">
                  <svg viewBox="0 0 400 400" className="h-full w-full" fill="none">
                    <circle
                      cx="200"
                      cy="200"
                      r="142"
                      stroke="rgba(255,255,255,0.12)"
                      strokeWidth="1"
                      strokeDasharray="10 14"
                    />
                    <circle
                      cx="200"
                      cy="200"
                      r="118"
                      stroke="rgba(255,255,255,0.08)"
                      strokeWidth="1"
                      strokeDasharray="6 10"
                    />
                  </svg>
                </div>
              </div>

              {/* SATELLITE 1 */}
              <div className="satellite-orbit">
                <div className="h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-300 shadow-[0_0_12px_rgba(129,140,248,0.9)]" />
              </div>

              {/* SATELLITE 2 */}
              <div className="satellite-orbit-slow">
                <div className="h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-300 shadow-[0_0_10px_rgba(56,189,248,0.9)]" />
              </div>

              {/* SATELLITE 3 */}
              <div className="satellite-orbit" style={{ animationDuration: "26s" }}>
                <div className="h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fuchsia-300 shadow-[0_0_10px_rgba(244,114,182,0.9)]" />
              </div>

              {/* outer ring hint */}
              <div className="absolute left-1/2 top-1/2 h-[290px] w-[290px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/5 md:h-[360px] md:w-[360px]" />
            </div>

            <div className="relative mt-6 w-[88%] max-w-[360px] rounded-3xl border border-white/10 bg-slate-950/80 p-4 text-left shadow-xl backdrop-blur-xl">
              <div className="absolute inset-0 rounded-3xl bg-indigo-400/10 blur-xl" />

              <div className="relative">
                <div className="text-[10px] uppercase tracking-[0.2em] text-white/45">
                  Live Event Dashboard
                </div>

                <div className="mt-2 text-lg font-semibold">Broadcast-ready control</div>

                <div className="mt-2 text-sm text-white/60">
                  MP4 · RTMP · HLS · Q&A · Chat
                </div>

                <div className="mt-4 inline-flex rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-300">
                  LIVE NOW
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* WHY */}
        <section id="why" className="pb-20">
          <div className="max-w-2xl">
            <div className="text-sm font-medium uppercase tracking-[0.25em] text-indigo-300/80">
              Why Jupiter
            </div>

            <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-5xl">
              A platform built for events that matter.
            </h2>

            <p className="mt-4 text-lg leading-8 text-white/65">
              Jupiter.events combines broadcast-level delivery with a clean event workflow
              for hosts, speakers, and attendees.
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-6 shadow-xl backdrop-blur"
              >
                <div className="text-3xl">{feature.icon}</div>
                <h3 className="mt-5 text-xl font-semibold">{feature.title}</h3>
                <p className="mt-3 text-sm leading-7 text-white/65">{feature.body}</p>
              </div>
            ))}
          </div>
        </section>

        <footer className="border-t border-white/10 py-6 text-sm text-white/45">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>© 2026 Jupiter.events</div>

            <div className="flex items-center gap-5">
              <Link href="/access" className="transition hover:text-white">
                Access Event
              </Link>

              <Link href="/admin/login" className="transition hover:text-white">
                Admin Login
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </main>
  )
}