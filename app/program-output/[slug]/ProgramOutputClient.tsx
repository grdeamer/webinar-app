"use client"

import { useCallback, useRef } from "react"
import StagePlayer from "@/components/live/StagePlayer"

export default function ProgramOutputClient({
  slug,
  token,
  serverUrl,
}: {
  slug: string
  token: string | null
  serverUrl: string | null
}) {
  const readySent = useRef(false)
  const signalReady = useCallback(() => {
    if (readySent.current) return
    readySent.current = true
    console.log("START_RECORDING")
  }, [])

  return (
    <main className="flex min-h-screen items-center justify-center bg-black">
      <div className="aspect-video w-full overflow-hidden bg-black">
        <StagePlayer
          slug={slug}
          egressToken={token}
          egressServerUrl={serverUrl}
          onConnected={signalReady}
        />
      </div>
    </main>
  )
}
