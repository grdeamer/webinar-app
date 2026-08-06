"use client"

import { motion } from "framer-motion"
import { Clapperboard, Mic2, Orbit } from "lucide-react"
import JupiterLogo from "@/components/brand/JupiterLogo"

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.7,
    },
  },
}

function Stars() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 opacity-70 [background-image:radial-gradient(circle_at_20%_30%,rgba(255,255,255,.9)_0_1px,transparent_1px),radial-gradient(circle_at_70%_20%,rgba(147,197,253,.8)_0_1px,transparent_1px),radial-gradient(circle_at_40%_80%,rgba(255,255,255,.7)_0_1px,transparent_1px),radial-gradient(circle_at_90%_70%,rgba(167,139,250,.8)_0_1px,transparent_1px)] [background-size:180px_180px,260px_260px,220px_220px,320px_320px]" />
      <motion.div
        className="absolute -inset-20 opacity-40 [background-image:radial-gradient(circle,rgba(96,165,250,.9)_0_1px,transparent_1px)] [background-size:120px_120px]"
        animate={{ x: [0, 30, 0], y: [0, -24, 0] }}
        transition={{ duration: 22, repeat: Infinity }}
      />
    </div>
  )
}

function OrbitField() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <motion.div
        className="absolute left-1/2 top-28 h-[360px] w-[1200px] -translate-x-1/2 rounded-[100%] border border-blue-400/20 shadow-[0_0_60px_rgba(59,130,246,.35)]"
        animate={{ rotate: [0, 360] }}
        transition={{ duration: 80, repeat: Infinity }}
      />
      <motion.div
        className="absolute left-1/2 top-36 h-[260px] w-[980px] -translate-x-1/2 rounded-[100%] border border-violet-400/20 shadow-[0_0_45px_rgba(139,92,246,.3)]"
        animate={{ rotate: [360, 0] }}
        transition={{ duration: 65, repeat: Infinity }}
      />
      <motion.div
        className="absolute left-[12%] top-44 h-1 w-44 rounded-full bg-gradient-to-r from-transparent via-blue-300 to-transparent blur-sm"
        animate={{ x: [0, 760], opacity: [0, 1, 0] }}
        transition={{ duration: 8, repeat: Infinity }}
      />
    </div>
  )
}

function Nav() {
  return (
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-white/10 bg-[#020617]/55 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <JupiterLogo className="text-white" />

        <nav className="hidden items-center gap-8 text-sm text-white/70 md:flex">
          <a href="#platform">Platform</a>
          <a href="#scale">Scale</a>
        </nav>

        <div className="flex items-center gap-4 text-sm">
          <a className="hidden text-white/70 sm:block" href="/login">
            Sign in
          </a>
          <a
            href="/login"
            className="rounded-full bg-gradient-to-r from-blue-500 to-violet-500 px-5 py-2.5 shadow-[0_0_30px_rgba(99,102,241,.35)] transition hover:scale-105"
          >
            Start Producing
          </a>
        </div>
      </div>
    </header>
  )
}

export default function JupiterHome() {
  const pillars = [
    {
      title: "Set the Stage",
      icon: Mic2,
      body: "Build anticipation.",
    },
    {
      title: "Direct the Moment",
      icon: Clapperboard,
      body: "Shape the show live.",
    },
    {
      title: "Guide the Audience",
      icon: Orbit,
      body: "Move people seamlessly.",
    },
  ]

  const capabilities = ["Real-time", "Broadcast-grade", "Global + secure"]

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020617] text-white">
      <Stars />

      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(79,124,255,.18),transparent_34%),linear-gradient(to_bottom,transparent,rgba(2,6,23,.85)_45%,#020617)]" />

      <Nav />

      <section className="relative px-6 pb-24 pt-32 text-center md:pb-32 md:pt-44">
        <OrbitField />

        <motion.div
          initial="hidden"
          animate="show"
          variants={fadeUp}
          className="relative mx-auto max-w-5xl"
        >
          <p className="mb-6 text-xs uppercase tracking-[0.42em] text-blue-200/75">
            ✦ Events with gravity
          </p>

          <h1 className="text-6xl font-semibold leading-none tracking-[-0.06em] md:text-8xl">
            Every Event
            <br />
            Tells a{" "}
            <span className="bg-gradient-to-r from-blue-300 via-blue-500 to-violet-400 bg-clip-text text-transparent drop-shadow-[0_0_25px_rgba(99,102,241,.45)]">
              Story.
            </span>
          </h1>

          <p className="mt-7 text-xl text-white/75">
            Produce live moments people remember.
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <a
              href="/login"
              className="group rounded-full bg-gradient-to-r from-blue-500 to-violet-500 px-8 py-4 font-medium shadow-[0_0_45px_rgba(99,102,241,.45)] transition hover:scale-105"
            >
              Start Producing
            </a>
          </div>
        </motion.div>
      </section>

      <section id="platform" className="relative scroll-mt-24 px-6 pb-24">
        <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-3">
          {pillars.map((pillar, i) => {
            const Icon = pillar.icon

            return (
              <motion.div
                key={pillar.title}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.35 }}
                variants={fadeUp}
                transition={{ delay: i * 0.08 }}
                className="group rounded-3xl border border-white/10 bg-white/[0.045] p-8 text-center backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-blue-300/30 hover:bg-white/[0.07]"
              >
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-blue-300/20 bg-gradient-to-br from-blue-500/20 to-violet-500/20 shadow-[0_0_40px_rgba(79,124,255,.25)] transition duration-300 group-hover:scale-105 group-hover:shadow-[0_0_60px_rgba(139,92,246,.35)]">
                  <Icon size={30} strokeWidth={1.75} className="text-blue-100" />
                </div>

                <h3 className="text-2xl font-medium">{pillar.title}</h3>
                <p className="mt-3 text-white/55">{pillar.body}</p>
              </motion.div>
            )
          })}
        </div>
      </section>

      <section id="scale" className="relative scroll-mt-24 px-6 pb-24">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          variants={fadeUp}
          className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-5 rounded-[2rem] border border-white/10 bg-white/[0.04] px-6 py-7 text-center backdrop-blur-xl md:flex-row md:px-8 md:text-left"
        >
          <h2 className="text-3xl font-semibold tracking-[-0.04em]">
            Built to <span className="text-violet-400">Scale.</span>
          </h2>

          <div className="flex flex-wrap justify-center gap-2 text-sm text-white/65 md:justify-end">
            {capabilities.map((capability) => (
              <span
                key={capability}
                className="rounded-full border border-white/10 bg-black/20 px-4 py-2"
              >
                {capability}
              </span>
            ))}
          </div>
        </motion.div>
      </section>

      <section className="relative px-6 pb-28">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.25 }}
          variants={fadeUp}
          className="mx-auto grid max-w-6xl items-center gap-10 rounded-[2rem] border border-white/10 bg-white/[0.045] p-8 backdrop-blur-xl md:grid-cols-2 md:p-12"
        >
          <div className="relative h-80 overflow-hidden rounded-[2rem]">
            <motion.div
              className="absolute left-10 top-8 h-64 w-64 rounded-full bg-[radial-gradient(circle_at_35%_30%,rgba(255,220,180,.95),rgba(244,114,182,.38)_24%,rgba(59,130,246,.25)_48%,transparent_70%)] shadow-[0_0_80px_rgba(251,146,60,.35)]"
              animate={{ scale: [1, 1.035, 1] }}
              transition={{ duration: 7, repeat: Infinity }}
            />

            <motion.div
              className="absolute left-2 top-24 h-32 w-96 rotate-[-18deg] rounded-[100%] border border-blue-300/45 shadow-[0_0_40px_rgba(59,130,246,.35)]"
              animate={{ rotate: [-18, -8, -18] }}
              transition={{ duration: 10, repeat: Infinity }}
            />
          </div>

          <div>
            <h2 className="text-5xl font-semibold tracking-[-0.05em]">
              Most events are watched.
              <br />
              <span className="text-violet-400">The best ones are felt.</span>
            </h2>

          </div>
        </motion.div>
      </section>

      <section className="relative px-6 pb-24">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          variants={fadeUp}
          className="mx-auto max-w-5xl rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[0.07] to-violet-500/[0.08] p-10 text-center shadow-[0_0_80px_rgba(99,102,241,.14)] backdrop-blur-xl"
        >
          <h2 className="text-5xl font-semibold tracking-[-0.05em]">
            Make It <span className="text-violet-400">Unforgettable.</span>
          </h2>

          <a
            href="/login"
            className="mt-8 inline-flex rounded-full bg-gradient-to-r from-blue-500 to-violet-500 px-9 py-4 font-medium shadow-[0_0_45px_rgba(99,102,241,.45)] transition hover:scale-105"
          >
            Start Producing
          </a>
        </motion.div>
      </section>

      <footer className="relative border-t border-white/10 bg-black/40 px-6 py-12 text-white/50">
        <div className="mx-auto flex max-w-6xl flex-col justify-between gap-8 md:flex-row">
          <div>
            <JupiterLogo className="text-white" />
            <p className="mt-3 max-w-sm">Live events with gravity.</p>
          </div>

          <div className="flex flex-wrap items-center gap-8 text-sm">
            <a href="#platform">Platform</a>
            <a href="/login">Sign in</a>
          </div>
        </div>
      </footer>
    </main>
  )
}
