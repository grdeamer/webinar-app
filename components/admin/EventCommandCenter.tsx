"use client"

import Link from "next/link"
import DirectorModePanel from "@/components/admin/DirectorModePanel"
import AdminLogoutButton from "@/components/admin/AdminLogoutButton"
import type { EventBreakout, EventLiveStateRecord } from "@/lib/types"

type BreakoutOption = {
  id: string
  title: string
}

type CommandCenterLiveState = {
  event_id: string
  mode: "lobby" | "general" | "breakout" | "networking" | "ondemand"
  breakout_id: string | null
  force_redirect: boolean
  updated_at: string | null
}

export default function EventCommandCenter({
  eventId,
  eventSlug,
  eventTitle,
  initialLiveState,
  breakouts,
}: {
  eventId: string
  eventSlug: string
  eventTitle: string
  initialLiveState: EventLiveStateRecord | null
  breakouts: EventBreakout[]
}) {
  const breakoutOptions: BreakoutOption[] = breakouts.map((b) => ({
    id: String(b.id),
    title: String(b.title || "Untitled breakout"),
  }))

  const liveState: CommandCenterLiveState = {
    event_id: String((initialLiveState as any)?.event_id || eventId),
    mode:
      (initialLiveState as any)?.mode === "general" ||
      (initialLiveState as any)?.mode === "breakout" ||
      (initialLiveState as any)?.mode === "networking" ||
      (initialLiveState as any)?.mode === "ondemand"
        ? (initialLiveState as any).mode
        : "lobby",
    breakout_id:
      typeof (initialLiveState as any)?.breakout_id === "string"
        ? (initialLiveState as any).breakout_id
        : null,
    force_redirect: !!(initialLiveState as any)?.force_redirect,
    updated_at:
      typeof (initialLiveState as any)?.updated_at === "string"
        ? (initialLiveState as any).updated_at
        : null,
  }

  const activeBreakout =
    liveState.mode === "breakout"
      ? breakouts.find((b) => String(b.id) === String(liveState.breakout_id))
      : null

  const liveLabel =
    liveState.mode === "general"
      ? "General Session"
      : liveState.mode === "networking"
      ? "Networking"
      : liveState.mode === "ondemand"
      ? "On-Demand"
      : liveState.mode === "breakout"
      ? activeBreakout?.title || "Breakout"
      : "Lobby"

  const liveHref =
    liveState.mode === "general"
      ? `/events/${eventSlug}`
      : liveState.mode === "networking"
      ? `/events/${eventSlug}/networking`
      : liveState.mode === "ondemand"
      ? `/events/${eventSlug}/on-demand`
      : liveState.mode === "breakout"
      ? `/events/${eventSlug}/breakouts`
      : `/events/${eventSlug}/lobby`

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-[linear-gradient(135deg,rgba(8,15,30,1),rgba(15,23,42,0.96),rgba(30,41,59,0.94))] p-6 shadow-2xl shadow-black/30">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.28em] text-cyan-200/70">
              Live Event Command Center
            </div>
            <h1 className="mt-3 text-4xl font-bold tracking-tight">{eventTitle}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/65">
              Use this screen as the operator desk for live routing, breakout control, and fast access to attendee-facing pages.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={`/admin/events/${eventId}`}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
            >
              Back to Event
            </Link>

            <Link
              href={`/admin/events/${eventId}/director`}
              className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-500/20"
            >
              Director Mode
            </Link>

            <a
              href={`/events/${eventSlug}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
            >
              Open Public Event
            </a>

            <AdminLogoutButton />
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <DirectorModePanel
          eventId={eventId}
          eventSlug={eventSlug}
          initialState={liveState}
          breakouts={breakoutOptions}
        />

        <div className="space-y-4">
          <section className="rounded-3xl border border-emerald-400/20 bg-emerald-500/10 p-5">
            <div className="text-xs uppercase tracking-[0.24em] text-emerald-200/70">
              Current Live Destination
            </div>
            <div className="mt-3 text-2xl font-bold">{liveLabel}</div>
            <div className="mt-2 break-all text-sm text-white/65">{liveHref}</div>
            <div className="mt-3 text-sm text-white/60">
              Force Redirect:{" "}
              <span className="font-semibold text-white">
                {liveState.force_redirect ? "Enabled" : "Disabled"}
              </span>
            </div>
            <div className="mt-1 text-sm text-white/60">
              Last Updated:{" "}
              <span className="font-semibold text-white">
                {liveState.updated_at ? new Date(liveState.updated_at).toLocaleString() : "Not yet set"}
              </span>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="text-xs uppercase tracking-[0.24em] text-white/45">
              Quick Launch
            </div>

            <div className="mt-4 grid gap-3">
              <a
                href={`/events/${eventSlug}/lobby`}
                target="_blank"
                rel="noreferrer"
                className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 hover:bg-white/10"
              >
                Lobby
              </a>

              <a
                href={`/events/${eventSlug}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 hover:bg-white/10"
              >
                General Session
              </a>

              <a
                href={`/events/${eventSlug}/breakouts`}
                target="_blank"
                rel="noreferrer"
                className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 hover:bg-white/10"
              >
                Breakouts
              </a>

              <a
                href={`/events/${eventSlug}/networking`}
                target="_blank"
                rel="noreferrer"
                className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 hover:bg-white/10"
              >
                Networking
              </a>

              <a
                href={`/events/${eventSlug}/on-demand`}
                target="_blank"
                rel="noreferrer"
                className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 hover:bg-white/10"
              >
                On-Demand
              </a>
            </div>
          </section>
        </div>
      </div>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-[0.24em] text-white/45">
              Breakout Rooms
            </div>
            <h2 className="mt-2 text-2xl font-semibold">Operator breakout overview</h2>
          </div>

          <a
            href={`/events/${eventSlug}/breakouts`}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
          >
            Open Breakouts
          </a>
        </div>

        {breakouts.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-white/10 bg-black/20 p-6 text-sm text-white/60">
            No breakout rooms found yet.
          </div>
        ) : (
          <div className="mt-5 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {breakouts.map((b) => {
              const isLive = liveState.mode === "breakout" && String(liveState.breakout_id) === String(b.id)

              return (
                <article
                  key={b.id}
                  className={`rounded-2xl border p-4 ${
                    isLive
                      ? "border-emerald-400/30 bg-emerald-500/10"
                      : "border-white/10 bg-black/20"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-lg font-semibold">{b.title}</div>
                      <div className="mt-2 text-sm leading-6 text-white/60">
                        {b.description || "No description added yet."}
                      </div>
                    </div>

                    <div
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        isLive
                          ? "bg-emerald-500/20 text-emerald-100"
                          : "bg-white/10 text-white/60"
                      }`}
                    >
                      {isLive ? "LIVE" : "Standby"}
                    </div>
                  </div>

                  <div className="mt-4 text-xs text-white/45">
                    {b.start_at || b.end_at
                      ? `${b.start_at ? new Date(b.start_at).toLocaleString() : "TBD"}${
                          b.end_at ? ` → ${new Date(b.end_at).toLocaleTimeString()}` : ""
                        }`
                      : "Time TBD"}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}