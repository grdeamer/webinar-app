export type RegistrationMode =
  | "open"
  | "approval_required"
  | "invite_only"
  | "closed"

export type RegistrationStatus =
  | "not_registered"
  | "pending_approval"
  | "approved"
  | "waitlisted"
  | "registered"
  | "checked_in"
  | "cancelled"
  | "declined"

export type WaitlistStatus =
  | "none"
  | "active"
  | "promoted"
  | "expired"

export type ApprovalStatus =
  | "not_required"
  | "pending"
  | "approved"
  | "denied"

export interface RegistrationCapacity {
  enabled: boolean
  maxAttendees?: number | null
  currentRegistered?: number
  currentWaitlisted?: number
  allowWaitlist?: boolean
}

export interface RegistrationAccessSettings {
  mode: RegistrationMode
  requiresInviteToken?: boolean
  requiresApproval?: boolean
  registrationStartAt?: string | null
  registrationEndAt?: string | null
}

export interface InviteTokenRecord {
  id: string
  token: string
  email?: string | null
  maxUses?: number | null
  currentUses?: number
  expiresAt?: string | null
  createdAt?: string
}

export interface SessionReservationRecord {
  sessionId: string
  sessionTitle?: string
  reservedAt: string
  releasedAt?: string | null
}

export interface RegistrationRecord {
  id: string
  attendeeId?: string | null

  firstName?: string | null
  lastName?: string | null
  email: string

  registrationStatus: RegistrationStatus
  approvalStatus: ApprovalStatus
  waitlistStatus: WaitlistStatus

  registeredAt?: string | null
  approvedAt?: string | null
  cancelledAt?: string | null
  checkedInAt?: string | null

  inviteTokenId?: string | null

  notes?: string | null

  sessionReservations?: SessionReservationRecord[]
}

export interface RegistrationExperienceState {
  access: RegistrationAccessSettings
  capacity: RegistrationCapacity

  registrationOpen: boolean
  registrationClosedReason?: string | null

  attendee?: RegistrationRecord | null
}