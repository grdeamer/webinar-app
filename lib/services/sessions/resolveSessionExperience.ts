import type { ViewerContext } from "@/lib/domain/access"
import type { AppSession } from "@/lib/domain/sessions"
import {
  canViewerAccessSession,
} from "@/lib/domain/access"
import {
  getSessionCapability,
  getSessionPrimaryExperience,
  usesExternalJoin,
  usesLiveKit,
  hasPlayback,
} from "@/lib/domain/sessions"

export type ResolvedSessionExperience = {
  session: AppSession
  access: ReturnType<typeof canViewerAccessSession>
  runtime: {
    status: AppSession["runtimeStatus"]
  }
  capability: ReturnType<typeof getSessionCapability>
  primaryExperience: ReturnType<typeof getSessionPrimaryExperience>
  delivery:
    | {
        kind: "external"
        href: string | null
        platform: AppSession["externalPlatform"]
      }
    | {
        kind: "livekit"
        roomName: string | null
      }
    | {
        kind: "video"
        playbackType: AppSession["playbackType"]
        src: string | null
      }
    | {
        kind: "rtmp"
        src: string | null
      }
    | {
        kind: "details"
        src: null
      }
}

export function resolveSessionExperience(
  session: AppSession,
  viewer: ViewerContext
): ResolvedSessionExperience {
  const access = canViewerAccessSession(session, viewer)
  const capability = getSessionCapability(session)
  const primaryExperience = getSessionPrimaryExperience(session)

  if (usesExternalJoin(session)) {
    return {
      session,
      access,
      runtime: { status: session.runtimeStatus },
      capability,
      primaryExperience,
      delivery: {
        kind: "external",
        href: session.externalJoinUrl || session.joinLink || null,
        platform: session.externalPlatform,
      },
    }
  }

  if (usesLiveKit(session)) {
    return {
      session,
      access,
      runtime: { status: session.runtimeStatus },
      capability,
      primaryExperience,
      delivery: {
        kind: "livekit",
        roomName: session.liveRoomName,
      },
    }
  }

  if (hasPlayback(session) || session.deliveryMode === "video") {
    return {
      session,
      access,
      runtime: { status: session.runtimeStatus },
      capability,
      primaryExperience,
      delivery: {
        kind: "video",
        playbackType: session.playbackType,
        src: session.playbackM3u8Url || session.playbackMp4Url || null,
      },
    }
  }

  if (session.deliveryMode === "rtmp") {
    return {
      session,
      access,
      runtime: { status: session.runtimeStatus },
      capability,
      primaryExperience,
      delivery: {
        kind: "rtmp",
        src: null,
      },
    }
  }

  return {
    session,
    access,
    runtime: { status: session.runtimeStatus },
    capability,
    primaryExperience,
    delivery: {
      kind: "details",
      src: null,
    },
  }
}