import { NextResponse } from "next/server"
import { scaffoldEventContent } from "@/lib/eventScaffold"
import { requireAdmin } from "@/lib/requireAdmin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(_: Request, props: { params: Promise<{ id: string }> }) {

  const unauthorized = await requireAdmin()
  if (unauthorized) return unauthorized
  try {
    const { id } = await props.params
    const summary = await scaffoldEventContent(id)
    return NextResponse.json({ ok: true, summary })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to scaffold event" }, { status: 400 })
  }
}
