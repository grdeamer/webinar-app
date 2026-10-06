import { NextResponse } from "next/server"
import { randomUUID, randomBytes } from "node:crypto"
import { requireAdmin } from "@/lib/requireAdmin"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { rows, seal } from "@/lib/zoom-bridge/server"
import { sourceRow, publicSource, SOURCE_TABLE } from "@/lib/zoom-bridge/source"
import { normalizeMeetingId, assertSourceIsSeparate } from "@/lib/zoom-bridge/types"
import { parseSourceProfile, defaultSourceProfile } from "@/lib/zoom-bridge/source-profile"
import { ingestInfo, privateIngestUrl } from "@/lib/zoom-bridge/ingest"
export const runtime = "nodejs"
export const dynamic = "force-dynamic"
async function authorized() { return (await requireAdmin()).profile.role === "admin" }
function error(message: string, status = 400) { return NextResponse.json({ error: message }, { status }) }
export async function GET() {
  if (!await authorized()) return error("Administrator access required", 403)
  try { const row = await sourceRow(); return NextResponse.json({ source: row ? publicSource(row) : null, ingest: ingestInfo(row) }, { headers: { "Cache-Control": "no-store" } }) }
  catch { return error("Unable to load program source", 503) }
}
export async function PUT(request: Request) {
  if (!await authorized()) return error("Administrator access required", 403)
  try {
    const body = await request.json(), old = await sourceRow()
    if (old?.source_kind === "srt") return error("This source uses HDMI / SRT. Zoom source editing is unavailable.")
    const meetingId = normalizeMeetingId(String(body.meetingId ?? ""))
    const passcode = typeof body.passcode === "string" ? body.passcode.trim() : ""
    if (passcode.length > 64 || /[\x00-\x1f]/.test(passcode)) return error("Invalid meeting passcode.")
    if (old?.desired_running && (meetingId !== old.meeting_id || passcode)) return error("Disconnect the source before changing its meeting or passcode.")
    if (!old && !passcode) return error("A meeting passcode is required.")
    assertSourceIsSeparate(meetingId, (await rows()).map(r => r.meeting_id))
    const { error: failure } = await supabaseAdmin.from(SOURCE_TABLE).upsert({ id: "program", source_kind: "zoom", meeting_id: meetingId, passcode_ciphertext: passcode ? seal(passcode) : old?.passcode_ciphertext, revision: randomUUID() })
    if (failure) throw new Error("Source could not be saved.")
    const saved = await sourceRow(); return NextResponse.json({ source: saved ? publicSource(saved) : null })
  } catch (cause) { return error(cause instanceof Error ? cause.message : "Invalid source.") }
}
export async function POST(request: Request) {
  if (!await authorized()) return error("Administrator access required", 403)
  try {
    const { action } = await request.json(), old = await sourceRow()
    if (action === "connection") {
      if (old?.source_kind !== "srt") return error("Select an HDMI / SRT source first.")
      if (old.ingest_key_revision && old.observed?.ingestKeyRevision !== old.ingest_key_revision) return error("Wait for the receiver to apply the new key before copying the connection.", 409)
      return NextResponse.json({ url: privateIngestUrl(old) }, { headers: { "Cache-Control": "no-store", "Pragma": "no-cache" } })
    }
    if (action === "regenerate_connection") {
      if (request.headers.get("origin") && request.headers.get("origin") !== new URL(request.url).origin) return error("Invalid request origin.", 403)
      if (old?.source_kind !== "srt") return error("An HDMI / SRT source is required.")
      let query = supabaseAdmin.from(SOURCE_TABLE).update({ ingest_passphrase_ciphertext: seal(randomBytes(24).toString("hex")), ingest_key_revision: randomUUID(), ingest_key_updated_at: new Date().toISOString() }).eq("id", "program")
      query = old.ingest_key_revision ? query.eq("ingest_key_revision", old.ingest_key_revision) : query.is("ingest_key_revision", null)
      const { data, error: failure } = await query.select("id").maybeSingle()
      if (failure || !data) return error("Connection changed or could not be regenerated. Refresh and retry.", 409)
      const saved = await sourceRow()
      return NextResponse.json({ source: saved ? publicSource(saved) : null, ingest: ingestInfo(saved) }, { headers: { "Cache-Control": "no-store", "Pragma": "no-cache" } })
    }
    if (!old) return error("Save a source meeting first.")
    if (action !== "start" && action !== "stop") return error("Invalid source command.")
    if (action === "start" && old.source_kind === "zoom") assertSourceIsSeparate(old.meeting_id, (await rows()).map(r => r.meeting_id))
    const { error: failure } = await supabaseAdmin.from(SOURCE_TABLE).update({ desired_running: action === "start", revision: randomUUID() }).eq("id", "program")
    if (failure) throw new Error("Source command could not be saved.")
    const saved = await sourceRow(); return NextResponse.json({ source: saved ? publicSource(saved) : null })
  } catch (cause) { return error(cause instanceof Error ? cause.message : "Invalid command.") }
}

export async function PATCH(request: Request) {
  if (!await authorized()) return error("Administrator access required", 403)
  try {
    const old = await sourceRow()
    if (!old || old.source_kind !== "srt") return error("An HDMI / SRT source is required.")
    const body = await request.json()
    const profile = parseSourceProfile(body.profile)
    const previous = { ...defaultSourceProfile, ...old.source_profile }
    const qualityChanged = profile.relayResolution !== previous.relayResolution
    if (qualityChanged && old.desired_running) return error("Stop receiving before changing relay resolution.")
    const { error: failure } = await supabaseAdmin.from(SOURCE_TABLE).update({ source_profile: profile, ...(qualityChanged ? { revision: randomUUID() } : {}) }).eq("id", "program")
    if (failure) throw new Error("Source profile could not be saved.")
    const saved = await sourceRow()
    return NextResponse.json({ source: saved ? publicSource(saved) : null }, { headers: { "Cache-Control": "no-store" } })
  } catch (cause) { return error(cause instanceof Error ? cause.message : "Invalid source profile.") }
}
