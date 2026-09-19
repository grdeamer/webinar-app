"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { ChevronLeft, ChevronRight, Compass, Sparkles, X } from "lucide-react"

type TourMode = "closed" | "intro" | "tour"
type Spotlight = { top: number; left: number; width: number; height: number }

const steps = [
  {
    selector: '[data-dashboard-tour="welcome"]',
    eyebrow: "Mission Control",
    title: "Start every visit here",
    body: "Your dashboard is now the first stop after sign-in. It summarizes the events and tools this account is allowed to use.",
  },
  {
    selector: ".admin-navigation-rail",
    mobileSelector: ".jupiter-mobile-header",
    eyebrow: "Navigation",
    title: "Move through Jupiter",
    body: "Use the main navigation for the dashboard and your event directory. Inside an event, unavailable tools remain visible but softly disabled.",
  },
  {
    selector: '[data-dashboard-tour="live"]',
    eyebrow: "Live operations",
    title: "See what is happening now",
    body: "Open the active event, monitor its audience, and enter the Producer Room when your permissions include it.",
  },
  {
    selector: '[data-dashboard-tour="attention"]',
    eyebrow: "Readiness",
    title: "Handle the important work first",
    body: "Jupiter surfaces only the preparation items this account has permission to resolve.",
  },
  {
    selector: '[data-dashboard-tour="events"]',
    eyebrow: "Your events",
    title: "Continue where you left off",
    body: "Upcoming events are limited to this user’s access. Select one to enter its workspace and see the complete feature map.",
  },
] as const

export default function MissionControlTour({ userId }: { userId: string }) {
  const storageKey = useMemo(() => `jupiter:mission-control-tour:v1:${userId}`, [userId])
  const [mode, setMode] = useState<TourMode>("closed")
  const [stepIndex, setStepIndex] = useState(0)
  const [spotlight, setSpotlight] = useState<Spotlight | null>(null)

  const markSeen = useCallback(() => {
    window.localStorage.setItem(storageKey, "seen")
  }, [storageKey])

  const closeTour = useCallback(() => {
    markSeen()
    setMode("closed")
    setSpotlight(null)
  }, [markSeen])

  const startTour = useCallback(() => {
    setStepIndex(0)
    setMode("tour")
  }, [])

  useEffect(() => {
    if (window.location.hash === "#guided-tour") {
      const timer = window.setTimeout(startTour, 0)
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`)
      return () => window.clearTimeout(timer)
    }
    if (window.localStorage.getItem(storageKey) === "seen") return
    const timer = window.setTimeout(() => setMode("intro"), 0)
    return () => window.clearTimeout(timer)
  }, [startTour, storageKey])

  useEffect(() => {
    if (mode === "closed") return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = previousOverflow }
  }, [mode])

  useEffect(() => {
    if (mode !== "tour") return
    const step = steps[stepIndex]
    const isMobile = window.matchMedia("(max-width: 1023px)").matches
    const selector = isMobile && "mobileSelector" in step ? step.mobileSelector : step.selector
    const target = document.querySelector<HTMLElement>(selector)
    if (!target) {
      const timer = window.setTimeout(() => setSpotlight(null), 0)
      return () => window.clearTimeout(timer)
    }

    target.scrollIntoView({ behavior: "smooth", block: "center" })
    const updateSpotlight = () => {
      const rect = target.getBoundingClientRect()
      const padding = 10
      setSpotlight({
        top: Math.max(8, rect.top - padding),
        left: Math.max(8, rect.left - padding),
        width: Math.min(window.innerWidth - 16, rect.width + padding * 2),
        height: Math.min(window.innerHeight - 16, rect.height + padding * 2),
      })
    }
    const timer = window.setTimeout(updateSpotlight, 280)
    updateSpotlight()
    window.addEventListener("resize", updateSpotlight)
    window.addEventListener("scroll", updateSpotlight, { capture: true, passive: true })
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener("resize", updateSpotlight)
      window.removeEventListener("scroll", updateSpotlight, true)
    }
  }, [mode, stepIndex])

  useEffect(() => {
    if (mode === "closed") return
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") closeTour() }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [closeTour, mode])

  const step = steps[stepIndex]

  return (
    <>
      <button
        type="button"
        onClick={() => mode === "tour" ? closeTour() : startTour()}
        aria-pressed={mode === "tour"}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[.035] px-4 text-sm font-semibold text-white/68 transition hover:border-violet-300/30 hover:bg-violet-400/10 hover:text-white"
      >
        <Compass size={16} />{mode === "tour" ? "End tour" : "Guided tour"}
      </button>

      {mode === "intro" ? (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-[#02050d]/80 p-5 backdrop-blur-md" role="dialog" aria-modal="true" aria-labelledby="mission-control-tour-title">
          <div className="relative w-full max-w-lg overflow-hidden rounded-[28px] border border-violet-300/20 bg-[radial-gradient(circle_at_86%_0%,rgba(123,83,255,.24),transparent_38%),#091020] p-7 shadow-[0_32px_100px_rgba(0,0,0,.6)] sm:p-9">
            <button type="button" onClick={closeTour} className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-white/55 hover:bg-white/10 hover:text-white" aria-label="Skip guided tour"><X size={17} /></button>
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-violet-300/25 bg-violet-400/12 text-violet-200"><Sparkles size={21} /></span>
            <div className="mt-7 text-[11px] font-bold uppercase tracking-[.22em] text-violet-200/70">Welcome to Jupiter</div>
            <h2 id="mission-control-tour-title" className="mt-3 text-3xl font-semibold tracking-[-.04em]">Want a quick guided tour?</h2>
            <p className="mt-3 max-w-md text-sm leading-6 text-white/55">Take a short walk through Mission Control, or skip it and explore on your own. You can replay the tour from the dashboard at any time.</p>
            <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={closeTour} className="h-11 rounded-xl border border-white/10 px-5 text-sm font-semibold text-white/62 hover:bg-white/[.06] hover:text-white">Skip tour</button>
              <button type="button" onClick={startTour} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-5 text-sm font-semibold shadow-[0_12px_34px_rgba(82,83,255,.24)] hover:brightness-110">Start guided tour<ChevronRight size={16} /></button>
            </div>
          </div>
        </div>
      ) : null}

      {mode === "tour" ? (
        <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label="Mission Control guided tour">
          <div className="absolute inset-0" />
          {spotlight ? <div className="pointer-events-none fixed z-[82] rounded-[22px] border-2 border-violet-300/80 shadow-[0_0_0_9999px_rgba(1,3,10,.72),0_0_36px_rgba(139,92,246,.42)] transition-all duration-300" style={spotlight} /> : null}
          <div className="fixed bottom-4 left-4 right-4 z-[85] mx-auto w-auto max-w-md rounded-[24px] border border-violet-300/22 bg-[#091020]/98 p-5 shadow-[0_28px_90px_rgba(0,0,0,.58)] sm:bottom-7 sm:left-auto sm:right-7 sm:w-[420px] sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div><div className="text-[10px] font-bold uppercase tracking-[.22em] text-violet-200/70">{step.eyebrow}</div><h2 className="mt-2 text-xl font-semibold tracking-[-.025em]">{step.title}</h2></div>
              <button type="button" onClick={closeTour} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/45 hover:bg-white/10 hover:text-white" aria-label="End guided tour"><X size={16} /></button>
            </div>
            <p className="mt-3 text-sm leading-6 text-white/55">{step.body}</p>
            <div className="mt-5 flex items-center justify-between gap-4">
              <span className="text-xs font-medium text-white/35">{stepIndex + 1} of {steps.length}</span>
              <div className="flex gap-2">
                <button type="button" onClick={() => setStepIndex((current) => Math.max(0, current - 1))} disabled={stepIndex === 0} className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-white/68 disabled:opacity-25" aria-label="Previous tour step"><ChevronLeft size={17} /></button>
                <button type="button" onClick={() => stepIndex === steps.length - 1 ? closeTour() : setStepIndex((current) => current + 1)} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-violet-500 px-4 text-sm font-semibold hover:bg-violet-400">{stepIndex === steps.length - 1 ? "Finish" : "Next"}{stepIndex === steps.length - 1 ? null : <ChevronRight size={16} />}</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
