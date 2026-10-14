export type RegistrationField = { id: string; label: string; placeholder?: string; fieldType: string; required: boolean; visible: boolean; width: "half" | "full"; locked?: boolean }
export type RegistrationConfig = {
  enabled: boolean; variant: "editorial" | "minimal"; mode: "open" | "approval_required" | "invite_only" | "closed";
  title: string; body: string; ctaLabel: string; confirmationTitle: string; confirmationBody: string;
  fields: RegistrationField[]; capacity: number | null; allowWaitlist: boolean;
  sessions: { id: string; title?: string; capacity: number | null; allowWaitlist: boolean }[];
}
export const DEFAULT_FIELDS: RegistrationField[] = [
  { id: "firstName", label: "First name", fieldType: "text", required: true, visible: true, width: "half", locked: true },
  { id: "lastName", label: "Last name", fieldType: "text", required: true, visible: true, width: "half", locked: true },
  { id: "email", label: "Email address", fieldType: "email", required: true, visible: true, width: "full", locked: true },
  { id: "organization", label: "Organization", fieldType: "text", required: false, visible: true, width: "full" },
]
export function record(value: unknown): Record<string, unknown> { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {} }
function text(value: unknown, fallback: string, max = 1000) { return typeof value === "string" ? value.trim().slice(0, max) : fallback }
function capacity(value: unknown): number | null { const n = Number(value); return Number.isSafeInteger(n) && n > 0 && n <= 1000000 ? n : null }
export function normalizeRegistrationConfig(props: unknown, enabled = true): RegistrationConfig {
  const p = record(props); const settings = record(p.registrationSettings)
  const fields = Array.isArray(p.registrationFields) && p.registrationFields.length ? p.registrationFields : DEFAULT_FIELDS
  const seen = new Set<string>()
  const normalized: RegistrationField[] = fields.slice(0, 30).flatMap((input) => {
    const f = record(input); const id = text(f.id, "", 50)
    if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(id) || seen.has(id)) return []
    seen.add(id)
    const locked = ["firstName", "lastName", "email"].includes(id)
    return [{ id, label: text(f.label, id, 100), placeholder: text(f.placeholder, "", 150), fieldType: id === "email" ? "email" : ["textarea", "tel", "email"].includes(String(f.fieldType)) ? String(f.fieldType) : "text", required: locked || f.required === true, visible: locked || f.visible !== false, width: f.width === "half" ? "half" as const : "full" as const, locked }]
  })
  for (const f of DEFAULT_FIELDS.slice(0, 3)) if (!seen.has(f.id)) normalized.push(f)
  return {
    enabled, variant: p.variant === "minimal" ? "minimal" : "editorial", mode: ["open", "approval_required", "invite_only", "closed"].includes(String(settings.mode)) ? settings.mode as RegistrationConfig["mode"] : "open",
    title: text(p.title, "Reserve your place", 200), body: text(p.body, "Register for this event."),
    ctaLabel: text(p.ctaLabel, "Register", 80), confirmationTitle: text(p.confirmationTitle, "Registration received", 200), confirmationBody: text(p.confirmationBody, "Your registration has been saved."),
    fields: normalized, capacity: capacity(settings.capacity), allowWaitlist: settings.allowWaitlist === true,
    sessions: Array.isArray(settings.sessions) ? settings.sessions.slice(0, 200).map((input) => { const s = record(input); return { id: text(s.id, "", 50), title: text(s.title, "Session", 200), capacity: capacity(s.capacity), allowWaitlist: s.allowWaitlist === true } }).filter((s) => /^[0-9a-f-]{36}$/i.test(s.id)) : [],
  }
}
export function findRegistrationProps(sections: unknown): Record<string, unknown> | null {
  if (!Array.isArray(sections)) return null
  for (const section of sections) { const blocks = record(section).blocks; if (!Array.isArray(blocks)) continue; for (const block of blocks) { const b = record(block), p = record(b.props); if (b.type === "system_component" && p.componentKey === "registration_form") return p } }
  return null
}
export function validateRegistration(config: RegistrationConfig, input: unknown) {
  const body = record(input), values = record(body.values), answers: Record<string, string> = {}
  for (const f of config.fields.filter((f) => f.visible)) {
    const raw = values[f.id]; if (raw != null && typeof raw !== "string") throw new Error(`Invalid ${f.label}`)
    const value = String(raw ?? "").trim()
    if (value.length > (f.fieldType === "textarea" ? 2000 : 320)) throw new Error(`${f.label} is too long`)
    if (f.required && !value) throw new Error(`${f.label} is required`)
    if ((f.fieldType === "email" || f.id === "email") && value && !isEmail(value)) throw new Error(`Enter a valid ${f.label}`)
    answers[f.id] = value
  }
  answers.email = answers.email.toLowerCase()
  const sessionIds = Array.isArray(body.sessionIds) ? [...new Set(body.sessionIds.map(String))] : []
  if (sessionIds.some((id) => !config.sessions.some((s) => s.id === id))) throw new Error("Select only sessions offered by this registration form")
  return { email: answers.email, firstName: answers.firstName, lastName: answers.lastName, answers, sessionIds }
}
export function isEmail(value: string) { return value.length <= 320 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) }
