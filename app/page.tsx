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

const stars = [
  { top: "8%", left: "12%", size: "h-1 w-1", delay: "0s" },
  { top: "18%", left: "78%", size: "h-1.5 w-1.5", delay: "1s" },
  { top: "28%", left: "65%", size: "h-1 w-1", delay: "2s" },
  { top: "35%", left: "18%", size: "h-2 w-2", delay: "0.5s" },
  { top: "42%", left: "84%", size: "h-1 w-1", delay: "1.5s" },
  { top: "55%", left: "10%", size: "h-1.5 w-1.5", delay: "2.5s" },
  { top: "62%", left: "52%", size: "h-1 w-1", delay: "1.2s" },
  { top: "74%", left: "73%", size: "h-2 w-2", delay: "2.2s" },
  { top: "82%", left: "24%", size: "h-1 w-1", delay: "0.8s" },
  { top: "88%", left: "90%", size: "h-1.5 w-1.5", delay: "1.8s" },
]

export default function HomePage() {
  return (
    <main className="relative min-h-screen w-full overflow-x-hidden bg-slate-950 text-white">
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
        @keyframes floatSlow {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-12px);
          }
        }

        @keyframes orbitSpin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes orbitReverse {
          from {
            transform: rotate(360deg);
          }
          to {
            transform: rotate(0deg);
          }
        }

        @keyframes pulseGlow {
          0%,
          100% {
            opacity: 0.55;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.08);
          }
        }

        @keyframes twinkle {
          0%,
          100% {
            opacity: 0.25;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.7);
          }
        }

        .animate-float-slow {
          animation: floatSlow 8s ease-in-out infinite;
        }

        .animate-orbit-spin {
          animation: orbitSpin 18s linear infinite;
        }

        .animate-orbit-reverse {
          animation: orbitReverse 26s linear infinite;
        }

        .animate-pulse-glow {
          animation: pulseGlow 5s ease-in-out infinite;
        }

        .animate-twinkle {
          animation: twinkle 4s ease-in-out infinite;
        }
      `}</style>

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.30),transparent_28%),radial-gradient(circle_at_80%_15%,rgba(59,130,246,0.22),transparent_24%),radial-gradient(circle_at_20%_80%,rgba(168,85,247,0.18),transparent_28%),radial-gradient(circle_at_50%_120%,rgba(249,115,22,0.12),transparent_26%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(2,6,23,0.2),rgba(2,6,23,0.95))]" />

        {stars.map((star, i) => (
          <div
            key={i}
            className={`absolute ${star.size} animate-twinkle rounded-full bg-white/80`}
            style={{ top: star.top, left: star.left, animationDelay: star.delay }}
          />
        ))}

        <div className="absolute -left-20 top-24 h-56 w-56 rounded-full bg-indigo-500/20 blur-3xl md:-left-32 md:h-72 md:w-72" />
        <div className="absolute right-0 top-10 h-64 w-64 rounded-full bg-sky-500/10 blur-3xl md:h-96 md:w-96" />
        <div className="absolute bottom-0 left-1/3 h-56 w-56 rounded-full bg-fuchsia-500/10 blur-3xl md:h-80 md:w-80" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col overflow-x-hidden px-5 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between gap-4 py-6">
          <div className="min-w-0 flex items-center gap-3">
            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/10 backdrop-blur">
              <div className="absolute inset-0 rounded-2xl bg-indigo-400/20 blur-sm" />
              <span className="relative text-xl">🪐</span>
            </div>
            <div className="min-w-0">
              <div className="truncate text-lg font-semibold tracking-tight">Jupiter.events</div>
              <div className="truncate text-xs uppercase tracking-[0.24em] text-white/45">
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

        <section className="grid flex-1 items-center gap-14 overflow-x-hidden py-10 lg:grid-cols-[1.08fr_0.92fr] lg:py-16">
          <div className="min-w-0">
            <div className="inline-flex max-w-full items-center rounded-full border border-indigo-400/30 bg-indigo-400/10 px-4 py-2 text-sm text-indigo-100 backdrop-blur">
              <span className="truncate">Webinar platform • Summits • Live broadcasts</span>
            </div>

            <h1 className="mt-6 max-w-4xl text-4xl font-semibold tracking-tight sm:text-5xl md:text-7xl md:leading-[1.02]">
              Host events with <span className="text-indigo-300">gravity.</span>
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-7 text-white/70 sm:text-lg sm:leading-8 md:text-xl">
              Run webinars, summits, and live broadcasts on a platform built to scale.
              Launch professional virtual events in minutes, stream to thousands, and
              keep audiences engaged from start to finish.
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
                  className="min-w-0 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur"
                >
                  <div className="text-2xl font-semibold">{item.value}</div>
                  <div className="mt-1 text-sm text-white/55">{item.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative mx-auto flex w-full max-w-xl items-center justify-center overflow-hidden">
            <div className="relative h-[320px] w-[320px] max-w-full animate-float-slow sm:h-[380px] sm:w-[380px] md:h-[460px] md:w-[460px]">
              <div className="absolute inset-0 rounded-full bg-indigo-500/10 blur-3xl" />
              <div className="absolute inset-[36px] rounded-full border border-white/10 sm:inset-[44px] md:inset-[52px]" />
              <div className="absolute inset-[62px] rounded-full border border-indigo-300/15 sm:inset-[74px] md:inset-[88px]" />
              <div className="absolute inset-[88px] rounded-full border border-sky-300/10 sm:inset-[102px] md:inset-[124px]" />

              <div className="absolute inset-[28px] animate-orbit-spin sm:inset-[34px] md:inset-[40px]">
                <div className="absolute left-1/2 top-0 h-4 w-4 -translate-x-1/2 rounded-full bg-white/80 shadow-[0_0_20px_rgba(255,255,255,0.9)]" />
              </div>

              <div className="absolute inset-[58px] animate-orbit-reverse sm:inset-[70px] md:inset-[82px]">
                <div className="absolute right-0 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-sky-300/80 shadow-[0_0_18px_rgba(125,211,252,0.9)]" />
              </div>

              <div className="absolute inset-[86px] animate-orbit-spin sm:inset-[102px] md:inset-[120px]">
                <div className="absolute bottom-0 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-fuchsia-300/80 shadow-[0_0_16px_rgba(244,114,182,0.9)]" />
              </div>

              <div className="absolute left-1/2 top-1/2 h-[180px] w-[180px] -translate-x-1/2 -translate-y-1/2 sm:h-[220px] sm:w-[220px] md:h-[260px] md:w-[260px]">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-orange-300 via-amber-500 to-orange-700 shadow-[0_0_80px_rgba(251,146,60,0.35)]" />
                <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.35),transparent_30%),radial-gradient(circle_at_70%_70%,rgba(120,53,15,0.35),transparent_35%)]" />
                <div className="absolute left-[10%] top-[28%] h-8 w-28 rounded-full bg-white/10 blur-sm sm:h-9 sm:w-32 md:h-10 md:w-40" />
                <div className="absolute left-[20%] top-[48%] h-6 w-24 rounded-full bg-amber-900/30 blur-sm sm:h-7 sm:w-28 md:h-8 md:w-36" />
                <div className="absolute left-[15%] top-[62%] h-5 w-32 rounded-full bg-orange-950/25 blur-sm sm:h-6 sm:w-36 md:h-7 md:w-44" />
              </div>

              <div className="absolute left-1/2 top-1/2 h-[240px] w-[240px] -translate-x-1/2 -translate-y-1/2 sm:h-[290px] sm:w-[290px] md:h-[340px] md:w-[340px]">
                <div className="absolute inset-0 rounded-full border border-amber-200/20" />
                <div className="absolute left-1/2 top-1/2 h-[84px] w-full -translate-x-1/2 -translate-y-1/2 rounded-full border border-amber-100/20 bg-amber-100/5 blur-[1px] sm:h-[100px] md:h-[120px]" />
              </div>

              <div className="absolute bottom-1 right-1 max-w-[180px] rounded-2xl border border-white/10 bg-slate-950/70 p-3 backdrop-blur-xl sm:bottom-2 sm:right-4 sm:max-w-[220px] sm:rounded-3xl sm:p-4 md:right-8 md:max-w-none">
                <div className="text-[10px] uppercase tracking-[0.2em] text-white/45 sm:text-xs">
                  Live Event Dashboard
                </div>
                <div className="mt-2 text-sm font-semibold sm:text-base md:text-lg">
                  Broadcast-ready control
                </div>
                <div className="mt-2 text-xs text-white/60 sm:text-sm">
                  MP4 · RTMP · HLS · Q&A · Chat
                </div>
                <div className="mt-4 inline-flex rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-[10px] font-medium text-emerald-300 sm:text-xs">
                  LIVE NOW
                </div>
              </div>

              <div className="absolute left-1 top-6 max-w-[130px] rounded-2xl border border-white/10 bg-white/5 px-3 py-2 backdrop-blur animate-pulse-glow sm:left-2 sm:top-8 sm:max-w-none sm:px-4 sm:py-3">
                <div className="text-xs font-medium sm:text-sm">20K viewers</div>
                <div className="text-[10px] text-white/55 sm:text-xs">Scalable delivery</div>
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

        <section id="use-cases" className="py-12 md:py-16">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 md:p-10">
            <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-center">
              <div>
                <div className="text-sm font-medium uppercase tracking-[0.25em] text-indigo-300/80">
                  Use Cases
                </div>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-5xl">
                  Made for real-world events.
                </h2>
                <p className="mt-4 max-w-xl text-lg leading-8 text-white/65">
                  Whether you’re producing internal webinars, medical education,
                  virtual summits, or public broadcasts, Jupiter is built to adapt.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {useCases.map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-white/10 bg-slate-950/60 px-5 py-4 text-sm font-medium text-white/85"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="py-12 md:py-16">
          <div className="rounded-[2.25rem] border border-indigo-300/20 bg-gradient-to-br from-indigo-500/20 via-slate-900 to-fuchsia-500/10 p-8 text-center shadow-2xl md:p-14">
            <div className="mx-auto max-w-3xl">
              <div className="text-sm font-medium uppercase tracking-[0.3em] text-indigo-200/80">
                Jupiter.events
              </div>
              <h2 className="mt-4 text-4xl font-semibold tracking-tight md:text-6xl">
                Run your next event with gravity.
              </h2>
              <p className="mt-5 text-lg leading-8 text-white/70">
                Host webinars, summits, and live broadcasts on a platform designed
                for real audiences and real scale.
              </p>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <Link
                  href="/admin/login"
                  className="rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5"
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
            </div>
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