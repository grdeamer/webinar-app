"use client"

import { useMemo, useState } from "react"

export default function RegistrationFlowPreview() {
  const [step, setStep] = useState(0)
  const [selectedSessionId, setSelectedSessionId] = useState("general")

  const steps = useMemo(() => ["Identity", "Sessions", "Review", "Confirmed"], [])

  const isFirstStep = step === 0
  const isLastStep = step === steps.length - 1

  function handleNext() {
    setStep((current) => Math.min(current + 1, steps.length - 1))
  }

  const registrationRuntime = {
    attendee: {
      firstName: "Gary",
      lastName: "Deamer",
      email: "gary@example.com",
      organization: "Jupiter.events",
    },
    sessions: [
      {
        id: "general",
        title: "General Session",
        reserved: 26,
        capacity: 500,
        status: "available",
        statusLabel: "Available",
      },
      {
        id: "limited",
        title: "Limited Breakout",
        reserved: 30,
        capacity: 30,
        status: "waitlist",
        statusLabel: "Waitlist",
      },
    ],
    approvalMode: "automatic",
    registrationStatus: selectedSessionId === "limited" ? "waitlisted" : "confirmed",
  }

  const selectedSession =
    registrationRuntime.sessions.find((session) => session.id === selectedSessionId) ??
    registrationRuntime.sessions[0]

  const attendeeDisplayName = `${registrationRuntime.attendee.firstName} ${registrationRuntime.attendee.lastName}`
  const selectedSessionLabel = selectedSession.title
  const selectedCapacityState =
    selectedSession.status === "waitlist" ? "Waitlist Requested" : "Confirmed Seat"

  function handleBack() {
    setStep((current) => Math.max(current - 1, 0))
  }

  return (
    <div className="space-y-6 rounded-[28px] border border-white/[0.08] bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.14),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.018))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.04)]">
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
                : "You are confirmed"}
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
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="text-xs font-black uppercase tracking-[0.18em] text-white/38">
            Session Selection
          </div>

          <div className="mt-3 grid gap-3">
            <button
              type="button"
              onClick={() => setSelectedSessionId("general")}
              className={`rounded-2xl border p-4 text-left transition ${
                selectedSessionId === "general"
                  ? "border-emerald-300/34 bg-emerald-500/14 shadow-[0_0_0_1px_rgba(110,231,183,0.14),0_18px_44px_rgba(16,185,129,0.08)]"
                  : "border-emerald-300/18 bg-emerald-500/10 hover:border-emerald-300/28 hover:bg-emerald-500/14"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-white">General Session</div>
                  <div className="mt-1 text-xs text-white/45">{registrationRuntime.sessions[0].reserved} of {registrationRuntime.sessions[0].capacity} seats reserved</div>
                </div>

                <div className="rounded-full border border-emerald-200/18 bg-emerald-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-100/70">
                  Available
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setSelectedSessionId("limited")}
              className={`rounded-2xl border p-4 text-left transition ${
                selectedSessionId === "limited"
                  ? "border-amber-300/34 bg-amber-500/14 shadow-[0_0_0_1px_rgba(252,211,77,0.14),0_18px_44px_rgba(251,191,36,0.08)]"
                  : "border-amber-300/18 bg-amber-500/10 hover:border-amber-300/28 hover:bg-amber-500/14"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-white">Limited Breakout</div>
                  <div className="mt-1 text-xs text-white/45">{registrationRuntime.sessions[1].reserved} of {registrationRuntime.sessions[1].capacity} seats reserved</div>
                </div>

                <div className="rounded-full border border-amber-200/18 bg-amber-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-amber-100/70">
                  Waitlist
                </div>
              </div>
            </button>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
          <div className="text-xs font-black uppercase tracking-[0.18em] text-white/38">
            Review
          </div>

          <div className="mt-4 grid gap-3">
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <span className="text-sm text-white/48">Attendee</span>
              <span className="text-sm font-semibold text-white">{attendeeDisplayName}</span>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <span className="text-sm text-white/48">Session</span>
              <span className="text-sm font-semibold text-white">{selectedSessionLabel}</span>
            </div>

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
      ) : null}

      {step === 3 ? (
        <div className="rounded-2xl border border-emerald-300/18 bg-emerald-500/10 p-6">
          <div className="h-3 w-3 rounded-full bg-emerald-300 shadow-[0_0_24px_rgba(110,231,183,0.72)]" />

          <div className="mt-5 text-3xl font-semibold tracking-[-0.055em] text-white">
            Registration confirmed
          </div>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-white/58">
            The attendee record is created, {selectedSessionLabel.toLowerCase()} is assigned, and registration status is now {registrationRuntime.registrationStatus} for email, access, reporting, changes, and cancellation.
          </p>
        </div>
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
          disabled={isLastStep}
          className="rounded-xl bg-sky-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isLastStep ? "Complete" : "Continue"}
        </button>
      </div>
    </div>
  )
}