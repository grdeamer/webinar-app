"use client"

import { useCallback, useRef } from "react"
import StagePlayer from "@/components/live/StagePlayer"
import type { BroadcastOutputProfile } from "@/lib/broadcast/outputProfiles"

export default function ProgramOutputClient({
  slug,
  token,
  serverUrl,
  outputProfile,
}: {
  slug: string
  token: string | null
  serverUrl: string | null
  outputProfile: BroadcastOutputProfile
}) {
  const readySent = useRef(false)
  const signalReady = useCallback(() => {
    if (readySent.current) return
    readySent.current = true
    console.log("START_RECORDING")
  }, [])

  return (
    <main
      className="h-screen w-screen overflow-hidden bg-black"
      data-output-resolution={`${outputProfile.width}x${outputProfile.height}`}
      data-output-aspect={outputProfile.aspectRatio}
    >
      <div className="h-full w-full overflow-hidden bg-black">
        <StagePlayer
          slug={slug}
          egressToken={token}
          egressServerUrl={serverUrl}
          outputProfile={outputProfile}
          onConnected={signalReady}
        />
      </div>
    </main>
  )
}
