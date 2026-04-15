"use client"

import Link from "next/link"
import {
  ArrowRight,
  CirclePlay,
  Globe,
  Lock,
  Mic,
  Orbit,
  PanelsTopLeft,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react"

const storySteps = [
  {
    icon: PanelsTopLeft,
    title: "Set the Stage",
    body: "Create anticipation that pulls your audience in.",
  },
  {
    icon: CirclePlay,
    title: "Direct the Moment",
    body: "Craft keynote moments that hold attention.",
  },
  {
    icon: Sparkles,
    title: "Guide the Audience",
    body: "Lead them through a seamless experience.",
  },
]

const productionItems = [
  {
    icon: PanelsTopLeft,
    title: "Backstage Control",
    body: "Green room & live switching",
  },
  {
    icon: CirclePlay,
    title: "Dynamic Scenes",
    body: "Seamless transitions",
  },
  {
    icon: Sparkles,
    title: "Audience Experience",
    body: "Front row engagement",
  },
  {
    icon: TrendingUp,
    title: "Real-Time Insights",
    body: "See what’s happening, now",
  },
]

const scaleFeatures = [
  {
    icon: Zap,
    title: "Real-Time by Design",
    body: "Live video, audience interactions, and event state—perfectly in sync.",
  },
  {
    icon: CirclePlay,
    title: "Production-Grade Streaming",
    body: "Broadcast-quality delivery with dynamic layouts and seamless switching.",
  },
  {
    icon: Orbit,
    title: "Flexible Event Architecture",
    body: "Sessions, breakouts, and experiences powered by one unified system.",
  },
  {
    icon: Sparkles,
    title: "Fully Customizable Experience",
    body: "Design visually while system logic runs underneath.",
  },
  {
    icon: Globe,
    title: "Global Scale",
    body: "From intimate sessions to large-scale audience experiences.",
  },
  {
    icon: Lock,
    title: "Enterprise-Ready Security",
    body: "SSO, access control, and protected content delivery.",
  },
]

function LogoMark() {
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/5">
        <div className="h-4 w-4 rounded-full border border-white/90" />
        <div className="absolute h-7 w-7 rounded-full border border-blue-300/40" />
        <div className="absolute left-1 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-blue-300 shadow-[0_0_12px_rgba(96,165,250,0.95)]" />
      </div>

      <div className="text-[1.15rem] font-medium tracking-[0.22em] text-white">
        JUPITER
      </div>
    </div>
  )
}

function GradientButton({
  href,
  children,
}: {
  href: string
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(90deg,#3b82f6,#a855f7)] px-6 py-3 text-sm font-medium text-white shadow-[0_10px_40px_rgba(99,102,241,0.35)] transition hover:-translate-y-0.5"
    >
      {children}
      <ArrowRight className="h-4 w-4" />
    </Link>
  )
}

function GhostPlayButton({
  href,
  children,
}: {
  href: string
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-3 rounded-full px-1 py-1 text-sm font-medium text-white/90 transition hover:text-white"
    >
      <span>{children}</span>
      <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/5">
        <CirclePlay className="h-4 w-4" />
      </span>
    </Link>
  )
}

function StoryOrb({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  body: string
}) {
  return (
    <div className="text-center">
      <div className="relative mx-auto mb-5 flex h-32 w-32 items-center justify-center">
        <div className="absolute inset-0 rounded-full border border-blue-300/20" />
        <div className="absolute inset-3 rounded-full border border-indigo-300/12" />
        <div className="absolute left-1/2 top-1/2 h-[68%] w-[108%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10" />
        <div className="absolute left-1/2 top-1/2 h-[52%] w-[125%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-blue-400/12" />
        <div className="absolute inset-5 rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.18),rgba(99,102,241,0.08),transparent_72%)] blur-xl" />

        <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-[linear-gradient(180deg,rgba(23,37,84,0.92),rgba(10,15,35,0.92))] shadow-[0_0_42px_rgba(59,130,246,0.18)]">
          <Icon className="h-8 w-8 text-blue-300" />
        </div>
      </div>

      <h3 className="text-2xl font-semibold tracking-tight text-white">{title}</h3>
      <p className="mx-auto mt-3 max-w-[260px] text-base leading-7 text-white/65">
        {body}
      </p>
    </div>
  )
}

function ScaleCard({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  body: string
}) {
  return (
    <div className="group relative overflow-hidden rounded-[1.4rem] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl transition duration-300 hover:border-indigo-300/20 hover:bg-white/[0.06]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(129,140,248,0.12),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.08),transparent_32%)] opacity-80" />

      <div className="relative">
        <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-indigo-300/20 bg-indigo-400/10 shadow-[0_0_28px_rgba(129,140,248,0.12)]">
          <Icon className="h-5 w-5 text-indigo-200" />
        </div>

        <h3 className="text-lg font-semibold tracking-tight text-white">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-white/65">{body}</p>
      </div>
    </div>
  )
}

function ProductionPanel() {
  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(8,12,28,0.82),rgba(10,14,32,0.9))] p-8 shadow-[0_20px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.12),transparent_35%)]" />

      <div className="relative grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div>
          <h3 className="text-[2rem] font-semibold tracking-tight text-white md:text-[2.35rem]">
            Direct Your Event Like a <span className="text-indigo-400">Production.</span>
          </h3>

          <p className="mt-3 text-lg text-white/72">
            Control every moment—from backstage to broadcast.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-6 md:grid-cols-4">
            {productionItems.map((item) => {
              const Icon = item.icon
              return (
                <div key={item.title}>
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-300/15 bg-blue-400/5">
                    <Icon className="h-7 w-7 text-blue-300" />
                  </div>

                  <div className="text-base font-semibold text-white">{item.title}</div>
                  <div className="mt-1 text-sm text-white/58">{item.body}</div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="rounded-[1.6rem] border border-white/10 bg-[linear-gradient(180deg,rgba(12,18,40,0.98),rgba(7,10,24,0.98))] p-3 shadow-[0_10px_50px_rgba(0,0,0,0.35)]">
          <div className="grid grid-cols-[86px_1fr_110px] gap-3">
            <div className="rounded-2xl bg-white/[0.03] p-3 text-xs text-white/65">
              <div className="mb-3 flex items-center gap-2 text-[11px] text-white/45">
                <span className="h-2 w-2 rounded-full bg-red-400" />
                LIVE
              </div>

              <div className="space-y-2">
                {["Opening", "Keynote", "Panel", "Breakout", "Closing"].map((item, i) => (
                  <div
                    key={item}
                    className={`rounded-xl px-2 py-2 ${
                      i === 1 ? "bg-indigo-500/25 text-white" : "bg-white/[0.04]"
                    }`}
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-white/[0.03] p-3">
              <div className="mb-3 h-36 rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.28),rgba(8,12,28,1)_72%)]" />
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map((n) => (
                  <div
                    key={n}
                    className="h-16 rounded-xl border border-white/10 bg-white/[0.04]"
                  />
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-white/[0.03] p-3 text-xs text-white/65">
              <div className="mb-3 text-white/80">Live Chat</div>

              <div className="space-y-2">
                <div className="rounded-xl bg-white/[0.04] px-2 py-2">
                  What an opening shot.
                </div>
                <div className="rounded-xl bg-white/[0.04] px-2 py-2">
                  Love the energy in here.
                </div>

                <div className="mt-3 flex items-center gap-2 text-[11px] text-blue-300">
                  <span>23K</span>
                  <span>●</span>
                  <span>OK</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#030714] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(28,58,164,0.22),transparent_38%),radial-gradient(circle_at_50%_40%,rgba(56,189,248,0.06),transparent_28%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(3,7,20,0.35),rgba(3,7,20,0.88))]" />

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-10%] top-[10%] h-[420px] w-[120%] rounded-full border border-blue-400/15" />
        <div className="absolute left-[8%] top-[16%] h-[340px] w-[78%] rounded-full border border-indigo-300/10" />
        <div className="absolute right-[-4%] top-[18%] h-[360px] w-[74%] rounded-full border border-blue-300/12" />
        <div className="absolute left-[-8%] top-[58%] h-[360px] w-[120%] rounded-full border border-white/8" />
        <div className="absolute left-[0%] top-[74%] h-[360px] w-[100%] rounded-full border border-indigo-300/10" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.16),transparent_1.2%),radial-gradient(circle_at_70%_30%,rgba(255,255,255,0.14),transparent_1%),radial-gradient(circle_at_20%_75%,rgba(255,255,255,0.14),transparent_1%),radial-gradient(circle_at_80%_80%,rgba(255,255,255,0.12),transparent_1%)] [background-size:220px_220px] opacity-60" />
      </div>

      <div className="pointer-events-none absolute left-1/2 top-[290px] h-[320px] w-[1400px] -translate-x-1/2 rounded-[100%] bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.34),rgba(59,130,246,0.14),transparent_72%)] blur-3xl" />

      <div className="relative z-10 mx-auto max-w-[1180px] px-6 pb-12 pt-6 lg:px-8">
        <header className="flex items-center justify-between gap-6">
          <LogoMark />

          <nav className="hidden items-center gap-10 text-sm text-white/80 md:flex">
            <span>Product</span>
            <span>Solutions</span>
            <span>Resources</span>
            <span>Pricing</span>
            <span>About</span>
          </nav>

          <div className="hidden items-center gap-5 md:flex">
            <Link href="/access" className="text-sm text-white/80 transition hover:text-white">
              Sign in
            </Link>
            <GradientButton href="/admin/login">Start Your First Production</GradientButton>
          </div>
        </header>

        <section className="pt-16 text-center md:pt-20">
          <div className="mx-auto inline-flex items-center gap-2 text-[15px] text-white/75">
            <Sparkles className="h-4 w-4 text-indigo-300" />
            <span>Your event, written in the stars</span>
            <span className="text-white/35">This is</span>
            <span className="text-indigo-300">Jupiter.</span>
          </div>

          <h1 className="mx-auto mt-4 max-w-[760px] text-[4.2rem] font-semibold leading-[0.96] tracking-tight text-white md:text-[6.1rem]">
            Every Event
            <br />
            Tells a <span className="text-indigo-400">Story.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-[820px] text-[1.5rem] font-medium leading-relaxed text-white/90 md:text-[2rem]">
            Run events like a production. Not meetings—experiences.
          </p>

          <p className="mx-auto mt-2 text-[1.05rem] text-white/68">
            Designed for producers, not just presenters.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <GradientButton href="/admin/login">Start Your First Production</GradientButton>
            <GhostPlayButton href="/access">See How It Works</GhostPlayButton>
          </div>

          <div className="relative mt-16 h-[220px] overflow-hidden">
            <div className="absolute inset-x-[-8%] bottom-[-180px] h-[360px] rounded-[100%] border border-blue-300/20" />
            <div className="absolute inset-x-[-2%] bottom-[-205px] h-[410px] rounded-[100%] border border-indigo-300/12" />
            <div className="absolute left-1/2 bottom-0 h-[210px] w-[1400px] -translate-x-1/2 rounded-[100%] bg-[radial-gradient(ellipse_at_top,rgba(89,161,255,0.72),rgba(53,100,196,0.34),transparent_72%)] blur-md" />
            <div className="absolute left-1/2 bottom-[-18px] h-[170px] w-[1280px] -translate-x-1/2 rounded-[100%] bg-[radial-gradient(ellipse_at_top,rgba(255,192,120,0.35),transparent_55%)] blur-lg" />
          </div>
        </section>

        <section className="pb-10">
          <div className="grid gap-10 md:grid-cols-3">
            {storySteps.map((step) => (
              <StoryOrb
                key={step.title}
                icon={step.icon}
                title={step.title}
                body={step.body}
              />
            ))}
          </div>
        </section>

        <section className="pb-12">
          <ProductionPanel />
        </section>

        <section className="pb-12">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-[3rem] font-semibold tracking-tight text-white md:text-[3.5rem]">
              Scale <span className="text-indigo-400">Beautifully.</span>
            </h2>

            <p className="mt-3 text-lg text-white/65">
              Modern real-time SaaS infrastructure for events that need to feel seamless.
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {scaleFeatures.map((feature) => (
              <ScaleCard
                key={feature.title}
                icon={feature.icon}
                title={feature.title}
                body={feature.body}
              />
            ))}
          </div>
        </section>

        <section className="pb-10">
          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 backdrop-blur-xl md:p-10">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(129,140,248,0.12),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.08),transparent_30%)]" />

            <div className="relative grid gap-8 md:grid-cols-[260px_1fr] md:items-center">
              <div className="relative mx-auto h-40 w-40 md:h-48 md:w-48">
                <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_35%_35%,rgba(255,194,120,0.95),rgba(164,97,58,0.95)_62%,rgba(40,20,16,0.8)_88%)] shadow-[0_0_80px_rgba(251,146,60,0.25)]" />
                <div className="absolute left-1/2 top-1/2 h-[70%] w-[145%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-blue-300/30" />
                <div className="absolute left-1/2 top-1/2 h-[50%] w-[120%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-indigo-300/20" />
              </div>

              <div>
                <h3 className="text-[2.2rem] font-semibold leading-tight tracking-tight text-white md:text-[3rem]">
                  Most events are watched.
                  <br />
                  <span className="text-indigo-400">The best ones are felt.</span>
                </h3>

                <p className="mt-4 max-w-2xl text-lg leading-8 text-white/70">
                  Jupiter is built for the moments that matter—where attention, emotion,
                  and storytelling come together.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="pb-8">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] px-8 py-8 backdrop-blur-xl">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-[2rem] font-semibold tracking-tight text-white md:text-[2.4rem]">
                  Ready to Create Something <span className="text-indigo-400">Unforgettable?</span>
                </h3>
                <p className="mt-2 text-lg text-white/68">
                  Build events that people don’t just attend—they remember.
                </p>
              </div>

              <GradientButton href="/admin/login">Get Started</GradientButton>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}