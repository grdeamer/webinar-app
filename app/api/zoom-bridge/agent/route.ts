import { NextResponse } from "next/server"
import { agentAuthorized, rows, unseal, TABLE } from "@/lib/zoom-bridge/server"
import { defaultSourceProfile } from "@/lib/zoom-bridge/source-profile"
import { sourceRow, SOURCE_TABLE } from "@/lib/zoom-bridge/source"
import { supabaseAdmin } from "@/lib/supabase/admin"
export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export async function POST(request: Request) {
  if (!agentAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  try {
    const body = await request.json()
    if (!Array.isArray(body.reports) || body.reports.length > 21) throw new Error("Invalid reports")
    const all = await rows()
    for (const report of body.reports) {
      if (!all.some(r => r.id === report.id)) continue
      const statuses = ["starting", "joined", "waiting", "waiting for host", "stopped", "failed", "capacity", "reconnecting"]
      if (!statuses.includes(report.status)) continue
      const observed = { publishMode: report.publishMode === "share" ? "share" : "camera", originalSound: report.originalSound === true, videoResolution: /^\d{2,4}x\d{2,4}$/.test(String(report.videoResolution)) ? report.videoResolution : "", status: report.status, camera: report.camera === true, microphone: report.microphone === true, sourceVideo: report.sourceVideo === true, sourceAudio: report.sourceAudio === true, name: String(report.name ?? "").slice(0, 64), revision: String(report.revision ?? "").slice(0, 64), error: String(report.error ?? "").replace(/[^a-zA-Z0-9 .:_-]/g, "").slice(0, 160) }
      const { error } = await supabaseAdmin.from(TABLE).update({ observed, last_seen: new Date().toISOString() }).eq("id", report.id)
      if (error) throw error
    }
    const source = await sourceRow()
    if (source && body.sourceReport && typeof body.sourceReport === "object") {
      const report = body.sourceReport
      const statuses = ["starting", "joined", "waiting", "waiting for host", "stopped", "failed", "reconnecting", "permission required", "waiting for spotlight", "presenter camera off", "receiving"]
      if (statuses.includes(report.status)) {
        const observed = { ingestKeyRevision: typeof report.ingestKeyRevision === "string" && /^(legacy|[0-9a-f-]{36})$/.test(report.ingestKeyRevision) ? report.ingestKeyRevision : "legacy", kind: report.kind === "srt" ? "srt" : "zoom", inputResolutions: String(report.inputResolutions ?? "").replace(/[^0-9x, ]/g, "").slice(0, 128), status: report.status, presenter: String(report.presenter ?? "").slice(0, 64), spotlightCount: Math.max(0, Math.min(9, Number(report.spotlightCount) || 0)), video: report.video === true, audio: report.audio === true, revision: String(report.revision ?? "").slice(0, 64), error: String(report.error ?? "").replace(/[^a-zA-Z0-9 .:_-]/g, "").slice(0, 160), videoFrames: Math.max(0, Number(report.videoFrames) || 0), audioBlocks: Math.max(0, Number(report.audioBlocks) || 0) }
        const { error } = await supabaseAdmin.from(SOURCE_TABLE).update({ observed, last_seen: new Date().toISOString() }).eq("id", "program")
        if (error) throw error
      }
    }
    return NextResponse.json({ source: source ? { id: "program", ingestKey: source.source_kind === "srt" && source.ingest_passphrase_ciphertext ? { revision: source.ingest_key_revision, passphrase: unseal(source.ingest_passphrase_ciphertext) } : null, profile: { ...defaultSourceProfile, ...source.source_profile }, kind: source.source_kind, name: "Jupiter Io Source", meetingId: source.meeting_id, passcode: unseal(source.passcode_ciphertext), running: source.desired_running, revision: source.revision } : null, rooms: all.map(r => ({ id: r.id, name: r.worker_name, meetingId: r.meeting_id, passcode: unseal(r.passcode_ciphertext), running: r.desired_running, originalSound: r.desired_original_sound, previewUntil: r.preview_until ?? null, publishMode: r.publish_mode, camera: r.desired_camera, microphone: r.desired_microphone, revision: r.revision })) }, { headers: { "Cache-Control": "no-store" } })
  } catch { return NextResponse.json({ error: "Controller exchange failed" }, { status: 503 }) }
}
