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
      className="h-full w-full opacity-70"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="200" cy="200" r="150" stroke="rgba(255,255,255,0.10)" strokeWidth="1.5" />
      <circle cx="200" cy="200" r="124" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
      <circle cx="200" cy="200" r="98" stroke="rgba(255,255,255,0.07)" strokeWidth="1" />

      <path
        d="M200 40 A160 160 0 0 1 330 105"
        stroke="rgba(129,140,248,0.75)"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M360 200 A160 160 0 0 1 315 310"
        stroke="rgba(56,189,248,0.65)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M85 315 A160 160 0 0 1 40 200"
        stroke="rgba(244,114,182,0.55)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M120 60 A160 160 0 0 1 200 40"
        stroke="rgba(255,255,255,0.35)"
        strokeWidth="2"
        strokeLinecap="round"
      />

      <circle cx="200" cy="40" r="5" fill="rgba(255,255,255,0.95)" />
      <circle cx="330" cy="105" r="4" fill="rgba(129,140,248,0.95)" />
      <circle cx="360" cy="200" r="4" fill="rgba(56,189,248,0.95)" />
      <circle cx="315" cy="310" r="4" fill="rgba(244,114,182,0.95)" />
      <circle cx="85" cy="315" r="4" fill="rgba(255,255,255,0.85)" />

      <path
        d="M200 86 L200 114"
        stroke="rgba(255,255,255,0.20)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M200 286 L200 314"
        stroke="rgba(255,255,255,0.20)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M86 200 L114 200"
        stroke="rgba(255,255,255,0.20)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M286 200 L314 200"
        stroke="rgba(255,255,255,0.20)"
        strokeWidth="2"
        strokeLinecap="round"
      />

      <circle cx="200" cy="200" r="52" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
      <circle cx="200" cy="200" r="18" fill="rgba(255,255,255,0.06)" />
      <circle cx="200" cy="200" r="6" fill="rgba(255,255,255,0.18)" />
    </svg>
  )
}

export default function HomePage() {
  return (
    <main className="relative min-h-screen w-full overflow-x-hidden bg-[radial-gradient(circle_at_top,#0b1437,#020617)] text-white">
      <style jsx global>{`
        html,
        body {
          max-width: 100%;
          overflow-x: hidden;
        }

        * {
          box-sizing: border-box;
        }
      `}</style>

      <style jsx>{`
        @keyframes hudRotate {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .animate-hud-rotate {
          animation: hudRotate 24s linear infinite;
        }
      `}</style>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 sm:px-6 lg:px-8">
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

          <nav className="hidden items-center gap-6 text-sm text-white/70 md:flex">
            <a href="#why" className="transition hover:text-white">
              Why Jupiter
            </a>

            <a href="#use-cases" className="transition hover:text-white">
              Use Cases
            </a>

            <Link href="/access" className="transition hover:text-white">
              Access Event
            </Link>

            <Link
              href="/admin/login"
              className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-white transition hover:bg-white/15"
            >
              Admin
            </Link>
          </nav>
        </header>

        <section className="grid flex-1 items-center gap-14 py-10 lg:grid-cols-[1.08fr_0.92fr] lg:py-16">
          <div>
            <div className="inline-flex items-center rounded-full border border-indigo-400/30 bg-indigo-400/10 px-4 py-2 text-sm text-indigo-100 backdrop-blur">
              Webinar platform • Summits • Live broadcasts
            </div>

            <h1 className="mt-6 max-w-4xl text-4xl font-semibold tracking-tight sm:text-5xl md:text-7xl md:leading-[1.02]">
              Host events with <span className="text-indigo-300">gravity.</span>
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-7 text-white/70 sm:text-lg sm:leading-8 md:text-xl">
              Run webinars, summits, and live broadcasts on a platform built to scale.
              Launch professional virtual events in minutes, stream to thousands,
              and keep audiences engaged from start to finish.
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

          <div className="relative mx-auto flex w-full max-w-xl flex-col items-center justify-center pb-32">
            <div className="relative h-[320px] w-[320px] animate-[float_8s_ease-in-out_infinite] sm:h-[380px] sm:w-[380px] md:h-[460px] md:w-[460px]">
              <div className="absolute inset-0 rounded-full bg-indigo-500/10 blur-3xl" />

              <div className="absolute left-1/2 top-1/2 h-[180px] w-[180px] -translate-x-1/2 -translate-y-1/2 sm:h-[220px] sm:w-[220px] md:h-[260px] md:w-[260px]">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-orange-300 via-amber-500 to-orange-700 shadow-[0_0_80px_rgba(251,146,60,0.35)]" />
                <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.35),transparent_30%),radial-gradient(circle_at_70%_70%,rgba(120,53,15,0.35),transparent_35%)]" />
                <div className="absolute left-[10%] top-[28%] h-8 w-28 rounded-full bg-white/10 blur-sm sm:h-9 sm:w-32 md:h-10 md:w-40" />
                <div className="absolute left-[20%] top-[48%] h-6 w-24 rounded-full bg-amber-900/30 blur-sm sm:h-7 sm:w-28 md:h-8 md:w-36" />
                <div className="absolute left-[15%] top-[62%] h-5 w-32 rounded-full bg-orange-950/25 blur-sm sm:h-6 sm:w-36 md:h-7 md:w-44" />

                <div className="pointer-events-none absolute inset-[-18%] z-20 animate-hud-rotate">
                  <JupiterHudOverlay />
                </div>
              </div>

              <div className="absolute left-1/2 top-1/2 h-[240px] w-[240px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-amber-200/20 sm:h-[290px] sm:w-[290px] md:h-[340px] md:w-[340px]" />

              <div className="absolute left-0 top-6 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 backdrop-blur">
                <div className="text-xs font-medium">20K viewers</div>
                <div className="text-[10px] text-white/55">Scalable delivery</div>
              </div>
            </div>

            <div className="relative mt-6 w-[88%] max-w-[360px] rounded-3xl border border-white/10 bg-slate-950/80 p-4 text-left shadow-xl backdrop-blur-xl">
              <div className="absolute inset-0 rounded-3xl bg-indigo-400/10 blur-xl" />

              <div className="relative">
                <div className="text-[10px] uppercase tracking-[0.2em] text-white/45">
                  Live Event Dashboard
                </div>

                <div className="mt-2 text-lg font-semibold">
                  Broadcast-ready control
                </div>

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

        <section id="why" className="py-12 md:py-16">
          <div className="max-w-2xl">
            <div className="text-sm font-medium uppercase tracking-[0.25em] text-indigo-300/80">
              Why Jupiter
            </div>

            <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-5xl">
              A platform built for events that matter.
            </h2>

            <p className="mt-4 text-lg leading-8 text-white/65">
              Jupiter.events combines broadcast-level delivery with a clean event
              workflow for hosts, speakers, and attendees.
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