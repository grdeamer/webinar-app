import { NextResponse } from "next/server"
import {
  EgressClient,
  EncodedFileOutput,
  EncodedFileType,
} from "livekit-server-sdk"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

type StartRecordingRequest = {
  roomName?: string
  layout?: string
  source?: string
  destination?: string
  quality?: string
  audioOnly?: boolean
  videoOnly?: boolean
  dryRun?: boolean
}

function requiredEnv(name: string, fallbackName?: string): string {
  const value = process.env[name] ?? (fallbackName ? process.env[fallbackName] : undefined)

  if (!value) {
    throw new Error(
      fallbackName
        ? `Missing env: ${name} or ${fallbackName}`
        : `Missing env: ${name}`
    )
  }

  return value
}

function normalizeRoomName(value: unknown): string | null {
  if (typeof value !== "string") return null

  const trimmed = value.trim()
  return trimmed.length ? trimmed : null
}

function qualityToLayout(quality: string | undefined): string {
  if (quality === "720p Draft") return "speaker-light"
  return "speaker-dark"
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return "Unknown recording start error"
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as StartRecordingRequest
    const roomName = normalizeRoomName(body.roomName)

    if (!roomName) {
      return NextResponse.json(
        { ok: false, error: "roomName is required" },
        { status: 400 }
      )
    }

    const livekitUrl = requiredEnv("LIVEKIT_URL", "NEXT_PUBLIC_LIVEKIT_URL")
    const apiKey = requiredEnv("LIVEKIT_API_KEY")
    const apiSecret = requiredEnv("LIVEKIT_API_SECRET")

    const egressClient = new EgressClient(livekitUrl, apiKey, apiSecret)
    const activeEgresses = await egressClient.listEgress({
      roomName,
      active: true,
    })

    if (activeEgresses.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "Recording already active for this room",
          egressId: activeEgresses[0]?.egressId ?? null,
        },
        { status: 409 }
      )
    }

    const layout = body.layout ?? qualityToLayout(body.quality)
    const filepath = `jupiter-recordings/{room_name}/{time}-{room_id}`

    if (body.dryRun) {
      return NextResponse.json({
        ok: true,
        dryRun: true,
        roomName,
        layout,
        filepath,
        source: body.source ?? "Program Feed",
        destination: body.destination ?? "Jupiter Cloud",
        quality: body.quality ?? "1080p Standard",
      })
    }

    const fileOutput = new EncodedFileOutput({
      fileType: EncodedFileType.MP4,
      filepath,
      disableManifest: true,
    })

    const egressInfo = await egressClient.startRoomCompositeEgress(
      roomName,
      { file: fileOutput },
      {
        layout,
        audioOnly: body.audioOnly ?? false,
        videoOnly: body.videoOnly ?? false,
      }
    )

    return NextResponse.json({
      ok: true,
      roomName,
      egressId: egressInfo.egressId,
      status: egressInfo.status,
      startedAt: egressInfo.startedAt?.toString() ?? null,
      file: egressInfo.fileResults?.[0]?.filename ?? null,
      source: body.source ?? "Program Feed",
      destination: body.destination ?? "Jupiter Cloud",
      quality: body.quality ?? "1080p Standard",
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: errorMessage(error),
      },
      { status: 500 }
    )
  }
}