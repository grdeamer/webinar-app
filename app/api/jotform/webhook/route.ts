import { timingSafeEqual } from "node:crypto"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { isEmail } from "@/lib/registration/schema"
import { NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type JotformWebhookBody = {
  submissionID?: string
  formID?: string
  rawRequest?: string
  pretty?: string
  [key: string]: unknown
}
type JupiterRegistrationPayload = {
  eventSlug: string
  email: string
  firstName: string | null
  lastName: string | null
  company: string | null
  role: "attendee" | "presenter"
  sessionIds: string[]
}
function parseRawRequest(rawRequest: unknown): Record<string, unknown> {
  if (typeof rawRequest !== "string" || !rawRequest.trim()) return {}

  try {
    const parsed = JSON.parse(rawRequest)
    return parsed && typeof parsed === "object" ? parsed : {}
  } catch {
    return {}
  }
}

function normalizeJotformSubmission(body: JotformWebhookBody) {
  const raw = parseRawRequest(body.rawRequest)

  return {
    submissionId: String(body.submissionID ?? raw.submissionID ?? ""),
    formId: String(body.formID ?? raw.formID ?? ""),
    raw,
    receivedAt: new Date().toISOString(),
  }
}
function getStringField(
  raw: Record<string, unknown>,
  keys: string[]
): string {
  for (const key of keys) {
    const value = raw[key]

    if (typeof value === "string" && value.trim()) {
      return value.trim()
    }

    if (
      value &&
      typeof value === "object" &&
      "answer" in value &&
      typeof value.answer === "string" &&
      value.answer.trim()
    ) {
      return value.answer.trim()
    }
  }

  return ""
}

function parseSessionIds(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
}

function normalizeJupiterRegistration(
  submission: ReturnType<typeof normalizeJotformSubmission>
): JupiterRegistrationPayload {
  const raw = submission.raw

  const role = getStringField(raw, ["role", "Role"]).toLowerCase()

  return {
    eventSlug: getStringField(raw, ["event_slug", "eventSlug", "Event Slug"]),
    email: getStringField(raw, ["email", "Email", "Email Address"]).toLowerCase(),
    firstName: getStringField(raw, ["first_name", "firstName", "First Name"]) || null,
    lastName: getStringField(raw, ["last_name", "lastName", "Last Name"]) || null,
    company: getStringField(raw, ["company", "Company"]) || null,
    role: role === "presenter" ? "presenter" : "attendee",
    sessionIds: parseSessionIds(
      getStringField(raw, ["session_ids", "sessionIds", "Session IDs"])
    ),
  }
}
export async function POST(req: Request): Promise<Response> {
  const url = new URL(req.url)
  const secret = url.searchParams.get("secret")

  if (!process.env.JOTFORM_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: "JOTFORM_WEBHOOK_SECRET is not configured" },
      { status: 500 }
    )
  }

  const supplied = Buffer.from(secret || ""), expected = Buffer.from(process.env.JOTFORM_WEBHOOK_SECRET)
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: JotformWebhookBody | null = null
  try {
    body = req.headers.get("content-type")?.includes("application/json") ? await req.json() : Object.fromEntries(await req.formData())
  } catch { body = null }
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
  }

  const submission = normalizeJotformSubmission(body)

const registration = normalizeJupiterRegistration(submission)

if (!registration.eventSlug || !registration.email) {
  return NextResponse.json(
    {
      error: "Missing required registration fields",
      required: ["event_slug", "email"],
      registration,
    },
    { status: 400 }
  )
}

if (!submission.submissionId || !submission.formId || !isEmail(registration.email)) return NextResponse.json({ error: "A submission ID, form ID, and valid email are required" }, { status: 400 })
const { data: event } = await supabaseAdmin.from("events").select("id").eq("slug", registration.eventSlug).maybeSingle()
if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 })
const { data, error } = await supabaseAdmin.rpc("save_jotform_registration", {
  p_submission_id: `${submission.formId}:${submission.submissionId}`, p_event_id: event.id,
  p_email: registration.email, p_first_name: registration.firstName, p_last_name: registration.lastName,
  p_answers: { organization: registration.company }, p_session_ids: registration.sessionIds,
  p_tag: registration.role === "presenter" ? "Presenter" : "Registrant",
})
if (error) return NextResponse.json({ error: "Unable to save submission; verify event and session mapping" }, { status: 400 })
return NextResponse.json({ ok: true, registrantId: data.id })
}
