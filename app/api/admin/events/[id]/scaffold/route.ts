import { NextResponse } from "next/server"
import { scaffoldEventContent } from "@/lib/eventScaffold"
import { requireAdmin } from "@/lib/requireAdmin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function json(data: any, status = 200) {
  return NextResponse.json(data, { status })
}

type EventTemplate = "blank" | "webinar" | "pharma" | "conference"

function normalizeTemplate(value: unknown): EventTemplate {
  const v = String(value || "").toLowerCase().trim()

  if (v === "blank") return "blank"
  if (v === "pharma") return "pharma"
  if (v === "conference") return "conference"
  return "webinar"
}

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const authResult = await requireAdmin()
  if (authResult instanceof Response) return authResult

  try {
    const { id } = await props.params
    const body = await req.json().catch(() => ({}))
    const template = normalizeTemplate(body?.template)

    const summary = await scaffoldEventContent(id, template)

    return json({ ok: true, template, summary })
  } catch (error: any) {
    return json({ error: error?.message || "Failed to scaffold event" }, 400)
  }
}