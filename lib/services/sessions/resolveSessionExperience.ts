import type { ViewerContext } from "@/lib/domain/access"
import type { AppSession } from "@/lib/domain/sessions"
import { canViewerAccessSession } from "@/lib/domain/access"

export type ResolvedSessionExperience = {
  session: AppSession
  access: ReturnType<typeof canViewerAccessSession>
  runtime: {
    status: AppSession["runtimeStatus"]
  }
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
}

export function resolveSessionExperience(
  session: AppSession,
  viewer: ViewerContext
): ResolvedSessionExperience {
  const access = canViewerAccessSession(session, viewer)

  if (session.deliveryMode === "external") {
    return {
      session,
      access,
      runtime: { status: session.runtimeStatus },
      delivery: {
        kind: "external",
        href: session.externalJoinUrl || session.joinLink || null,
        platform: session.externalPlatform,
      },
    }
  }

  if (session.deliveryMode === "livekit") {
    return {
      session,
      access,
      runtime: { status: session.runtimeStatus },
      delivery: {
        kind: "livekit",
        roomName: session.liveRoomName,
      },
    }
  }

  if (session.deliveryMode === "video") {
    return {
      session,
      access,
      runtime: { status: session.runtimeStatus },
      delivery: {
        kind: "video",
        playbackType: session.playbackType,
        src: session.playbackM3u8Url || session.playbackMp4Url || null,
      },
    }
  }

  return {
    session,
    access,
    runtime: { status: session.runtimeStatus },
    delivery: {
      kind: "rtmp",
      src: null,
    },
  }
}