"use client"

import { useMemo, useState, type Dispatch, type SetStateAction } from "react"
import type {
  RegistrationExperienceState,
  RegistrationMode,
  RegistrationRecord,
} from "@/lib/page-editor/types/registration"

type RegistrationPreviewSession = {
  id: "general" | "limited" | "workshop"
  code: string
  title: string
  sessionKind: "main_stage" | "breakout" | "workshop"
  capacityMode: "unlimited" | "limited"
  registrationEnabled: boolean
  waitlistEnabled: boolean
  reserved: number
  capacity: number | null
  status: "available" | "waitlist" | "closed"
  statusLabel: string
  description: string
}

type RegistrationModeMeta = {
  label: string
  title: string
  body: string
  className: string
}

type RegistrationFieldDefinition = {
  id: "firstName" | "lastName" | "email" | "organization" | "jobTitle" | "phone" | "dietaryNeeds"
  label: string
  placeholder: string
  fieldType: "text" | "email"
  required: boolean
  visible: boolean
  locked?: boolean
  width: "half" | "full"
  helperText?: string
}

type RegistrationConditionalSection = {
  id: "approvalNotes" | "waitlistPreferences" | "inviteCode" | "sessionCapacityNotice"
  title: string
  body: string
  conditionLabel: string
  active: boolean
  accent: "amber" | "violet" | "sky"
}

type RegistrationBuilderSnapshot = {
  version: 1
  fieldCount: number
  visibleFieldCount: number
  requiredFieldCount: number
  fieldOrder: RegistrationFieldDefinition["id"][]
  visibleFields: RegistrationFieldDefinition["id"][]
  requiredFields: RegistrationFieldDefinition["id"][]
  sessionBindings: Array<{
    id: RegistrationPreviewSession["id"]
    code: string
    capacityMode: RegistrationPreviewSession["capacityMode"]
    registrationEnabled: boolean
    waitlistEnabled: boolean
    status: RegistrationPreviewSession["status"]
  }>
  conditionalSections: Array<{
    id: RegistrationConditionalSection["id"]
    active: boolean
  }>
}

function getPreviewSessionStatus(session: Omit<RegistrationPreviewSession, "status" | "statusLabel">): {
  status: RegistrationPreviewSession["status"]
  statusLabel: string
} {
  if (!session.registrationEnabled) {
    return { status: "closed", statusLabel: "Closed" }
  }

  if (session.capacityMode === "limited" && session.capacity !== null && session.reserved >= session.capacity) {
    return session.waitlistEnabled
      ? { status: "waitlist", statusLabel: "Waitlist" }
      : { status: "closed", statusLabel: "Full" }
  }

  return { status: "available", statusLabel: "Available" }
}

function createPreviewSessions(): RegistrationPreviewSession[] {
  const baseSessions: Array<Omit<RegistrationPreviewSession, "status" | "statusLabel">> = [
    {
      id: "general",
      code: "GENERAL",
      title: "General Session",
      sessionKind: "main_stage",
      capacityMode: "unlimited",
      registrationEnabled: true,
      waitlistEnabled: false,
      reserved: 26,
      capacity: null,
      description: "Main event access with immediate confirmation.",
    },
    {
      id: "limited",
      code: "BREAKOUT-A",
      title: "Limited Breakout",
      sessionKind: "breakout",
      capacityMode: "limited",
      registrationEnabled: true,
      waitlistEnabled: true,
      reserved: 30,
      capacity: 30,
      description: "Capacity-limited session with automatic waitlist handling.",
    },
    {
      id: "workshop",
      code: "WORKSHOP-1",
      title: "Producer Workshop",
      sessionKind: "workshop",
      capacityMode: "limited",
      registrationEnabled: false,
      waitlistEnabled: false,
      reserved: 12,
      capacity: 20,
      description: "Example of a session that exists but is not currently available for registration.",
    },
  ]

  return baseSessions.map((session) => ({
    ...session,
    ...getPreviewSessionStatus(session),
  }))
}

function createRegistrationFields(): RegistrationFieldDefinition[] {
  return [
    {
      id: "firstName",
      label: "First name",
      placeholder: "Gary",
      fieldType: "text",
      required: true,
      visible: true,
      locked: true,
      width: "half",
    },
    {
      id: "lastName",
      label: "Last name",
      placeholder: "Deamer",
      fieldType: "text",
      required: true,
      visible: true,
      locked: true,
      width: "half",
    },
    {
      id: "email",
      label: "Email address",
      placeholder: "gary@example.com",
      fieldType: "email",
      required: true,
      visible: true,
      locked: true,
      width: "full",
      helperText: "Used for confirmation, access, changes, and cancellation.",
    },
    {
      id: "organization",
      label: "Organization",
      placeholder: "Jupiter.events",
      fieldType: "text",
      required: false,
      visible: true,
      width: "full",
      helperText: "Optional field previewing future builder-controlled registration fields.",
    },
  ]
}


function moveRegistrationField(
  fields: RegistrationFieldDefinition[],
  fieldId: RegistrationFieldDefinition["id"],
  direction: "up" | "down"
) {
  const index = fields.findIndex((field) => field.id === fieldId)
  if (index === -1) return fields

  const targetIndex = direction === "up" ? index - 1 : index + 1
  if (targetIndex < 0 || targetIndex >= fields.length) return fields

  const next = [...fields]
  const [moved] = next.splice(index, 1)
  next.splice(targetIndex, 0, moved)

  return next
}


function createFieldFromTemplate(
  templateId: "jobTitle" | "phone" | "dietaryNeeds"
): RegistrationFieldDefinition {
  switch (templateId) {
    case "phone":
      return {
        id: "phone",
        label: "Phone number",
        placeholder: "(555) 123-4567",
        fieldType: "text",
        required: false,
        visible: true,
        width: "half",
        helperText: "Useful for onsite, VIP, or high-touch event workflows.",
      }
    case "dietaryNeeds":
      return {
        id: "dietaryNeeds",
        label: "Dietary needs",
        placeholder: "Vegetarian, gluten-free, allergies, etc.",
        fieldType: "text",
        required: false,
        visible: true,
        width: "full",
        helperText: "Preview of custom attendee questions for hybrid or in-person programs.",
      }
    case "jobTitle":
    default:
      return {
        id: "jobTitle",
        label: "Job title",
        placeholder: "Executive Producer",
        fieldType: "text",
        required: false,
        visible: true,
        width: "half",
        helperText: "Optional professional profile field for attendee segmentation.",
      }
  }
}


function createConditionalSections({
  registrationMode,
  selectedSession,
}: {
  registrationMode: RegistrationMode
  selectedSession: RegistrationPreviewSession
}): RegistrationConditionalSection[] {
  return [
    {
      id: "approvalNotes",
      title: "Approval notes",
      body: "Collect context for organizer review before access is granted.",
      conditionLabel: "Shows when mode is Approval Required",
      active: registrationMode === "approval_required",
      accent: "amber",
    },
    {
      id: "inviteCode",
      title: "Invite code",
      body: "Require a valid invitation token before the registration flow can continue.",
      conditionLabel: "Shows when mode is Invite Only",
      active: registrationMode === "invite_only",
      accent: "violet",
    },
    {
      id: "waitlistPreferences",
      title: "Waitlist preferences",
      body: "Capture backup choices and attendee priority signals when a session is full.",
      conditionLabel: "Shows when selected session is waitlisted",
      active: selectedSession.status === "waitlist",
      accent: "sky",
    },
    {
      id: "sessionCapacityNotice",
      title: "Session capacity notice",
      body: "Surface session-specific capacity, availability, and registration constraints before checkout.",
      conditionLabel: "Shows when session uses limited capacity or is closed",
      active: selectedSession.capacityMode === "limited" || selectedSession.status === "closed",
      accent: "sky",
    },
  ]
}

function createBuilderSnapshot({
  fields,
  conditionalSections,
  sessions,
}: {
  fields: RegistrationFieldDefinition[]
  conditionalSections: RegistrationConditionalSection[]
  sessions: RegistrationPreviewSession[]
}): RegistrationBuilderSnapshot {
  return {
    version: 1,
    fieldCount: fields.length,
    visibleFieldCount: fields.filter((field) => field.visible).length,
    requiredFieldCount: fields.filter((field) => field.required).length,
    fieldOrder: fields.map((field) => field.id),
    visibleFields: fields.filter((field) => field.visible).map((field) => field.id),
    requiredFields: fields.filter((field) => field.required).map((field) => field.id),
    sessionBindings: sessions.map((session) => ({
      id: session.id,
      code: session.code,
      capacityMode: session.capacityMode,
      registrationEnabled: session.registrationEnabled,
      waitlistEnabled: session.waitlistEnabled,
      status: session.status,
    })),
    conditionalSections: conditionalSections.map((section) => ({
      id: section.id,
      active: section.active,
    })),
  }
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
  selectedSessionId: RegistrationPreviewSession["id"]
  sessions: RegistrationPreviewSession[]
}): RegistrationExperienceState & { sessions: RegistrationPreviewSession[] } {
  const selectedSession = sessions.find((session) => session.id === selectedSessionId) ?? sessions[0]
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
          : selectedSession.status === "waitlist"
            ? "waitlisted"
            : "registered",
    approvalStatus: registrationMode === "approval_required" ? "pending" : "approved",
    waitlistStatus: selectedSession.status === "waitlist" ? "active" : "none",
    registeredAt: "2026-07-02T12:00:00.000Z",
    approvedAt: registrationMode === "open" ? "2026-07-02T12:00:00.000Z" : null,
    cancelledAt: null,
    checkedInAt: null,
    inviteTokenId: null,
    notes: "Preview registration record for Experience Studio.",
    sessionReservations: [
      {
        sessionId: selectedSessionId,
        sessionTitle: selectedSession.title,
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
      currentRegistered: selectedSession.reserved,
      currentWaitlisted: selectedSession.status === "waitlist" ? 12 : 0,
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


function RegistrationIdentityStep({
  fields,
  setFields,
}: {
  fields: RegistrationFieldDefinition[]
  setFields: Dispatch<SetStateAction<RegistrationFieldDefinition[]>>
}) {
  const visibleFields = fields.filter((field) => field.visible)
  const addableTemplates = (["jobTitle", "phone", "dietaryNeeds"] as const).filter(
    (templateId) => !fields.some((field) => field.id === templateId)
  )

  return (
    <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.18em] text-white/38">
              Identity Fields
            </div>
            <div className="mt-2 text-sm leading-6 text-white/48">
              Field-definition driven. Builder controls now update the preview state.
            </div>
          </div>

          <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white/38">
            {visibleFields.length} visible
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {visibleFields.map((field) => (
            <div
              key={field.id}
              className={`rounded-2xl border border-white/10 bg-black/28 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)] ${
                field.width === "full" ? "md:col-span-2" : ""
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/34">
                  {field.label}
                </div>

                {field.required ? (
                  <div className="rounded-full border border-sky-200/16 bg-sky-400/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-sky-50/60">
                    Required
                  </div>
                ) : (
                  <div className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-white/30">
                    Optional
                  </div>
                )}
              </div>

              <div className="mt-3 text-sm font-semibold text-white/68">
                {field.placeholder}
              </div>

              {field.helperText ? (
                <div className="mt-2 text-xs leading-5 text-white/34">
                  {field.helperText}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.18em] text-white/38">
              Builder Controls
            </div>
            <div className="mt-2 text-sm leading-6 text-white/48">
              Preview field ordering, visibility, required state, layout width, and custom field insertion.
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-sky-200/12 bg-sky-400/[0.045] p-3">
          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-sky-50/44">
            Add Field
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {addableTemplates.length > 0 ? (
              addableTemplates.map((templateId) => (
                <button
                  key={templateId}
                  type="button"
                  onClick={() =>
                    setFields((current) => [...current, createFieldFromTemplate(templateId)])
                  }
                  className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-white/50 transition hover:bg-white/[0.06] hover:text-white/72"
                >
                  + {templateId === "jobTitle" ? "Job" : templateId === "phone" ? "Phone" : "Diet"}
                </button>
              ))
            ) : (
              <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-white/32 sm:col-span-3">
                All preview fields added
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-white/78">{field.label}</div>
                  <div className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-white/28">
                    {field.fieldType} · {field.width}
                    {field.locked ? " · locked" : ""}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      setFields((current) => moveRegistrationField(current, field.id, "up"))
                    }
                    disabled={index === 0}
                    className="rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-xs font-black text-white/50 transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-25"
                  >
                    ↑
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setFields((current) => moveRegistrationField(current, field.id, "down"))
                    }
                    disabled={index === fields.length - 1}
                    className="rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-xs font-black text-white/50 transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-25"
                  >
                    ↓
                  </button>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setFields((current) =>
                      current.map((item) =>
                        item.id === field.id ? { ...item, visible: !item.visible } : item
                      )
                    )
                  }
                  disabled={field.locked}
                  className={`rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] transition ${
                    field.visible
                      ? "border-emerald-200/18 bg-emerald-400/10 text-emerald-50/60"
                      : "border-red-200/18 bg-red-400/10 text-red-50/60"
                  } ${field.locked ? "cursor-not-allowed opacity-45" : "hover:bg-white/[0.06]"}`}
                >
                  {field.visible ? "Shown" : "Hidden"}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setFields((current) =>
                      current.map((item) =>
                        item.id === field.id ? { ...item, required: !item.required } : item
                      )
                    )
                  }
                  disabled={field.locked}
                  className={`rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] transition ${
                    field.required
                      ? "border-sky-200/18 bg-sky-400/10 text-sky-50/60"
                      : "border-white/10 bg-white/[0.03] text-white/36"
                  } ${field.locked ? "cursor-not-allowed opacity-45" : "hover:bg-white/[0.06]"}`}
                >
                  {field.required ? "Req" : "Opt"}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setFields((current) =>
                      current.map((item) =>
                        item.id === field.id
                          ? { ...item, width: item.width === "full" ? "half" : "full" }
                          : item
                      )
                    )
                  }
                  className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-white/42 transition hover:bg-white/[0.06]"
                >
                  {field.width}
                </button>
              </div>

              {!field.locked ? (
                <button
                  type="button"
                  onClick={() =>
                    setFields((current) => current.filter((item) => item.id !== field.id))
                  }
                  className="mt-2 w-full rounded-xl border border-red-200/14 bg-red-400/8 px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-red-50/46 transition hover:bg-red-400/12 hover:text-red-50/70"
                >
                  Remove Field
                </button>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}



function RegistrationConditionalSections({
  sections,
}: {
  sections: RegistrationConditionalSection[]
}) {
  const activeSections = sections.filter((section) => section.active)

  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.18em] text-white/38">
            Conditional Sections
          </div>
          <div className="mt-2 text-sm leading-6 text-white/48">
            Preview rules that reveal extra registration sections based on mode and session state.
          </div>
        </div>

        <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white/38">
          {activeSections.length} active
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {sections.map((section) => {
          const accentClass =
            section.accent === "amber"
              ? "border-amber-200/18 bg-amber-400/10 text-amber-50/68"
              : section.accent === "violet"
                ? "border-violet-200/18 bg-violet-400/10 text-violet-50/68"
                : "border-sky-200/18 bg-sky-400/10 text-sky-50/68"

          return (
            <div
              key={section.id}
              className={`rounded-2xl border p-4 transition ${
                section.active
                  ? `${accentClass} shadow-[0_18px_44px_rgba(0,0,0,0.16)]`
                  : "border-white/10 bg-white/[0.025] text-white/34 opacity-55"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-white/78">{section.title}</div>
                <div
                  className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] ${
                    section.active
                      ? "border-white/12 bg-white/[0.05] text-white/58"
                      : "border-white/10 bg-black/20 text-white/26"
                  }`}
                >
                  {section.active ? "Live" : "Hidden"}
                </div>
              </div>

              <div className="mt-2 text-xs leading-5 text-white/44">
                {section.body}
              </div>

              <div className="mt-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-[10px] font-black uppercase tracking-[0.13em] text-white/32">
                {section.conditionLabel}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function RegistrationBuilderSnapshotPanel({
  snapshot,
}: {
  snapshot: RegistrationBuilderSnapshot
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.18em] text-white/38">
            Builder Serialization Preview
          </div>
          <div className="mt-2 text-sm leading-6 text-white/48">
            This is the shape Jupiter can persist when the registration builder saves.
          </div>
        </div>

        <div className="rounded-full border border-emerald-200/14 bg-emerald-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-50/52">
          v{snapshot.version}
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/32">
            Fields
          </div>
          <div className="mt-1 text-sm font-semibold text-white/72">
            {snapshot.visibleFieldCount} visible / {snapshot.fieldCount} total
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/32">
            Required
          </div>
          <div className="mt-1 text-sm font-semibold text-white/72">
            {snapshot.requiredFieldCount} required
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/32">
            Active Rules
          </div>
          <div className="mt-1 text-sm font-semibold text-white/72">
            {snapshot.conditionalSections.filter((section) => section.active).length} active
          </div>
        </div>
      </div>

      <pre className="mt-4 max-h-64 overflow-auto rounded-2xl border border-white/10 bg-black/40 p-4 text-[11px] leading-5 text-sky-50/56">
        {JSON.stringify(snapshot, null, 2)}
      </pre>
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
  onSelectSession: (sessionId: RegistrationPreviewSession["id"]) => void
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
                    {session.capacityMode === "unlimited"
                      ? `${session.reserved} reserved · unlimited capacity`
                      : `${session.reserved} of ${session.capacity} seats reserved`}
                  </div>
                  <div className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-white/28">
                    {session.code} · {session.sessionKind.replace("_", " ")}
                  </div>
                  <div className="mt-2 text-xs leading-5 text-white/38">
                    {session.description}
                  </div>
                </div>

                <div
                  className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${
                    session.status === "closed"
                      ? "border-red-200/18 bg-red-400/10 text-red-100/70"
                      : isWaitlist
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
  const [selectedSessionId, setSelectedSessionId] = useState<RegistrationPreviewSession["id"]>("general")
  const [registrationMode, setRegistrationMode] = useState<RegistrationMode>("open")

  const steps = useMemo(() => ["Identity", "Sessions", "Review", "Confirmed"], [])
  const previewSessions = useMemo(() => createPreviewSessions(), [])
  const [registrationFields, setRegistrationFields] = useState(() => createRegistrationFields())
  const registrationModeMeta = useMemo(() => getRegistrationModeMeta(), [])

  const selectedSession =
    previewSessions.find((session) => session.id === selectedSessionId) ?? previewSessions[0]

  const conditionalSections = useMemo(
    () => createConditionalSections({ registrationMode, selectedSession }),
    [registrationMode, selectedSession]
  )

  const builderSnapshot = useMemo(
    () =>
      createBuilderSnapshot({
        fields: registrationFields,
        conditionalSections,
        sessions: previewSessions,
      }),
    [registrationFields, conditionalSections, previewSessions]
  )

  const registrationRuntime = useMemo(
    () =>
      createRegistrationRuntime({
        registrationMode,
        selectedSessionId,
        sessions: previewSessions,
      }),
    [registrationMode, selectedSessionId, previewSessions]
  )

  const isFirstStep = step === 0
  const isLastStep = step === steps.length - 1
  const currentModeMeta = registrationModeMeta[registrationMode]
  const attendeeDisplayName = `${registrationRuntime.attendee?.firstName ?? ""} ${
    registrationRuntime.attendee?.lastName ?? ""
  }`.trim()
  const selectedSessionLabel = selectedSession.title
  const selectedCapacityState =
    selectedSession.status === "waitlist"
      ? "Waitlist Requested"
      : selectedSession.status === "closed"
        ? "Registration Closed"
        : "Confirmed Seat"

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
        <RegistrationIdentityStep
          fields={registrationFields}
          setFields={setRegistrationFields}
        />
      ) : null}

      {step === 0 ? <RegistrationConditionalSections sections={conditionalSections} /> : null}

      {step === 0 ? <RegistrationBuilderSnapshotPanel snapshot={builderSnapshot} /> : null}

      {step === 1 ? (
        <RegistrationSessionSelector
          sessions={registrationRuntime.sessions}
          selectedSessionId={selectedSessionId}
          onSelectSession={setSelectedSessionId}
        />
      ) : null}

      {step === 1 ? <RegistrationConditionalSections sections={conditionalSections} /> : null}

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