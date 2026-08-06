import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/requireAdmin"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function json(data: unknown, status = 200): Response {
  return NextResponse.json(data, { status })
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function normalizeSurveyUrl(value: unknown): string | null {
  if (value == null || String(value).trim() === "") return null
  try {
    const url = new URL(String(value).trim())
    return url.protocol === "https:" ? url.toString().slice(0, 2000) : null
  } catch {
    return null
  }
}

export async function POST(req: Request): Promise<Response> {
  await requireAdmin()

  const body = await req.json().catch((): null => null)
  if (!isUuid(body?.event_id)) return json({ error: "A valid event_id is required" }, 400)

  const surveyUrl = normalizeSurveyUrl(body?.survey_url)
  const showSurvey = Boolean(body?.show_survey)
  if (showSurvey && !surveyUrl) {
    return json({ error: "Enter a valid HTTPS survey URL before showing the survey" }, 400)
  }

  const syncToken = new Date().toISOString()
  const patch = {
    survey_url: surveyUrl,
    show_survey: showSurvey,
    updated_at: syncToken,
  }

  const { data, error } = await supabaseAdmin
    .from("event_live_state")
    .update(patch)
    .eq("event_id", body.event_id)
    .select("survey_url,show_survey,updated_at")
    .maybeSingle()

  if (error) return json({ error: error.message }, 400)

  if (data) {
    return json({ ok: true, ...data, sync_token: data.updated_at })
  }

  const { data: initialized, error: initializeError } = await supabaseAdmin
    .from("event_live_state")
    .insert({
      event_id: body.event_id,
      mode: "lobby",
      status: "closed",
      force_redirect: false,
      ...patch,
    })
    .select("survey_url,show_survey,updated_at")
    .single()

  if (initializeError) return json({ error: initializeError.message }, 400)
  return json({ ok: true, ...initialized, sync_token: initialized.updated_at })
}
