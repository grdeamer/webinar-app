"use client"

import { useState } from "react"
import ProducerSwitcherPanel from "@/components/live/ProducerSwitcherPanel"
import ProducerBackstagePanel from "@/components/live/ProducerBackstagePanel"
import ProducerBlockInspector from "@/components/live/ProducerBlockInspector"
import ProducerMediaToolbar from "@/components/live/ProducerMediaToolbar"
import ProducerScenePanel from "@/components/live/ProducerScenePanel"

export default function ProducerRoomClient({
  eventId,
  sessionId,
}: {
  eventId: string
  sessionId: string
}) {
  const [participants] = useState<any[]>([])

  return (
    <div className="min-h-screen bg-[#050816] text-white p-6">
      <div className="mb-6">
        <div className="text-xs uppercase tracking-[0.3em] text-white/40">
          Producer Room
        </div>
        <h1 className="text-3xl font-semibold">
          Integrated Mission Control
        </h1>
        <p className="text-white/50 mt-2">
          Event {eventId} · Session {sessionId}
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_360px]">
        <div className="space-y-6">
          <ProducerSwitcherPanel>
            <div className="rounded-2xl border border-white/10 p-8 text-white/70">
              Preview / Program area now modularized.
            </div>
          </ProducerSwitcherPanel>

          <ProducerMediaToolbar>
            <div className="text-white/60">Upload video / pdf / image / text blocks</div>
          </ProducerMediaToolbar>

          <ProducerScenePanel>
            <div className="text-white/60">Save / Recall scenes</div>
          </ProducerScenePanel>

          <ProducerBlockInspector>
            <div className="text-white/60">Selected block controls</div>
          </ProducerBlockInspector>
        </div>

        <ProducerBackstagePanel participantCount={participants.length}>
          <div className="rounded-2xl border border-dashed border-white/10 p-6 text-white/40">
            Backstage participants list
          </div>
        </ProducerBackstagePanel>
      </div>
    </div>
  )
}
