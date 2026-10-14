import { requireEventOperatorAccess } from "@/lib/eventTeamAccess"
import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/requireAdmin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(
  _req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdmin()
  if (authResult instanceof Response) return authResult

  const { id } = await props.params

  const { data, error } = await supabaseAdmin
    .from("import_jobs")
    .select("*")
    .eq("id", id)
    .single()

  if (data?.event_id) {
    const access = await requireEventOperatorAccess(data.event_id, ["event_admin", "producer"], "people")
    if (access instanceof Response) return access
  } else if (authResult.profile.role !== "admin") return NextResponse.json({ error: "Import access denied" }, { status: 403 })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  const body = JSON.stringify(data, null, 2)

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="import-job-${id}.json"`,
    },
  })
}