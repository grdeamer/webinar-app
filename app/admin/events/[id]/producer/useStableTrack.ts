/* eslint-disable react-hooks/refs */
"use client"

import { useRef } from "react"
import type { TrackReference } from "@livekit/components-core"

export function useStableTrack(
  nextTrack: TrackReference | null,
  routedIdentities: Set<string>
): TrackReference | null {
  const lastRef = useRef<TrackReference | null>(null)

  if (nextTrack) {
    lastRef.current = nextTrack
  } else if (lastRef.current) {
    if (!routedIdentities.has(lastRef.current.participant.identity)) {
      lastRef.current = null
    }
  }

  return lastRef.current
}

export function useStableCameraGrid(
  nextTracks: TrackReference[],
  routedIdentities: Set<string>
): TrackReference[] {
  const lastRef = useRef<TrackReference[]>([])

  if (nextTracks.length > 0) {
    lastRef.current = nextTracks
  } else if (lastRef.current.length > 0) {
    const stillRouted = lastRef.current.filter((track) =>
      routedIdentities.has(track.participant.identity)
    )
    if (stillRouted.length !== lastRef.current.length) {
      lastRef.current = stillRouted
    }
  }

  return lastRef.current
}
