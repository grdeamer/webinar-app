"use client"

import Image from "next/image"
import { motion, useReducedMotion } from "framer-motion"
import { BarChart3, Box, Clapperboard, GraduationCap, Megaphone, Play, Sparkles, Users } from "lucide-react"
import JupiterLogo from "@/components/brand/JupiterLogo"

const reveal = { hidden: { opacity: 0, y: 22 }, show: { opacity: 1, y: 0 } }

const workflow = [
  { label: "Build", icon: Box, body: "Create branded registration pages, schedules, and audience touchpoints." },
  { label: "Rehearse", icon: Play, body: "Practice runs, technical checks, and onboarding for a confident showtime." },
  { label: "Direct", icon: Clapperboard, body: "Switch scenes, cue speakers, share media, and manage backstage in real time." },
  { label: "Engage", icon: Users, body: "Bring audiences into the moment with chat, Q&A, polls, and reactions." },
  { label: "Analyze", icon: BarChart3, body: "Understand attendance and engagement with post-event insights." },
]

const scale = [
  { value: "1", label: "room" },
  { value: "10", label: "tracks" },
  { value: "100", label: "sessions" },
  { value: "One", label: "control room" },
]

const useCases = [
  { label: "Marketing", icon: Megaphone, body: "Launch products, host webinars, and create campaign moments that convert." },
  { label: "Training", icon: GraduationCap, body: "Deliver onboarding, certifications, and learning experiences that stick." },
  { label: "Town Halls", icon: Users, body: "Align teams through clear updates and two-way engagement at scale." },
  { label: "Summits", icon: Sparkles, body: "Run multi-track, global events with the polish of a live production." },
]

function Nav() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.07] bg-[#02050e]/80 backdrop-blur-2xl">
      <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-12">
        <a href="#top" aria-label="Jupiter home" className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-violet-400">
          <JupiterLogo className="text-white" markClassName="h-7 w-7" wordmarkClassName="text-sm font-semibold tracking-[0.24em]" />
        </a>
        <nav aria-label="Main navigation" className="hidden items-center gap-9 text-sm text-white/65 md:flex">
          <a className="transition hover:text-white" href="#producer">Product</a>
          <a className="transition hover:text-white" href="#workflow">Solutions</a>
          <a className="transition hover:text-white" href="#use-cases">Resources</a>
          <a className="transition hover:text-white" href="#scale">Scale</a>
        </nav>
        <div className="flex items-center gap-4 text-sm">
          <a className="hidden text-white/65 transition hover:text-white sm:block" href="/login">Sign in</a>
          <a href="/login" className="rounded-lg border border-blue-300/25 bg-gradient-to-r from-[#3f7dff] to-[#7654ee] px-4 py-2.5 font-medium shadow-[0_0_24px_rgba(82,111,255,.28)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300">Book a Demo</a>
        </div>
      </div>
    </header>
  )
}

function Stars() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 opacity-55 [background-image:radial-gradient(circle_at_18%_23%,rgba(255,255,255,.8)_0_1px,transparent_1px),radial-gradient(circle_at_67%_14%,rgba(147,197,253,.65)_0_1px,transparent_1px),radial-gradient(circle_at_42%_72%,rgba(255,255,255,.55)_0_1px,transparent_1px),radial-gradient(circle_at_88%_58%,rgba(167,139,250,.7)_0_1px,transparent_1px)] [background-size:187px_187px,263px_263px,229px_229px,317px_317px]" />
      <div className="absolute -right-48 top-28 h-[780px] w-[780px] rounded-full border border-blue-300/[0.12]" />
      <div className="absolute right-[10%] top-52 h-7 w-7 rounded-full bg-[radial-gradient(circle_at_35%_35%,#ad7f52,#392016_45%,#080b13_72%)] opacity-65 shadow-[0_0_24px_rgba(139,92,246,.12)]" />
    </div>
  )
}

export default function JupiterHome() {
  const reduceMotion = useReducedMotion()
  const motionTransition = reduceMotion ? { duration: 0 } : { duration: 0.6, ease: "easeOut" as const }

  return (
    <main id="top" className="relative min-h-screen overflow-hidden bg-[#02050e] text-white selection:bg-violet-500/40">
      <Nav />
      <section className="relative min-h-[720px] overflow-hidden border-b border-white/[0.08] px-5 pb-28 pt-36 sm:px-8 lg:min-h-[780px] lg:px-12 lg:pt-44">
        <Stars />
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[44%] bg-[url('/jupiter-surface-horizon-v1.png')] bg-cover bg-[center_40%] opacity-55" />
        <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,5,14,.96)_0%,rgba(2,5,14,.72)_46%,rgba(2,5,14,.18)_78%),linear-gradient(180deg,transparent_44%,rgba(2,5,14,.08)_66%,#02050e_100%)]" />
        <motion.div initial="hidden" animate="show" variants={reveal} transition={motionTransition} className="relative mx-auto max-w-[1440px]">
          <div className="max-w-[940px]">
            <h1 className="max-w-[900px] text-[clamp(3.5rem,7.2vw,7rem)] font-semibold leading-[.93] tracking-[-0.065em] text-[#f7f7f4]">Virtual events<br className="hidden sm:block" /> should feel bigger.</h1>
            <p className="mt-7 text-[clamp(1.65rem,3.4vw,3.25rem)] font-medium leading-tight tracking-[-0.045em] text-white/92">Go beyond the expected. <span className="bg-gradient-to-r from-[#9b65ff] to-[#5fa4ff] bg-clip-text text-transparent">Beyond this world.</span></p>
            <p className="mt-5 text-lg text-white/62 sm:text-xl">Your event, written in the stars. <span className="bg-gradient-to-r from-[#9b65ff] to-[#5fa4ff] bg-clip-text font-medium text-transparent">This is Jupiter.</span></p>
            <p className="mt-7 max-w-xl text-base leading-7 text-white/60 sm:text-lg">Create, produce, and direct branded virtual events from one live production platform.</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <a href="/login" className="inline-flex min-h-12 items-center justify-center rounded-lg border border-blue-300/25 bg-gradient-to-r from-[#3f7dff] to-[#7654ee] px-6 font-medium shadow-[0_0_30px_rgba(82,111,255,.3)] transition hover:-translate-y-0.5 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300">Book a Live Demo <span aria-hidden="true" className="ml-2">→</span></a>
              <a href="#producer" className="inline-flex min-h-12 items-center justify-center gap-3 rounded-lg px-4 text-white/80 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"><span className="grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-black/25"><Play className="h-4 w-4 fill-current" /></span>Watch 90-Second Tour</a>
            </div>
          </div>
        </motion.div>
      </section>

      <section id="scale" className="relative scroll-mt-20 border-b border-white/[0.08] px-5 py-14 sm:px-8 lg:px-12">
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }} variants={reveal} transition={motionTransition} className="mx-auto max-w-[1440px]">
          <h2 className="text-center text-lg font-medium uppercase tracking-[0.26em] text-white/88 sm:text-xl sm:tracking-[0.34em]">Built to scale without multiplying complexity.</h2>
          <div className="relative mt-11 grid grid-cols-2 gap-y-10 md:grid-cols-4">
            <div aria-hidden="true" className="absolute left-[12.5%] right-[12.5%] top-1 hidden h-px bg-gradient-to-r from-[#6e54e8] via-[#68a6ff] to-[#6e54e8] md:block" />
            {scale.map((item) => <div key={item.label} className="relative text-center"><span aria-hidden="true" className="mx-auto mb-4 hidden h-2.5 w-2.5 rounded-full bg-[#87a8ff] shadow-[0_0_18px_#715cff] md:block" /><strong className="block bg-gradient-to-b from-[#75a7ff] to-[#8a54e8] bg-clip-text text-5xl font-medium tracking-[-0.05em] text-transparent sm:text-6xl">{item.value}</strong><span className="mt-1 block text-lg text-white/86">{item.label}</span></div>)}
          </div>
          <p className="mx-auto mt-10 max-w-3xl text-center text-base leading-7 text-white/55 sm:text-lg">From private leadership sessions to global, multi-track programs—Jupiter keeps every audience, team, and production in one place.</p>
        </motion.div>
      </section>

      <section id="producer" className="relative scroll-mt-20 px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
        <div aria-hidden="true" className="absolute left-1/2 top-0 h-[620px] w-[900px] -translate-x-1/2 bg-[radial-gradient(ellipse,rgba(57,93,210,.12),transparent_67%)]" />
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.12 }} variants={reveal} transition={motionTransition} className="relative mx-auto max-w-[1360px]">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-blue-300/85">From preview to program</p>
          <h2 className="mt-3 text-4xl font-medium leading-[1.05] tracking-[-0.045em] sm:text-6xl">Every cue.<br />Perfectly timed.</h2>
          <div className="mt-9 overflow-hidden rounded-2xl border border-white/[0.12] bg-[#050914] p-1.5 shadow-[0_35px_100px_rgba(0,0,0,.45),0_0_60px_rgba(65,90,190,.10)] sm:p-3">
            <Image src="/jupiter-producer-room-speakers.png" alt="Jupiter Producer Room showing a presenter in Preview and another presenter live in Program" width={720} height={390} className="h-auto w-full rounded-xl" sizes="(max-width: 768px) 100vw, 1360px" />
          </div>
        </motion.div>
      </section>

      <section id="workflow" className="relative scroll-mt-20 px-5 pb-24 sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-[1360px] gap-9 sm:grid-cols-2 lg:grid-cols-5">
          {workflow.map((step, index) => { const Icon = step.icon; return <motion.article key={step.label} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.35 }} variants={reveal} transition={{ ...motionTransition, delay: reduceMotion ? 0 : index * 0.06 }} className="relative border-t border-white/[0.08] pt-7 lg:border-t-0 lg:pt-0"><div className="grid h-14 w-14 place-items-center rounded-full border border-violet-400/30 bg-[#060b18] text-blue-300 shadow-[0_0_22px_rgba(84,82,212,.12)]"><Icon className="h-6 w-6" strokeWidth={1.5} /></div><h3 className="mt-5 text-xl font-medium"><span className="mr-2 text-violet-400">{index + 1}</span>{step.label}</h3><p className="mt-3 text-sm leading-6 text-white/52">{step.body}</p></motion.article> })}
        </div>
      </section>

      <section className="relative px-5 pb-14 sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-[1360px] overflow-hidden rounded-2xl border border-white/[0.1] bg-white/[0.025] md:grid-cols-3">
          {[["Live", "production control"], ["Reusable", "event foundations"], ["One", "control room"]].map(([value, label]) => <div key={value} className="border-b border-white/[0.08] px-6 py-8 text-center last:border-0 md:border-b-0 md:border-r md:last:border-r-0"><strong className="bg-gradient-to-r from-[#6f9fff] to-[#9c59f2] bg-clip-text text-5xl font-medium tracking-[-0.05em] text-transparent">{value}</strong><span className="mt-2 block text-white/72">{label}</span></div>)}
        </div>
      </section>

      <section id="use-cases" className="relative scroll-mt-20 px-5 pb-24 sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-[1360px] gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {useCases.map((item) => { const Icon = item.icon; return <article key={item.label} className="group rounded-2xl border border-white/[0.09] bg-white/[0.025] p-7 transition hover:-translate-y-1 hover:border-blue-300/25 hover:bg-white/[0.04]"><Icon className="h-8 w-8 text-blue-300" strokeWidth={1.4} /><h3 className="mt-7 text-xl font-medium">{item.label}</h3><p className="mt-3 min-h-[72px] text-sm leading-6 text-white/52">{item.body}</p><span aria-hidden="true" className="mt-6 block text-right text-xl text-white/75 transition group-hover:translate-x-1">→</span></article> })}
        </div>
      </section>

      <section className="relative border-t border-white/[0.08] px-5 py-16 sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-[1360px] flex-col items-center justify-between gap-7 text-center md:flex-row md:text-left"><div><p className="text-xs uppercase tracking-[0.24em] text-blue-300/75">Your next moment</p><h2 className="mt-3 text-3xl font-medium tracking-[-0.04em] sm:text-5xl">Ready to direct your next event?</h2></div><a href="/login" className="inline-flex min-h-12 items-center rounded-lg border border-blue-300/25 bg-gradient-to-r from-[#3f7dff] to-[#7654ee] px-6 font-medium shadow-[0_0_30px_rgba(82,111,255,.25)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300">Book a Demo <span aria-hidden="true" className="ml-2">→</span></a></div>
      </section>

      <footer className="relative border-t border-white/[0.08] bg-black/20 px-5 py-10 text-white/45 sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-[1440px] flex-col justify-between gap-6 sm:flex-row sm:items-center"><JupiterLogo className="text-white/80" markClassName="h-6 w-6" wordmarkClassName="text-xs font-semibold tracking-[0.22em]" /><div className="flex items-center gap-7 text-sm"><a className="transition hover:text-white" href="#producer">Product</a><a className="transition hover:text-white" href="#scale">Scale</a><a className="transition hover:text-white" href="/login">Sign in</a></div></div>
      </footer>
    </main>
  )
}
