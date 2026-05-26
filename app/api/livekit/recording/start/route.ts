import { NextResponse } from "next/server"
import {
  EgressClient,
  EncodedFileOutput,
  EncodedFileType,
  S3Upload,
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

    console.log("[recording.start] request", {
      roomName,
      source: body.source,
      destination: body.destination,
      quality: body.quality,
    })

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
    const filepath = `jupiter-recordings/{room_name}/{time}-{room_id}.mp4`

    const hasS3Output = Boolean(
      process.env.LIVEKIT_EGRESS_S3_BUCKET &&
        process.env.LIVEKIT_EGRESS_S3_REGION &&
        process.env.LIVEKIT_EGRESS_S3_ACCESS_KEY &&
        process.env.LIVEKIT_EGRESS_S3_SECRET
    )
    const s3Endpoint = process.env.LIVEKIT_EGRESS_S3_ENDPOINT?.trim() || undefined


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

    if (!hasS3Output) {
      return NextResponse.json(
        {
          ok: false,
          error: "LiveKit egress storage output is not configured. Add LIVEKIT_EGRESS_S3_BUCKET, LIVEKIT_EGRESS_S3_REGION, LIVEKIT_EGRESS_S3_ACCESS_KEY, and LIVEKIT_EGRESS_S3_SECRET before starting real recordings.",
          roomName,
          layout,
          filepath,
        },
        { status: 400 }
      )
    }

    console.log("[recording.start] s3 output", {
      bucket: process.env.LIVEKIT_EGRESS_S3_BUCKET,
      region: process.env.LIVEKIT_EGRESS_S3_REGION,
      endpoint: s3Endpoint ?? null,
      filepath,
    })
    const s3Upload = new S3Upload({
      accessKey: requiredEnv("LIVEKIT_EGRESS_S3_ACCESS_KEY"),
      secret: requiredEnv("LIVEKIT_EGRESS_S3_SECRET"),
      bucket: requiredEnv("LIVEKIT_EGRESS_S3_BUCKET"),
      region: requiredEnv("LIVEKIT_EGRESS_S3_REGION"),
      endpoint: s3Endpoint,
    })

    const fileOutput = new EncodedFileOutput({
      fileType: EncodedFileType.MP4,
      filepath,
      disableManifest: true,
      output: {
        case: "s3",
        value: s3Upload,
      },
    })

    const egressInfo = await egressClient.startRoomCompositeEgress(
      roomName,
      fileOutput,
      {
        layout,
        audioOnly: body.audioOnly ?? false,
        videoOnly: body.videoOnly ?? false,
      }
    )

    console.log("[recording.start] egress created", {
      egressId: egressInfo.egressId,
      status: egressInfo.status,
      roomName,
      fileResults: egressInfo.fileResults,
      streamResults: egressInfo.streamResults,
      startedAt: egressInfo.startedAt?.toString() ?? null,
      endedAt: egressInfo.endedAt?.toString() ?? null,
      error: (egressInfo as { error?: string }).error ?? null,
    })

    return NextResponse.json({
      ok: true,
      roomName,
      egressId: egressInfo.egressId,
      status: egressInfo.status,
      startedAt: egressInfo.startedAt?.toString() ?? null,
      endedAt: egressInfo.endedAt?.toString() ?? null,
      file: egressInfo.fileResults?.[0]?.filename ?? null,
      fileResults: egressInfo.fileResults ?? [],
      streamResults: egressInfo.streamResults ?? [],
      error: (egressInfo as { error?: string }).error ?? null,
      source: body.source ?? "Program Feed",
      destination: body.destination ?? "Jupiter Cloud",
      quality: body.quality ?? "1080p Standard",
    })
  } catch (error) {
    console.error("[recording.start] failed", error)
    return NextResponse.json(
      {
        ok: false,
        error: errorMessage(error),
      },
      { status: 500 }
    )
  }
}