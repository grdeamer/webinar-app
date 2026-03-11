import { NextResponse } from "next/server"
import { scaffoldEventContent } from "@/lib/eventScaffold"
import { requireAdmin } from "@/lib/requireAdmin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function json(data: any, status = 200) {
  return NextResponse.json(data, { status })
}

export async function POST(_: Request, props: { params: Promise<{ id: string }> }) {
  const authResult = await requireAdmin()
  if (authResult instanceof Response) return authResult

  try {
    const { id } = await props.params
    const summary = await scaffoldEventContent(id)
    return json({ ok: true, summary })
  } catch (error: any) {
    return json({ error: error?.message || "Failed to scaffold event" }, 400)
  }
}