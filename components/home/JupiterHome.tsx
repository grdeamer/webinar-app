"use client"

import { motion } from "framer-motion"
import { Clapperboard, Mic2, Orbit } from "lucide-react"

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
        <div className="flex items-center gap-3 font-semibold tracking-wide">
          <div className="h-8 w-8 rounded-full border border-violet-300/50 bg-white/5 shadow-[0_0_25px_rgba(139,92,246,.35)]" />
          Jupiter
        </div>

        <nav className="hidden items-center gap-8 text-sm text-white/70 md:flex">
          <a>Product</a>
          <a>Solutions</a>
          <a>Resources</a>
          <a>Pricing</a>
          <a>About</a>
        </nav>

        <div className="flex items-center gap-4 text-sm">
          <button className="hidden text-white/70 sm:block">Sign in</button>
          <button className="rounded-full bg-gradient-to-r from-blue-500 to-violet-500 px-5 py-2.5 shadow-[0_0_30px_rgba(99,102,241,.35)] transition hover:scale-105">
            Start Your First Production
          </button>
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
      body: "Create anticipation before the first speaker appears.",
    },
    {
      title: "Direct the Moment",
      icon: Clapperboard,
      body: "Switch scenes, shape pacing, and guide the show live.",
    },
    {
      title: "Guide the Audience",
      icon: Orbit,
      body: "Move attendees through a seamless, memorable journey.",
    },
  ]

  const cards = [
    "Real-Time by Design",
    "Production-Grade Streaming",
    "Flexible Architecture",
    "Fully Customizable",
    "Global Scale",
    "Enterprise Security",
  ]

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
            ✦ Your event, written in the stars
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
            Run events like a production. Not meetings—experiences.
          </p>

          <p className="mt-2 text-white/50">
            Designed for producers, not just presenters.
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <button className="group rounded-full bg-gradient-to-r from-blue-500 to-violet-500 px-8 py-4 font-medium shadow-[0_0_45px_rgba(99,102,241,.45)] transition hover:scale-105">
              Start Your First Production
            </button>

            <button className="rounded-full border border-white/15 bg-white/5 px-8 py-4 text-white/80 backdrop-blur-xl transition hover:bg-white/10">
              ▶ See How It Works
            </button>
          </div>
        </motion.div>
      </section>

      <section className="relative px-6 pb-24">
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

      <section className="relative px-6 pb-28">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.25 }}
          variants={fadeUp}
          className="mx-auto grid max-w-6xl items-center gap-10 rounded-[2rem] border border-white/10 bg-white/[0.045] p-8 shadow-[0_0_80px_rgba(59,130,246,.08)] backdrop-blur-xl md:grid-cols-2 md:p-12"
        >
          <div>
            <h2 className="text-4xl font-semibold tracking-[-0.04em]">
              Direct Your Event Like a{" "}
              <span className="text-violet-400">Production.</span>
            </h2>

            <p className="mt-4 text-white/65">
              Control every moment—from backstage to broadcast. Your producer
              interface gives you the power of a TV studio in your browser.
            </p>

            <div className="mt-8 grid grid-cols-2 gap-4 text-sm text-white/65">
              {[
                "Backstage Control",
                "Dynamic Scenes",
                "Audience Experience",
                "Real-Time Insights",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="relative h-80 overflow-hidden rounded-3xl border border-white/10 bg-[#070d1d] shadow-2xl">
            <div className="absolute inset-4 rounded-2xl bg-[radial-gradient(circle_at_50%_10%,rgba(96,165,250,.35),transparent_30%),linear-gradient(to_bottom,#111827,#030712)]" />
            <div className="absolute bottom-8 left-8 right-8 h-16 rounded-xl border border-white/10 bg-black/35 backdrop-blur" />
            <div className="absolute right-6 top-6 h-56 w-20 rounded-xl border border-white/10 bg-white/5" />
            <motion.div
              className="absolute left-1/2 top-16 h-28 w-1 -translate-x-1/2 rounded-full bg-blue-200/70 blur-sm"
              animate={{ opacity: [0.25, 0.8, 0.25] }}
              transition={{ duration: 3, repeat: Infinity }}
            />
          </div>
        </motion.div>
      </section>

      <section className="relative px-6 pb-28">
        <div className="mx-auto max-w-6xl text-center">
          <motion.h2
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={fadeUp}
            className="text-5xl font-semibold tracking-[-0.05em]"
          >
            Scale <span className="text-violet-400">Beautifully.</span>
          </motion.h2>

          <p className="mx-auto mt-4 max-w-2xl text-white/60">
            Modern real-time SaaS infrastructure for events that need to feel
            seamless, no matter the volume of attendees.
          </p>

          <div className="mt-10 grid gap-6 text-left md:grid-cols-3">
            {cards.map((card, i) => (
              <motion.div
                key={card}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.25 }}
                variants={fadeUp}
                transition={{ delay: i * 0.05 }}
                className="group rounded-3xl border border-white/10 bg-white/[0.045] p-7 transition hover:-translate-y-1 hover:border-violet-300/30 hover:bg-white/[0.075]"
              >
                <div className="mb-5 h-12 w-12 rounded-full bg-gradient-to-br from-blue-500/25 to-violet-500/25 shadow-[0_0_30px_rgba(99,102,241,.25)]" />
                <h3 className="text-xl font-medium">{card}</h3>
                <p className="mt-2 text-white/55">
                  Built for premium virtual experiences at any scale.
                </p>
                <p className="mt-5 text-sm text-violet-300">Learn more ›</p>
              </motion.div>
            ))}
          </div>
        </div>
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

            <p className="mt-5 text-white/60">
              Jupiter is built for the moments that matter—where attention,
              emotion, and storytelling come together.
            </p>
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
            Ready to Create Something{" "}
            <span className="text-violet-400">Unforgettable?</span>
          </h2>

          <p className="mt-4 text-white/60">
            Build events people don’t just attend—they remember.
          </p>

          <button className="mt-8 rounded-full bg-gradient-to-r from-blue-500 to-violet-500 px-9 py-4 font-medium shadow-[0_0_45px_rgba(99,102,241,.45)] transition hover:scale-105">
            Get Started ›
          </button>
        </motion.div>
      </section>

      <footer className="relative border-t border-white/10 bg-black/40 px-6 py-12 text-white/50">
        <div className="mx-auto flex max-w-6xl flex-col justify-between gap-8 md:flex-row">
          <div>
            <div className="text-lg font-medium text-white">Jupiter</div>
            <p className="mt-3 max-w-sm">
              Transforming virtual events into cinematic experiences.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-10 text-sm">
            <div>
              Product
              <br />
              Studio
              <br />
              Live Events
            </div>

            <div>
              Resources
              <br />
              Blog
              <br />
              Cases
            </div>

            <div>
              Company
              <br />
              About
              <br />
              Careers
            </div>
          </div>
        </div>
      </footer>
    </main>
  )
}