import "server-only"

import { createHash } from "node:crypto"
import {
  AudioCodec,
  EgressClient,
  EncodedFileOutput,
  EncodedFileType,
  EncodingOptions,
  S3Upload,
  StreamOutput,
  StreamProtocol,
  VideoCodec,
  type EncodedOutputs,
} from "livekit-server-sdk"
import {
  getBroadcastOutputProfile,
  type BroadcastOutputProfileId,
} from "./outputProfiles"

export function requiredBroadcastEnv(name: string, fallbackName?: string): string {
  const value = process.env[name] ?? (fallbackName ? process.env[fallbackName] : undefined)
  if (!value) throw new Error(fallbackName ? `Missing env: ${name} or ${fallbackName}` : `Missing env: ${name}`)
  return value
}

export function createBroadcastEgressClient(): EgressClient {
  return new EgressClient(
    requiredBroadcastEnv("LIVEKIT_URL", "NEXT_PUBLIC_LIVEKIT_URL"),
    requiredBroadcastEnv("LIVEKIT_API_KEY"),
    requiredBroadcastEnv("LIVEKIT_API_SECRET"),
  )
}

export function isLiveKitBroadcastConfigured(): boolean {
  return Boolean(
    (process.env.LIVEKIT_URL || process.env.NEXT_PUBLIC_LIVEKIT_URL) &&
    process.env.LIVEKIT_API_KEY &&
    process.env.LIVEKIT_API_SECRET
  )
}

export function isBroadcastRecordingConfigured(): boolean {
  return Boolean(
    process.env.LIVEKIT_EGRESS_S3_BUCKET &&
    process.env.LIVEKIT_EGRESS_S3_REGION &&
    process.env.LIVEKIT_EGRESS_S3_ACCESS_KEY &&
    process.env.LIVEKIT_EGRESS_S3_SECRET
  )
}

export function createBroadcastFileOutput(): EncodedFileOutput {
  if (!isBroadcastRecordingConfigured()) {
    throw new Error("Jupiter Cloud recording storage is not configured for this broadcast.")
  }

  return new EncodedFileOutput({
    fileType: EncodedFileType.MP4,
    filepath: "jupiter-recordings/{room_name}/{time}-{room_id}.mp4",
    disableManifest: true,
    output: {
      case: "s3",
      value: new S3Upload({
        accessKey: requiredBroadcastEnv("LIVEKIT_EGRESS_S3_ACCESS_KEY"),
        secret: requiredBroadcastEnv("LIVEKIT_EGRESS_S3_SECRET"),
        bucket: requiredBroadcastEnv("LIVEKIT_EGRESS_S3_BUCKET"),
        region: requiredBroadcastEnv("LIVEKIT_EGRESS_S3_REGION"),
        endpoint: process.env.LIVEKIT_EGRESS_S3_ENDPOINT?.trim() || undefined,
      }),
    },
  })
}

export function createBroadcastStreamOutput(urls: string[]): StreamOutput {
  return new StreamOutput({ protocol: StreamProtocol.RTMP, urls })
}

export function createBroadcastOutputs(urls: string[], recordingEnabled: boolean): EncodedOutputs {
  return {
    stream: createBroadcastStreamOutput(urls),
    file: recordingEnabled ? createBroadcastFileOutput() : undefined,
  }
}

export function universalBroadcastEncoding(
  profileId?: BroadcastOutputProfileId,
): EncodingOptions {
  const profile = getBroadcastOutputProfile(profileId)

  return new EncodingOptions({
    width: profile.width,
    height: profile.height,
    depth: 24,
    framerate: profile.frameRate,
    audioCodec: AudioCodec.AAC,
    audioBitrate: 128,
    audioFrequency: 48000,
    videoCodec: VideoCodec.H264_BASELINE,
    videoBitrate: profile.videoBitrateKbps,
    keyFrameInterval: 2,
  })
}

export function broadcastOutputFingerprint(url: string): string {
  return createHash("sha256").update(url).digest("hex")
}
