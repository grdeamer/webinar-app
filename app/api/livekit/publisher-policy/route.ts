import { NextResponse } from "next/server"
import { TokenVerifier, TrackSource, TrackType } from "livekit-server-sdk"
import { getLiveKitApiKey, getLiveKitApiSecret, buildEventRoomName } from "@/lib/live/config"
import { getLiveKitRoomService } from "@/lib/live/livekit/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { getSessionById } from "@/lib/repos/sessionsRepo"
import { getStageState } from "@/lib/app/sessionStageState"
import { publisherTrackPermissions, type PublisherTrack } from "@/lib/live/publisherPolicy"
import { createPublisherPolicyToken, verifyPublisherPolicyToken, type PublisherPolicyIdentity } from "@/lib/live/publisherPolicyToken"
import type { ProgramAudioState } from "@/lib/live/programAudio"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } })
}

async function authenticate(token: string): Promise<PublisherPolicyIdentity | null> {
  const policy = verifyPublisherPolicyToken(token)
  if (policy) return policy
  try {
    const claims = await new TokenVerifier(getLiveKitApiKey(), getLiveKitApiSecret()).verify(token, 0)
    if (!claims.video?.roomJoin || !claims.video.canPublish || !claims.video.room || !claims.sub) return null
    const metadata = JSON.parse(claims.metadata || "{}") as Record<string, unknown>
    if (typeof metadata.eventId !== "string") return null
    return { eventId: metadata.eventId, sessionId: typeof metadata.sessionId === "string" ? metadata.sessionId : null,
      room: claims.video.room, identity: claims.sub, startedAt: Date.now() }
  } catch { return null }
}

export async function POST(request: Request) {
  const bearer = request.headers.get("authorization")?.match(/^Bearer (\S+)$/i)?.[1]
  const identity = bearer && bearer.length < 16384 ? await authenticate(bearer) : null
  if (!identity) return json({ error: "Publisher authorization required" }, 401)

  try {
    let program: ProgramAudioState | null
    if (identity.room === buildEventRoomName(identity.eventId)) {
      const { data, error } = await supabaseAdmin.from("event_live_program_state")
        .select("is_live,layout,stage_participant_ids,primary_participant_id,pinned_participant_id,screen_share_participant_id,program_blocks")
        .eq("event_id", identity.eventId).maybeSingle()
      if (error) throw new Error("Unable to load Program")
      program = data
    } else {
      const session = identity.sessionId ? await getSessionById(identity.eventId, identity.sessionId) : null
      const room = session?.liveRoomName?.trim() || (session ? `event-${identity.eventId}-session-${session.id}` : null)
      if (!session || room !== identity.room || session.deliveryMode !== "livekit") return json({ error: "Publisher room mismatch" }, 403)
      const state = await getStageState(session.id)
      program = { is_live: true, layout: state.program_layout, stage_participant_ids: state.program_stage_participant_ids,
        primary_participant_id: state.program_primary_participant_id,
        // Session layouts identify screen sharing by Program participants.
        screen_share_participant_id: null as string | null }
    }

    const participants = await getLiveKitRoomService().listParticipants(identity.room)
    const publisher = participants.find(participant => participant.identity === identity.identity)
    if (!publisher?.permission?.canPublish) return json({ error: "Publisher is not connected or authorized" }, 403)
    if (program?.layout === "screen_speaker" && !program.screen_share_participant_id) {
      program.screen_share_participant_id = participants.find(participant =>
        program?.stage_participant_ids?.includes(participant.identity) &&
        participant.tracks.some(track => track.source === TrackSource.SCREEN_SHARE))?.identity ?? null
    }
    const sources: Partial<Record<TrackSource, string>> = {
      [TrackSource.CAMERA]: "camera", [TrackSource.MICROPHONE]: "microphone",
      [TrackSource.SCREEN_SHARE]: "screen_share", [TrackSource.SCREEN_SHARE_AUDIO]: "screen_share_audio",
    }
    const tracks: PublisherTrack[] = publisher.tracks.map(track => ({ sid: track.sid,
      source: sources[track.source] || "unknown", kind: track.type === TrackType.AUDIO ? "audio" : "video" }))
    const permissions = publisherTrackPermissions(identity.identity, tracks,
      participants.map(participant => ({ identity: participant.identity, canPublish: participant.permission?.canPublish === true })), program)
    return json({ permissions, policyToken: createPublisherPolicyToken(identity) })
  } catch {
    return json({ error: "Publisher protection is unavailable" }, 503)
  }
}
