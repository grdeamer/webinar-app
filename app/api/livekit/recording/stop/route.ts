import { NextResponse } from "next/server"
import { EgressClient } from "livekit-server-sdk"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

type StopRecordingRequest = {
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
  return "Unknown recording stop error"
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as StopRecordingRequest
    const egressId = normalizeEgressId(body.egressId)

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
    const egressInfo = await egressClient.stopEgress(egressId)

    return NextResponse.json({
      ok: true,
      egressId: egressInfo.egressId,
      status: egressInfo.status,
      endedAt: egressInfo.endedAt?.toString() ?? null,
      file: egressInfo.fileResults?.[0]?.filename ?? null,
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