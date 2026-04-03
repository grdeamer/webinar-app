import "server-only"

import { AccessToken } from "livekit-server-sdk"
import {
  getLiveKitApiKey,
  getLiveKitApiSecret,
} from "@/lib/live/config"
import type {
  LiveJoinTokenResponse,
  LiveParticipantRole,
} from "@/lib/types"

function canPublish(role: LiveParticipantRole) {
  return role === "producer" || role === "host" || role === "speaker" || role === "guest"
}

function canSubscribe(role: LiveParticipantRole) {
  return role === "producer" || role === "host" || role === "speaker" || role === "guest"
}

function canPublishData(role: LiveParticipantRole) {
  return role === "producer" || role === "host"
}

export async function createLiveKitToken(args: {
  roomName: string
  identity: string
  name: string
  role: LiveParticipantRole
  metadata?: Record<string, unknown>
}): Promise<LiveJoinTokenResponse> {
  const at = new AccessToken(getLiveKitApiKey(), getLiveKitApiSecret(), {
    identity: args.identity,
    name: args.name,
    metadata: JSON.stringify({
      role: args.role,
      ...(args.metadata || {}),
    }),
    ttl: "6h",
  })

  at.addGrant({
    roomJoin: true,
    room: args.roomName,
    canPublish: canPublish(args.role),
    canSubscribe: canSubscribe(args.role),
    canPublishData: canPublishData(args.role),
  })

  const token = await at.toJwt()

  return {
    provider: "livekit",
    roomName: args.roomName,
    participantName: args.name,
    participantIdentity: args.identity,
    token,
  }
}