"use client"

import { useEffect, useState } from "react"
import OriginalRoomSoakControls from './OriginalRoomSoakControls'
import type {ProgramMixerSnapshot} from '@/lib/producer/programAudioMix'
import type {PreviewBlock} from './useProducerBlocks'
import type {StudioTransport} from '@/app/dev/producer-media/localProgramTransport'
import type { HostedStudioConfig } from "@/lib/production/hosted/studioConfig"
import type useLibraryProgram from "@/app/dev/producer-media/useLibraryProgram"
import Ec2ProducerControls from "./rehearsal/Ec2ProducerControls"

type Props = {soak?:ProgramMixerSnapshot['soak'];transport:StudioTransport;onCue:(blocks:PreviewBlock[])=>void;onTake:()=>Promise<boolean>; config: HostedStudioConfig; engine: ReturnType<typeof useLibraryProgram>; receiver?: {width:number;height:number;fps:number|null;atMs:number} }

/** Status reads never start compute. Connecting inputs requires an already-running engine. */
export default function ProducerEngineConnection({ config, engine, receiver, soak, transport, onCue, onTake }: Props) {
  const [now, setNow] = useState(Date.now)
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer) }, [])
  return <section aria-label="Program engine connection" className="relative z-[110] shrink-0 border-b border-white/10 bg-[#07111d] px-5 py-2 text-xs text-white/75">
    <div className="flex flex-wrap items-center gap-3">
      <span className={engine.connected ? "text-emerald-300" : "text-amber-200"}>{engine.connected ? "Program engine connected" : "Program engine disconnected"}</span>
      <button type="button" disabled={engine.busy} onClick={() => void (engine.connected ? engine.stop() : engine.connect())} className="rounded border border-white/20 px-3 py-1 disabled:opacity-40">
        {engine.connected ? "Disconnect engine inputs" : "Connect engine inputs"}
      </button>
      <span>Recording off · self-hosted relay</span>
      <span role="status" className="min-w-0 flex-1">{engine.message}</span>
    </div>
    <p className="mt-1 text-white/55">{receiver && now - receiver.atMs < 5000 ? `Received Program: ${receiver.width} × ${receiver.height} · ${receiver.fps ?? "unavailable"} fps` : "No fresh outgoing measurements yet."} Disconnecting inputs does not stop EC2; use Stop producer engine to end compute charges.</p>
    {config.canStart&&soak?<OriginalRoomSoakControls eventId={config.eventId} transport={transport} engine={engine} soak={soak} onCue={onCue} onTake={onTake}/>:null}
    {config.canStart ? <details className="mt-1"><summary className="cursor-pointer text-white/55">EC2 start / stop and usage costs</summary><Ec2ProducerControls root={config.root} hourTest={Boolean(soak)}/></details> : null}
    <p className="mt-1 text-[10px] text-white/45">One library source at a time. PowerPoint slides are static; slide changes stay in Preview until TAKE. Program listening is muted locally; use the video’s volume control to listen. Preview is always muted.</p>
  </section>
}
