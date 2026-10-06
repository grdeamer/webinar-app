import { NextResponse } from "next/server"
import { randomUUID } from "node:crypto"
import { requireAdmin } from "@/lib/requireAdmin"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { rows, publicRoom, seal, TABLE } from "@/lib/zoom-bridge/server"
import { sourceRow } from "@/lib/zoom-bridge/source"
import { normalizeMeetingId, assertSourceIsSeparate, actionPatch, parsePublishMode, type ZoomAction } from "@/lib/zoom-bridge/types"
export const runtime = "nodejs"
export const dynamic = "force-dynamic"
async function authorized() { return (await requireAdmin()).profile.role === "admin" }
function error(message: string, status = 400) { return NextResponse.json({ error: message }, { status }) }
export async function GET() {
  if (!await authorized()) return error("Administrator access required", 403)
  try { return NextResponse.json({ rooms: (await rows()).map(publicRoom) }, { headers: { "Cache-Control": "no-store" } }) }
  catch { return error("Unable to load Zoom Bridge profiles", 503) }
}
export async function PUT(request: Request) {
  if (!await authorized()) return error("Administrator access required", 403)
  try {
    const body = await request.json()
    const all = await rows()
    const old = typeof body.id === "string" ? all.find(r => r.id === body.id) : undefined
    if (body.id && !old) return error("Profile not found", 404)
    if (!old && all.length >= 21) return error("A maximum of 21 profiles is supported.")
    const name = typeof body.name === "string" ? body.name.trim() : ""
    if (!name || name.length > 64 || /[\r\n\x00-\x1f]/.test(name)) return error("Satellite name must be 1–64 characters.")
    const meetingId = normalizeMeetingId(String(body.meetingId ?? ""))
    const source = await sourceRow()
    if (source?.source_kind === "zoom") assertSourceIsSeparate(source.meeting_id, [meetingId])
    const publishMode = parsePublishMode(body.publishMode ?? old?.publish_mode ?? "share")
    if (old?.desired_running && publishMode !== old.publish_mode) return error("Disconnect the satellite before changing its output mode.")
    if (old?.desired_running && old.meeting_id !== meetingId) return error("Stop the satellite before changing its meeting.")
    const passcode = typeof body.passcode === "string" ? body.passcode.trim() : ""
    if (passcode.length > 64 || /[\r\n]/.test(passcode)) return error("Invalid meeting passcode.")
    if (old?.desired_running && passcode) return error("Stop the satellite before changing its passcode.")
    if (!old && !passcode) return error("A meeting passcode is required.")
    const record = { id: old?.id ?? randomUUID(), worker_name: name, meeting_id: meetingId, publish_mode: publishMode, passcode_ciphertext: passcode ? seal(passcode) : old?.passcode_ciphertext, revision: randomUUID() }
    const { error: failure } = await supabaseAdmin.from(TABLE).upsert(record)
    if (failure) throw new Error("Profile could not be saved.")
    return NextResponse.json({ rooms: (await rows()).map(publicRoom) })
  } catch (cause) { return error(cause instanceof Error ? cause.message : "Invalid profile.") }
}
export async function POST(request: Request) {
  if (!await authorized()) return error("Administrator access required", 403)
  try {
    const body = await request.json()
    const patch = actionPatch(body.action as ZoomAction)
    if (body.id !== "all" && (typeof body.id !== "string" || !/^[0-9a-f-]{36}$/.test(body.id))) return error("Invalid room.")
    if (body.action === "start") {
      const source = await sourceRow()
      if (source?.source_kind === "zoom") assertSourceIsSeparate(source.meeting_id, (await rows()).filter(r => body.id === "all" || r.id === body.id).map(r => r.meeting_id))
    }
    let query = supabaseAdmin.from(TABLE).update({ ...patch, revision: randomUUID() })
    query = body.id === "all" ? query.not("id", "is", null) : query.eq("id", body.id)
    const { error: failure } = await query
    if (failure) throw new Error("Command could not be saved.")
    return NextResponse.json({ rooms: (await rows()).map(publicRoom) })
  } catch (cause) { return error(cause instanceof Error ? cause.message : "Invalid command.") }
}
export async function DELETE(request: Request) {
  if (!await authorized()) return error("Administrator access required", 403)
  const { id } = await request.json()
  const old = (await rows()).find(r => r.id === id)
  if (!old) return error("Profile not found", 404)
  if (old.desired_running || (old.observed.status && !["stopped", "failed", "capacity"].includes(old.observed.status))) return error("Stop the satellite and wait for it to disconnect before deleting.")
  const { error: failure } = await supabaseAdmin.from(TABLE).delete().eq("id", id)
  if (failure) return error("Profile could not be deleted.", 500)
  return NextResponse.json({ rooms: (await rows()).map(publicRoom) })
}
