import "server-only"

import { RoomServiceClient } from "livekit-server-sdk"
import {
  getLiveKitApiKey,
  getLiveKitApiSecret,
  getLiveKitUrl,
} from "@/lib/live/config"

let singleton: RoomServiceClient | null = null

export function getLiveKitRoomService() {
  if (singleton) return singleton

  singleton = new RoomServiceClient(
    getLiveKitUrl(),
    getLiveKitApiKey(),
    getLiveKitApiSecret()
  )

  return singleton
}