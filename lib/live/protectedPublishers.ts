import { getLiveKitRoomService } from "@/lib/live/livekit/server"

// Refuse new audience joins while older, unrestricted publishers are connected.
// The version is signed into publisher join tokens by Jupiter, not set by viewers.
export async function roomPublishersAreProtected(room: string): Promise<boolean> {
  try {
    const participants = await getLiveKitRoomService().listParticipants(room)
    return participants.every(participant => {
      if (!participant.permission?.canPublish) return true
      try { return JSON.parse(participant.metadata || "{}").publisherPolicyVersion === 1 }
      catch { return false }
    })
  } catch (error) {
    const failure = error as { status?: number; code?: string }
    if (failure.status === 404 || failure.code === "not_found") return true
    throw error
  }
}
