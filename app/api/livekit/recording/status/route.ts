

import { NextResponse } from "next/server"
import { EgressClient } from "livekit-server-sdk"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"
export const maxDuration = 60

type RecordingStatusRequest = {
  egressId?: string
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
    const file = egressInfo.fileResults?.[0] ?? null

    console.log("[recording.status] result", {
      egressId: egressInfo.egressId,
      status: egressInfo.status,
      terminal,
      startedAt: egressInfo.startedAt?.toString() ?? null,
      endedAt: egressInfo.endedAt?.toString() ?? null,
      fileResults: egressInfo.fileResults ?? [],
      error: (egressInfo as { error?: string }).error ?? null,
    })

    return NextResponse.json({
      ok: true,
      egressId: egressInfo.egressId,
      status: egressInfo.status,
      terminal,
      startedAt: egressInfo.startedAt?.toString() ?? null,
      endedAt: egressInfo.endedAt?.toString() ?? null,
      file: file?.filename ?? null,
      size: file?.size?.toString() ?? null,
      location: file?.location ?? null,
      fileResults: egressInfo.fileResults ?? [],
      error: (egressInfo as { error?: string }).error ?? null,
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