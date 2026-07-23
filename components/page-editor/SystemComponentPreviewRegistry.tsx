"use client"

import type { EventPageSection } from "@/lib/page-editor/sectionTypes"
import RegistrationFlowPreview from "./RegistrationFlowPreview"

export function createSystemComponentPreviewRegistry({
  sections,
}: {
  sections: EventPageSection[]
}) {
  return {
    live_state: (
      <div className="flex items-center gap-2 text-sm">
        <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
        <span className="text-white/80">Live status preview</span>
      </div>
    ),

    stage_player: (
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-black">
        <div className="flex h-[220px] items-center justify-center text-sm text-white/45">
          Stage player preview
        </div>
      </div>
    ),

    countdown: (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="text-xs uppercase tracking-[0.18em] text-white/40">
          Countdown
        </div>
        <div className="mt-3 text-lg font-semibold text-white">
          Next session begins soon
        </div>
        <div className="mt-2 text-sm text-white/60">00d 00h 00m 00s</div>
      </div>
    ),

    agenda: (() => {
      const agendaBlock = sections
        .flatMap((section) => section.blocks ?? [])
        .find(
          (block) =>
            block.type === "system_component" &&
            block.props.componentKey === "agenda"
        )

      const agendaProps: Record<string, unknown> =
        agendaBlock?.type === "system_component"
          ? (agendaBlock.props as Record<string, unknown>)
          : {}

      const title =
        typeof agendaProps.title === "string"
          ? agendaProps.title
          : "Event Agenda"

      const description =
        typeof agendaProps.body === "string"
          ? agendaProps.body
          : "Browse the event schedule."

      const displayMode =
        typeof (agendaProps as any).displayMode === "string"
          ? (agendaProps as any).displayMode
          : "list"

      const showTime =
        typeof (agendaProps as any).showTime === "boolean"
          ? (agendaProps as any).showTime
          : true

      const showDescriptions =
        typeof (agendaProps as any).showDescriptions === "boolean"
          ? (agendaProps as any).showDescriptions
          : true

      const agendaItems = [
        {
          time: "9:00 AM",
          title: "Welcome",
          description: "Opening remarks and event orientation.",
        },
        {
          time: "10:00 AM",
          title: "Main Session",
          description: "Featured content from the main stage.",
        },
        {
          time: "11:00 AM",
          title: "Breakouts",
          description: "Continue into focused breakout experiences.",
        },
      ]

      return (
        <div className="space-y-3">
          <div>
            <div className="text-sm font-semibold text-white">{title}</div>
            {description ? (
              <div className="mt-1 text-sm text-white/55">{description}</div>
            ) : null}
          </div>

          <div
            className={
              displayMode === "cards"
                ? "grid gap-3 md:grid-cols-3"
                : "space-y-3"
            }
          >
            {agendaItems.map((item, index) => (
              <div
                key={`${item.time}-${item.title}`}
                className={`rounded-xl border border-white/10 bg-white/[0.03] p-4 ${
                  displayMode === "timeline" ? "relative pl-8" : ""
                }`}
              >
                {displayMode === "timeline" ? (
                  <span className="absolute left-3 top-5 h-2 w-2 rounded-full bg-sky-300" />
                ) : null}

                <div className="text-sm text-white">
                  {showTime ? `${item.time} — ` : ""}
                  {item.title}
                </div>

                {showDescriptions ? (
                  <div className="mt-2 text-sm text-white/55">
                    {item.description}
                  </div>
                ) : null}

                {displayMode === "timeline" && index < agendaItems.length - 1 ? (
                  <span className="absolute bottom-[-13px] left-[15px] top-7 w-px bg-white/10" />
                ) : null}
              </div>
            ))}
          </div>
        </div>
      )
    })(),

    speaker_cards: (() => {
      const speakerBlock = sections
        .flatMap((section) => section.blocks ?? [])
        .find(
          (block) =>
            block.type === "system_component" &&
            block.props.componentKey === "speaker_cards"
        )

      const speakerProps: Record<string, unknown> =
        speakerBlock?.type === "system_component"
          ? (speakerBlock.props as Record<string, unknown>)
          : {}

      const title =
        typeof speakerProps.title === "string"
          ? speakerProps.title
          : "Featured Speakers"

      const description =
        typeof speakerProps.body === "string"
          ? speakerProps.body
          : "Meet the voices guiding this experience."

      const displayMode =
        typeof speakerProps.displayMode === "string"
          ? speakerProps.displayMode
          : "grid"

      const showRole =
        typeof speakerProps.showRole === "boolean" ? speakerProps.showRole : true

      const showCompany =
        typeof speakerProps.showCompany === "boolean"
          ? speakerProps.showCompany
          : true

      const showBio =
        typeof speakerProps.showBio === "boolean" ? speakerProps.showBio : true

      const speakers = [
        {
          initials: "AM",
          name: "Alex Morgan",
          role: "Executive Producer",
          company: "Jupiter Studios",
          bio: "Designing live moments that feel intentional, cinematic, and human.",
        },
        {
          initials: "JL",
          name: "Jordan Lee",
          role: "Creative Director",
          company: "Northstar Collective",
          bio: "Building visual systems that help audiences feel the story, not just watch it.",
        },
        {
          initials: "SK",
          name: "Sam Kim",
          role: "Experience Strategist",
          company: "Signal House",
          bio: "Connecting programming, community, and production into one cohesive experience.",
        },
      ]

      const visibleSpeakers =
        displayMode === "spotlight" ? speakers.slice(0, 1) : speakers

      return (
        <div className="space-y-4">
          <div>
            <div className="text-sm font-semibold text-white">{title}</div>
            {description ? (
              <div className="mt-1 text-sm text-white/55">{description}</div>
            ) : null}
          </div>

          <div
            className={
              displayMode === "list"
                ? "space-y-3"
                : displayMode === "spotlight"
                  ? "max-w-2xl"
                  : "grid gap-3 md:grid-cols-3"
            }
          >
            {visibleSpeakers.map((speaker) => (
              <div
                key={speaker.name}
                className={`rounded-2xl border border-white/10 bg-white/[0.03] ${
                  displayMode === "list"
                    ? "flex items-center gap-4 p-4"
                    : displayMode === "spotlight"
                      ? "grid gap-5 p-6 md:grid-cols-[96px_1fr] md:items-center"
                      : "p-4"
                }`}
              >
                <div
                  className={`flex shrink-0 items-center justify-center rounded-full border border-violet-200/15 bg-violet-400/12 font-black text-violet-50/75 ${
                    displayMode === "spotlight"
                      ? "h-24 w-24 text-xl"
                      : "h-14 w-14 text-sm"
                  }`}
                >
                  {speaker.initials}
                </div>

                <div className={displayMode === "grid" ? "mt-4" : "min-w-0"}>
                  <div className="text-sm font-semibold text-white">
                    {speaker.name}
                  </div>

                  {showRole ? (
                    <div className="mt-1 text-xs text-white/55">{speaker.role}</div>
                  ) : null}

                  {showCompany ? (
                    <div className="mt-1 text-xs font-semibold text-violet-100/55">
                      {speaker.company}
                    </div>
                  ) : null}

                  {showBio ? (
                    <div className="mt-3 text-sm leading-6 text-white/52">
                      {speaker.bio}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      )
    })(),

    sessions_list: (() => {
      const sessionsBlock = sections
        .flatMap((section) => section.blocks ?? [])
        .find(
          (block) =>
            block.type === "system_component" &&
            block.props.componentKey === "sessions_list"
        )

      const sessionsProps: Record<string, unknown> =
        sessionsBlock?.type === "system_component"
          ? (sessionsBlock.props as Record<string, unknown>)
          : {}

      const title =
        typeof sessionsProps.title === "string"
          ? sessionsProps.title
          : "Featured Sessions"

      const description =
        typeof sessionsProps.body === "string"
          ? sessionsProps.body
          : "Browse the sessions available for this event."

      const showDescriptions =
        typeof sessionsProps.showDescriptions === "boolean"
          ? sessionsProps.showDescriptions
          : true

      const displayMode =
        typeof sessionsProps.displayMode === "string"
          ? sessionsProps.displayMode
          : "cards"

      const showTime =
        typeof sessionsProps.showTime === "boolean"
          ? sessionsProps.showTime
          : true

      const showPresenter =
        typeof sessionsProps.showPresenter === "boolean"
          ? sessionsProps.showPresenter
          : true

      const showJoinAction =
        typeof sessionsProps.showJoinAction === "boolean"
          ? sessionsProps.showJoinAction
          : true

      const sessionItems = [
        {
          title: "Session One",
          time: "9:00 AM",
          presenter: "Alex Morgan",
          description: "Session card preview",
        },
        {
          title: "Session Two",
          time: "10:30 AM",
          presenter: "Jordan Lee",
          description: "Session card preview",
        },
      ]

      return (
        <div className="space-y-4">
          <div>
            <div className="text-sm font-semibold text-white">{title}</div>
            {description ? (
              <div className="mt-1 text-sm text-white/55">{description}</div>
            ) : null}
          </div>

          <div
            className={
              displayMode === "list"
                ? "space-y-3"
                : displayMode === "featured"
                  ? "grid gap-3 md:grid-cols-[1.35fr_1fr]"
                  : "grid gap-3 md:grid-cols-2"
            }
          >
            {sessionItems.map((session, index) => (
              <div
                key={session.title}
                className={`rounded-xl border border-white/10 bg-white/[0.03] p-4 ${
                  displayMode === "featured" && index === 0
                    ? "md:row-span-2 md:p-6"
                    : ""
                }`}
              >
                {showTime ? (
                  <div className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-sky-200/60">
                    {session.time}
                  </div>
                ) : null}

                <div className="text-sm font-semibold text-white">
                  {session.title}
                </div>

                {showPresenter ? (
                  <div className="mt-1 text-xs text-white/45">
                    Presented by {session.presenter}
                  </div>
                ) : null}

                {showDescriptions ? (
                  <div className="mt-2 text-sm text-white/60">
                    {session.description}
                  </div>
                ) : null}

                {showJoinAction ? (
                  <button
                    type="button"
                    className="mt-4 rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-semibold text-white/75"
                  >
                    Join Session
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      )
    })(),

    registration_form: (
      <RegistrationFlowPreview
        title="Reserve Your Place"
        body="Native Jupiter registration flow with field builder, session binding, waitlist, and reservation state."
        ctaLabel="Start Registration"
        confirmationTitle="Registration Confirmed"
        confirmationBody="Your registration is part of the live Jupiter event experience now."
      />
    ),

    registration_status: (
      <div className="rounded-2xl border border-emerald-300/20 bg-emerald-500/10 p-5">
        <div className="text-xs uppercase tracking-[0.18em] text-emerald-100/50">
          Registration Status
        </div>

        <div className="mt-2 text-lg font-semibold text-emerald-50">
          Registered
        </div>

        <div className="mt-2 text-sm text-emerald-100/60">
          Confirmation email sent successfully.
        </div>
      </div>
    ),

    approval_gate: (
      <div className="rounded-2xl border border-amber-300/20 bg-amber-500/10 p-5">
        <div className="text-xs uppercase tracking-[0.18em] text-amber-100/50">
          Approval Required
        </div>

        <div className="mt-2 text-lg font-semibold text-amber-50">
          Pending Approval
        </div>

        <div className="mt-2 text-sm text-amber-100/60">
          Your registration is awaiting organizer review.
        </div>
      </div>
    ),

    waitlist_status: (
      <div className="rounded-2xl border border-violet-300/20 bg-violet-500/10 p-5">
        <div className="text-xs uppercase tracking-[0.18em] text-violet-100/50">
          Waitlist
        </div>

        <div className="mt-2 text-lg font-semibold text-violet-50">
          You’re on the waitlist
        </div>

        <div className="mt-2 text-sm text-violet-100/60">
          We’ll notify you if space becomes available.
        </div>
      </div>
    ),

    attendee_badge: (
      <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-400/20 text-sm font-black text-sky-100">
          GD
        </div>

        <div>
          <div className="text-sm font-semibold text-white">
            Attendee Badge
          </div>

          <div className="text-xs text-white/50">VIP • Registered</div>
        </div>
      </div>
    ),

    speaker_spotlight: (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="text-sm font-semibold text-white">
          Featured Speaker
        </div>

        <div className="mt-2 text-sm text-white/60">
          Spotlight component preview
        </div>
      </div>
    ),

    access_gate: (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="text-sm font-semibold text-white">Access Gate</div>

        <div className="mt-2 text-sm text-white/60">
          Email/login preview block
        </div>
      </div>
    ),

    featured_breakouts: (
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/70">
          Breakout preview
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/70">
          Breakout preview
        </div>
      </div>
    ),
  }
}
