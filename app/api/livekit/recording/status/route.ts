import { NextResponse } from "next/server"
import { EgressClient } from "livekit-server-sdk"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"
export const maxDuration = 60

type RecordingStatusRequest = {
  egressId?: string
}

function egressStatusLabel(status: number): string {
  switch (status) {
    case 0:
      return "starting"
    case 1:
      return "active"
    case 2:
      return "ending"
    case 3:
      return "complete"
    case 4:
      return "failed"
    case 5:
      return "aborted"
    case 6:
      return "limit_reached"
    default:
      return "unknown"
  }
}

function hasUsableFile(file: { size?: bigint | number | string | null; location?: string | null } | null): boolean {
  if (!file) return false

  const sizeValue = typeof file.size === "bigint" ? Number(file.size) : Number(file.size ?? 0)
  return sizeValue > 0 && Boolean(file.location)
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

function normalizeEgressId(value: unknown): string | null {
  if (typeof value !== "string") return null

  const trimmed = value.trim()
  return trimmed.length ? trimmed : null
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return "Unknown recording status error"
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as RecordingStatusRequest
    const egressId = normalizeEgressId(body.egressId)

    console.log("[recording.status] request", {
      egressId,
    })

    if (!egressId) {
      return NextResponse.json(
        { ok: false, error: "egressId is required" },
        { status: 400 }
      )
    }

    const livekitUrl = requiredEnv("LIVEKIT_URL", "NEXT_PUBLIC_LIVEKIT_URL")
    const apiKey = requiredEnv("LIVEKIT_API_KEY")
    const apiSecret = requiredEnv("LIVEKIT_API_SECRET")

    const egressClient = new EgressClient(livekitUrl, apiKey, apiSecret)
    const egresses = await egressClient.listEgress({
      egressId,
    })

    const egressInfo = egresses[0]

    if (!egressInfo) {
      return NextResponse.json(
        {
          ok: false,
          error: "Recording egress not found",
          egressId,
        },
        { status: 404 }
      )
    }

    const status = Number(egressInfo.status)
    const terminal = status === 3 || status === 4 || status === 5 || status === 6
    const statusLabel = egressStatusLabel(status)
    const file = egressInfo.fileResults?.[0] ?? null
    const uploaded = hasUsableFile(file)
    const detailedFileResults =
      egressInfo.fileResults?.map((result) => ({
        filename: result.filename,
        location: result.location,
        size: result.size?.toString() ?? null,
        startedAt: result.startedAt?.toString() ?? null,
        endedAt: result.endedAt?.toString() ?? null,
        duration: result.duration?.toString() ?? null,
      })) ?? []
    console.log("[recording.status] result", {
      egressId: egressInfo.egressId,
      status: egressInfo.status,
      statusLabel,
      uploaded,
      terminal,
      startedAt: egressInfo.startedAt?.toString() ?? null,
      endedAt: egressInfo.endedAt?.toString() ?? null,
      fileResults: detailedFileResults,
      error: (egressInfo as { error?: string }).error ?? null,
    })

    return NextResponse.json({
      ok: true,
      egressId: egressInfo.egressId,
      status: egressInfo.status,
      statusLabel,
      uploaded,
      terminal,
      startedAt: egressInfo.startedAt?.toString() ?? null,
      endedAt: egressInfo.endedAt?.toString() ?? null,
      file: file?.filename ?? null,
      size: file?.size?.toString() ?? null,
      location: file?.location ?? null,
      fileResults: detailedFileResults,
      error:
        (egressInfo as { error?: string }).error ||
        (terminal && !uploaded ? "Recording finalized without a usable uploaded file" : null),
    })
  } catch (error) {
    console.error("[recording.status] failed", error)
    return NextResponse.json(
      {
        ok: false,
        error: errorMessage(error),
      },
      { status: 500 }
    )
  }
}