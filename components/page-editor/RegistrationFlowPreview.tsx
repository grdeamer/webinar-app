"use client"

import { useMemo, useState } from "react"
import type {
  RegistrationExperienceState,
  RegistrationMode,
  RegistrationRecord,
} from "@/lib/page-editor/types/registration"

type RegistrationPreviewSession = {
  id: "general" | "limited"
  title: string
  reserved: number
  capacity: number
  status: "available" | "waitlist"
  statusLabel: string
  description: string
}

type RegistrationModeMeta = {
  label: string
  title: string
  body: string
  className: string
}

function createPreviewSessions(): RegistrationPreviewSession[] {
  return [
    {
      id: "general",
      title: "General Session",
      reserved: 26,
      capacity: 500,
      status: "available",
      statusLabel: "Available",
      description: "Main event access with immediate confirmation.",
    },
    {
      id: "limited",
      title: "Limited Breakout",
      reserved: 30,
      capacity: 30,
      status: "waitlist",
      statusLabel: "Waitlist",
      description: "Capacity-limited session with automatic waitlist handling.",
    },
  ]
}

function getRegistrationModeMeta(): Record<RegistrationMode, RegistrationModeMeta> {
  return {
    open: {
      label: "Open",
      title: "Open registration",
      body: "Attendees can register immediately and receive confirmation based on session availability.",
      className: "border-emerald-300/20 bg-emerald-500/10 text-emerald-50/72",
    },
    approval_required: {
      label: "Approval Required",
      title: "Review before access",
      body: "Submissions are captured first, then approved by the event team before access is granted.",
      className: "border-amber-300/20 bg-amber-500/10 text-amber-50/72",
    },
    invite_only: {
      label: "Invite Only",
      title: "Private experience",
      body: "Only attendees with a valid invitation or access token can complete registration.",
      className: "border-violet-300/20 bg-violet-500/10 text-violet-50/72",
    },
    closed: {
      label: "Closed",
      title: "Registration closed",
      body: "The experience can remain visible while registration intake is paused or closed.",
      className: "border-red-300/20 bg-red-500/10 text-red-50/72",
    },
  }
}

function createRegistrationRuntime({
  registrationMode,
  selectedSessionId,
  sessions,
}: {
  registrationMode: RegistrationMode
  selectedSessionId: "general" | "limited"
  sessions: RegistrationPreviewSession[]
}): RegistrationExperienceState & { sessions: RegistrationPreviewSession[] } {
  const attendee: RegistrationRecord = {
    id: "preview-registration-1",
    attendeeId: "preview-attendee-1",
    firstName: "Gary",
    lastName: "Deamer",
    email: "gary@example.com",
    registrationStatus:
      registrationMode === "closed" || registrationMode === "invite_only"
        ? "not_registered"
        : registrationMode === "approval_required"
          ? "pending_approval"
          : selectedSessionId === "limited"
            ? "waitlisted"
            : "registered",
    approvalStatus: registrationMode === "approval_required" ? "pending" : "approved",
    waitlistStatus: selectedSessionId === "limited" ? "active" : "none",
    registeredAt: "2026-07-02T12:00:00.000Z",
    approvedAt: registrationMode === "open" ? "2026-07-02T12:00:00.000Z" : null,
    cancelledAt: null,
    checkedInAt: null,
    inviteTokenId: null,
    notes: "Preview registration record for Experience Studio.",
    sessionReservations: [
      {
        sessionId: selectedSessionId,
        sessionTitle: selectedSessionId === "limited" ? "Limited Breakout" : "General Session",
        reservedAt: "2026-07-02T12:00:00.000Z",
        releasedAt: null,
      },
    ],
  }

  return {
    access: {
      mode: registrationMode,
      requiresInviteToken: registrationMode === "invite_only",
      requiresApproval: registrationMode === "approval_required",
      registrationStartAt: null,
      registrationEndAt: null,
    },
    capacity: {
      enabled: true,
      maxAttendees: 500,
      currentRegistered: selectedSessionId === "limited" ? 30 : 26,
      currentWaitlisted: selectedSessionId === "limited" ? 12 : 0,
      allowWaitlist: true,
    },
    registrationOpen: registrationMode !== "closed" && registrationMode !== "invite_only",
    registrationClosedReason:
      registrationMode === "closed"
        ? "Registration is currently closed."
        : registrationMode === "invite_only"
          ? "Registration requires a valid invitation."
          : null,
    attendee,
    sessions,
  }
}

function RegistrationStepRail({ steps, step }: { steps: string[]; step: number }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {steps.map((label, index) => {
        const active = index === step
        const complete = index < step

        return (
          <div
            key={label}
            className={`flex items-center gap-3 rounded-full border px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] transition ${
              active
                ? "border-sky-300/40 bg-sky-400/15 text-sky-50"
                : complete
                  ? "border-emerald-300/30 bg-emerald-400/10 text-emerald-50/80"
                  : "border-white/10 bg-white/[0.03] text-white/40"
            }`}
          >
            <div
              className={`h-2 w-2 rounded-full ${
                active ? "bg-sky-300" : complete ? "bg-emerald-300" : "bg-white/20"
              }`}
            />
            {label}
          </div>
        )
      })}
    </div>
  )
}

function RegistrationModePanel({
  registrationMode,
  registrationModeMeta,
  registrationRuntime,
  onChangeMode,
}: {
  registrationMode: RegistrationMode
  registrationModeMeta: RegistrationModeMeta
  registrationRuntime: RegistrationExperienceState
  onChangeMode: (mode: RegistrationMode) => void
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/34">
            Registration Mode
          </div>
          <div className="mt-2 text-sm font-semibold text-white/78">
            {registrationModeMeta.title}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {([
            ["open", "Open"],
            ["approval_required", "Approval"],
            ["invite_only", "Invite"],
            ["closed", "Closed"],
          ] as const).map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              onClick={() => onChangeMode(mode)}
              className={`rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] transition ${
                registrationMode === mode
                  ? registrationModeMeta.className
                  : "border-white/10 bg-white/[0.03] text-white/38 hover:bg-white/[0.06] hover:text-white/60"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm leading-6 ${registrationModeMeta.className}`}>
        <span className="font-semibold">{registrationModeMeta.label}:</span>{" "}
        {registrationModeMeta.body}
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/32">
            Intake
          </div>
          <div className="mt-1 text-sm font-semibold text-white/72">
            {registrationRuntime.registrationOpen ? "Accepting" : "Paused"}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/32">
            Registered
          </div>
          <div className="mt-1 text-sm font-semibold text-white/72">
            {registrationRuntime.capacity.currentRegistered ?? 0} /{" "}
            {registrationRuntime.capacity.maxAttendees ?? "∞"}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/32">
            Waitlist
          </div>
          <div className="mt-1 text-sm font-semibold text-white/72">
            {registrationRuntime.capacity.currentWaitlisted ?? 0} active
          </div>
        </div>
      </div>
    </div>
  )
}

function RegistrationSessionSelector({
  sessions,
  selectedSessionId,
  onSelectSession,
}: {
  sessions: RegistrationPreviewSession[]
  selectedSessionId: string
  onSelectSession: (sessionId: "general" | "limited") => void
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="text-xs font-black uppercase tracking-[0.18em] text-white/38">
        Session Selection
      </div>

      <div className="mt-3 grid gap-3">
        {sessions.map((session) => {
          const isSelected = selectedSessionId === session.id
          const isWaitlist = session.status === "waitlist"

          return (
            <button
              key={session.id}
              type="button"
              onClick={() => onSelectSession(session.id)}
              className={`rounded-2xl border p-4 text-left transition ${
                isSelected
                  ? isWaitlist
                    ? "border-amber-300/34 bg-amber-500/14 shadow-[0_0_0_1px_rgba(252,211,77,0.14),0_18px_44px_rgba(251,191,36,0.08)]"
                    : "border-emerald-300/34 bg-emerald-500/14 shadow-[0_0_0_1px_rgba(110,231,183,0.14),0_18px_44px_rgba(16,185,129,0.08)]"
                  : isWaitlist
                    ? "border-amber-300/18 bg-amber-500/10 hover:border-amber-300/28 hover:bg-amber-500/14"
                    : "border-emerald-300/18 bg-emerald-500/10 hover:border-emerald-300/28 hover:bg-emerald-500/14"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-white">{session.title}</div>
                  <div className="mt-1 text-xs text-white/45">
                    {session.reserved} of {session.capacity} seats reserved
                  </div>
                  <div className="mt-2 text-xs leading-5 text-white/38">
                    {session.description}
                  </div>
                </div>

                <div
                  className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${
                    isWaitlist
                      ? "border-amber-200/18 bg-amber-400/10 text-amber-100/70"
                      : "border-emerald-200/18 bg-emerald-400/10 text-emerald-100/70"
                  }`}
                >
                  {session.statusLabel}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function RegistrationReviewSummary({
  attendeeDisplayName,
  selectedSessionLabel,
  selectedCapacityState,
  selectedSessionId,
  registrationModeLabel,
  approvalStatus,
  waitlistStatus,
}: {
  attendeeDisplayName: string
  selectedSessionLabel: string
  selectedCapacityState: string
  selectedSessionId: string
  registrationModeLabel: string
  approvalStatus?: string | null
  waitlistStatus?: string | null
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
      <div className="text-xs font-black uppercase tracking-[0.18em] text-white/38">
        Review
      </div>

      <div className="mt-4 grid gap-3">
        {[
          ["Attendee", attendeeDisplayName],
          ["Session", selectedSessionLabel],
          ["Registration Mode", registrationModeLabel],
          ["Approval", approvalStatus],
          ["Waitlist", waitlistStatus],
        ].map(([label, value]) => (
          <div
            key={label}
            className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
          >
            <span className="text-sm text-white/48">{label}</span>
            <span className="text-sm font-semibold text-white">{value}</span>
          </div>
        ))}

        <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
          <span className="text-sm text-white/48">Capacity State</span>
          <span
            className={`text-sm font-semibold ${
              selectedSessionId === "limited" ? "text-amber-100" : "text-emerald-100"
            }`}
          >
            {selectedCapacityState}
          </span>
        </div>
      </div>
    </div>
  )
}

function RegistrationConfirmationState({
  finalTitle,
  finalBody,
}: {
  finalTitle: string
  finalBody: string
}) {
  return (
    <div className="rounded-2xl border border-emerald-300/18 bg-emerald-500/10 p-6">
      <div className="h-3 w-3 rounded-full bg-emerald-300 shadow-[0_0_24px_rgba(110,231,183,0.72)]" />
      <div className="mt-5 text-3xl font-semibold tracking-[-0.055em] text-white">
        {finalTitle}
      </div>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-white/58">
        {finalBody}
      </p>
    </div>
  )
}

export default function RegistrationFlowPreview() {
  const [step, setStep] = useState(0)
  const [selectedSessionId, setSelectedSessionId] = useState<"general" | "limited">("general")
  const [registrationMode, setRegistrationMode] = useState<RegistrationMode>("open")

  const steps = useMemo(() => ["Identity", "Sessions", "Review", "Confirmed"], [])
  const previewSessions = useMemo(() => createPreviewSessions(), [])
  const registrationModeMeta = useMemo(() => getRegistrationModeMeta(), [])

  const registrationRuntime = useMemo(
    () =>
      createRegistrationRuntime({
        registrationMode,
        selectedSessionId,
        sessions: previewSessions,
      }),
    [registrationMode, selectedSessionId, previewSessions]
  )

  const selectedSession =
    registrationRuntime.sessions.find((session) => session.id === selectedSessionId) ??
    registrationRuntime.sessions[0]

  const isFirstStep = step === 0
  const isLastStep = step === steps.length - 1
  const currentModeMeta = registrationModeMeta[registrationMode]
  const attendeeDisplayName = `${registrationRuntime.attendee?.firstName ?? ""} ${
    registrationRuntime.attendee?.lastName ?? ""
  }`.trim()
  const selectedSessionLabel = selectedSession.title
  const selectedCapacityState =
    selectedSession.status === "waitlist" ? "Waitlist Requested" : "Confirmed Seat"

  const finalTitle =
    registrationRuntime.attendee?.registrationStatus === "pending_approval"
      ? "Registration submitted"
      : registrationRuntime.attendee?.registrationStatus === "waitlisted"
        ? "Waitlist request received"
        : "Registration confirmed"

  const finalBody =
    registrationRuntime.attendee?.registrationStatus === "pending_approval"
      ? "The attendee record is captured and waiting for organizer approval before access is granted."
      : registrationRuntime.attendee?.registrationStatus === "waitlisted"
        ? `The attendee record is created and ${selectedSessionLabel.toLowerCase()} is tracking as an active waitlist request.`
        : `The attendee record is created, ${selectedSessionLabel.toLowerCase()} is assigned, and registration status is now ${registrationRuntime.attendee?.registrationStatus} for email, access, reporting, changes, and cancellation.`

  const canContinue = registrationRuntime.registrationOpen
  const continueLabel =
    registrationMode === "closed"
      ? "Registration Closed"
      : registrationMode === "invite_only"
        ? "Invite Required"
        : isLastStep
          ? "Complete"
          : "Continue"

  function handleNext() {
    setStep((current) => Math.min(current + 1, steps.length - 1))
  }

  function handleBack() {
    setStep((current) => Math.max(current - 1, 0))
  }

  return (
    <div className="space-y-6 rounded-[28px] border border-white/[0.08] bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.14),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.018))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.04)]">
      <RegistrationStepRail steps={steps} step={step} />

      <RegistrationModePanel
        registrationMode={registrationMode}
        registrationModeMeta={currentModeMeta}
        registrationRuntime={registrationRuntime}
        onChangeMode={setRegistrationMode}
      />

      <div>
        <div className="text-[10px] font-black uppercase tracking-[0.24em] text-sky-100/50">
          Jupiter Registration
        </div>

        <h3 className="mt-3 text-3xl font-semibold tracking-[-0.055em] text-white">
          {step === 0
            ? "Reserve your place"
            : step === 1
              ? "Choose your sessions"
              : step === 2
                ? "Review your registration"
                : finalTitle}
        </h3>

        <p className="mt-3 max-w-2xl text-sm leading-7 text-white/58">
          {step === 0
            ? "A native registration experience for identity, session choice, capacity, approval, waitlist, confirmation, cancellation, and reporting."
            : step === 1
              ? "Capacity-aware session selection replaces brittle form widgets, manual caps, and downstream spreadsheet matching."
              : step === 2
                ? "Jupiter keeps attendee identity, session selections, approval status, and confirmation state in one durable record."
                : "Confirmation is now part of the event experience, not a disconnected email or automation step."}
        </p>
      </div>

      {step === 0 ? (
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-black/28 px-4 py-3 text-sm text-white/42">
            First name
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/28 px-4 py-3 text-sm text-white/42">
            Last name
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/28 px-4 py-3 text-sm text-white/42 md:col-span-2">
            Email address
          </div>
        </div>
      ) : null}

      {step === 1 ? (
        <RegistrationSessionSelector
          sessions={registrationRuntime.sessions}
          selectedSessionId={selectedSessionId}
          onSelectSession={setSelectedSessionId}
        />
      ) : null}

      {step === 2 ? (
        <RegistrationReviewSummary
          attendeeDisplayName={attendeeDisplayName}
          selectedSessionLabel={selectedSessionLabel}
          selectedCapacityState={selectedCapacityState}
          selectedSessionId={selectedSessionId}
          registrationModeLabel={currentModeMeta.label}
          approvalStatus={registrationRuntime.attendee?.approvalStatus}
          waitlistStatus={registrationRuntime.attendee?.waitlistStatus}
        />
      ) : null}

      {step === 3 ? (
        <RegistrationConfirmationState
          finalTitle={finalTitle}
          finalBody={finalBody}
        />
      ) : null}

      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={handleBack}
          disabled={isFirstStep}
          className="rounded-xl border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-30"
        >
          Back
        </button>

        <button
          type="button"
          onClick={handleNext}
          disabled={isLastStep || (!canContinue && step === 0)}
          className="rounded-xl bg-sky-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {continueLabel}
        </button>
      </div>
    </div>
  )
}