import Link from "next/link"
import { supabaseAdmin } from "@/lib/supabase/admin"
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Calendar,
  MessageSquare,
  Monitor,
  Radio,
  Users,
  Video,
  Wrench,
} from "lucide-react"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function statusPill(published: boolean) {
  return published
    ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
    : "border-amber-300/20 bg-amber-300/10 text-amber-100"
}

function cardClass() {
  return "rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20 backdrop-blur"
}

function actionClass() {
  return "rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/85 transition hover:bg-white/10 hover:text-white"
}

export default async function AdminDashboardPage() {
  const { data: gs } = await supabaseAdmin
    .from("general_session_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle()

  const published = Boolean(gs?.is_published)
  const sourceType = gs?.source_type ?? "Not set"

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-orange-400/12 via-slate-900 to-sky-500/10 p-6 shadow-2xl shadow-black/30 lg:p-8">
        <div className="absolute -right-16 top-0 h-56 w-56 rounded-full bg-orange-400/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-44 w-44 rounded-full bg-sky-400/10 blur-3xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="text-xs uppercase tracking-[0.28em] text-white/45">
              Jupiter.events Admin
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-5xl">
              Mission Control
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/65 md:text-base">
              Manage broadcasts, monitor event readiness, and launch attendee experiences
              from one control surface.
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <span
                className={[
                  "rounded-full border px-3 py-1 text-xs font-medium",
                  statusPill(published),
                ].join(" ")}
              >
                {published ? "General Session Published" : "General Session Draft"}
              </span>

              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/65">
                Source: {sourceType}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/general-session"
              className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5"
            >
              Edit General Session
            </Link>
            <Link
              href="/general-session"
              className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Open Live Player
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className={cardClass()}>
          <div className="flex items-center justify-between">
            <div className="text-sm text-white/55">Broadcast Status</div>
            <Video size={18} className="text-white/45" />
          </div>
          <div className="mt-3 text-2xl font-semibold">
            {published ? "Live Ready" : "Needs Publish"}
          </div>
          <div className="mt-1 text-sm text-white/60">
            General session is currently {published ? "available to attendees" : "still in draft mode"}.
          </div>
        </div>

        <div className={cardClass()}>
          <div className="flex items-center justify-between">
            <div className="text-sm text-white/55">Input Source</div>
            <Radio size={18} className="text-white/45" />
          </div>
          <div className="mt-3 text-2xl font-semibold">{sourceType}</div>
          <div className="mt-1 text-sm text-white/60">
            Current playback source for the main event experience.
          </div>
        </div>

        <div className={cardClass()}>
          <div className="flex items-center justify-between">
            <div className="text-sm text-white/55">Presenter Access</div>
            <Monitor size={18} className="text-white/45" />
          </div>
          <div className="mt-3 text-2xl font-semibold">Available</div>
          <div className="mt-1 text-sm text-white/60">
            Presenter mode is ready for show control and stage support.
          </div>
        </div>

        <div className={cardClass()}>
          <div className="flex items-center justify-between">
            <div className="text-sm text-white/55">Operations</div>
            <Activity size={18} className="text-white/45" />
          </div>
          <div className="mt-3 text-2xl font-semibold">Mission Active</div>
          <div className="mt-1 text-sm text-white/60">
            Use the tools below to manage audience, content, and system flow.
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className={cardClass()}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.24em] text-white/40">
                Primary Controls
              </div>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                Broadcast & event tools
              </h2>
            </div>
            <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/50">
              Fast access
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <Link href="/admin/general-session" className={actionClass()}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Video size={18} className="text-amber-200" />
                  <span>General Session</span>
                </div>
                <ArrowUpRight size={16} className="text-white/40" />
              </div>
              <div className="mt-2 text-xs text-white/50">
                Configure player, source, and publish state.
              </div>
            </Link>

            <Link href="/admin/general-session/qa" className={actionClass()}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <MessageSquare size={18} className="text-amber-200" />
                  <span>Q&amp;A Control</span>
                </div>
                <ArrowUpRight size={16} className="text-white/40" />
              </div>
              <div className="mt-2 text-xs text-white/50">
                Moderate audience questions and featured content.
              </div>
            </Link>

            <Link href="/admin/events" className={actionClass()}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Calendar size={18} className="text-amber-200" />
                  <span>Events</span>
                </div>
                <ArrowUpRight size={16} className="text-white/40" />
              </div>
              <div className="mt-2 text-xs text-white/50">
                Manage event pages, sessions, and structure.
              </div>
            </Link>

            <Link href="/presenter" className={actionClass()}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Monitor size={18} className="text-amber-200" />
                  <span>Presenter Mode</span>
                </div>
                <ArrowUpRight size={16} className="text-white/40" />
              </div>
              <div className="mt-2 text-xs text-white/50">
                Open the presenter-facing control environment.
              </div>
            </Link>
          </div>
        </div>

        <div className={cardClass()}>
          <div className="text-xs uppercase tracking-[0.24em] text-white/40">
            Platform Links
          </div>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">
            Core management
          </h2>

          <div className="mt-6 space-y-3">
            <Link href="/admin/webinars" className={actionClass()}>
              <div className="flex items-center gap-3">
                <Monitor size={18} className="text-sky-200" />
                <span>Webinars</span>
              </div>
            </Link>

            <Link href="/admin/users" className={actionClass()}>
              <div className="flex items-center gap-3">
                <Users size={18} className="text-sky-200" />
                <span>Users</span>
              </div>
            </Link>

            <Link href="/admin/analytics" className={actionClass()}>
              <div className="flex items-center gap-3">
                <BarChart3 size={18} className="text-sky-200" />
                <span>Analytics</span>
              </div>
            </Link>

            <Link href="/admin/activity" className={actionClass()}>
              <div className="flex items-center gap-3">
                <Activity size={18} className="text-sky-200" />
                <span>Operations</span>
              </div>
            </Link>

            <Link href="/admin/dev-tools" className={actionClass()}>
              <div className="flex items-center gap-3">
                <Wrench size={18} className="text-sky-200" />
                <span>Dev Tools</span>
              </div>
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className={cardClass()}>
          <div className="text-sm text-white/55">Attendee Experience</div>
          <div className="mt-3 text-xl font-semibold">Public Entry</div>
          <p className="mt-2 text-sm leading-7 text-white/60">
            Open the attendee flow to test branded access, lobby routing, and session entry.
          </p>
          <div className="mt-5">
            <Link
              href="/access"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/85 transition hover:bg-white/10"
            >
              Open attendee access
              <ArrowUpRight size={15} />
            </Link>
          </div>
        </div>

        <div className={cardClass()}>
          <div className="text-sm text-white/55">Live Experience</div>
          <div className="mt-3 text-xl font-semibold">General Session Player</div>
          <p className="mt-2 text-sm leading-7 text-white/60">
            Verify playback, publish state, and stream configuration from the live player.
          </p>
          <div className="mt-5">
            <Link
              href="/general-session"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/85 transition hover:bg-white/10"
            >
              Open general session
              <ArrowUpRight size={15} />
            </Link>
          </div>
        </div>

        <div className={cardClass()}>
          <div className="text-sm text-white/55">Homepage</div>
          <div className="mt-3 text-xl font-semibold">Jupiter.events</div>
          <p className="mt-2 text-sm leading-7 text-white/60">
            View the public landing page and confirm your branding flow is connected.
          </p>
          <div className="mt-5">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/85 transition hover:bg-white/10"
            >
              View homepage
              <ArrowUpRight size={15} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}