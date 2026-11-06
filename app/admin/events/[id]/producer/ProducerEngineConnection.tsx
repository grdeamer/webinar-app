"use client"

import { useEffect, useRef, useState } from "react"
import { startAndConnect } from '@/lib/producer/startAndConnect'
import OriginalRoomSoakControls from './OriginalRoomSoakControls'
import type {ProgramMixerSnapshot} from '@/lib/producer/programAudioMix'
import type {PreviewBlock} from './useProducerBlocks'
import type {StudioTransport} from '@/app/dev/producer-media/localProgramTransport'
import type { HostedStudioConfig } from "@/lib/production/hosted/studioConfig"
import type useLibraryProgram from "@/app/dev/producer-media/useLibraryProgram"
import Ec2ProducerControls from "./rehearsal/Ec2ProducerControls"

type Props = {soak?:ProgramMixerSnapshot['soak'];transport:StudioTransport;onCue:(blocks:PreviewBlock[])=>void;onTake:()=>Promise<boolean>; config: HostedStudioConfig; engine: ReturnType<typeof useLibraryProgram>; receiver?: {width:number;height:number;fps:number|null;atMs:number} }

/** Only an explicit click starts compute; status reads never start or renew it. */
export default function ProducerEngineConnection({ config, engine, receiver, soak, transport, onCue, onTake }: Props) {
  const [now, setNow] = useState(Date.now)
  const [starting, setStarting] = useState(false)
  const [startupMessage, setStartupMessage] = useState('')
  const startup = useRef<AbortController | null>(null)
  useEffect(() => () => { startup.current?.abort() }, [config.root])
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer) }, [])
  async function start() {
    if (startup.current || engine.busy) return
    const controller = new AbortController()
    startup.current = controller
    setStarting(true)
    try {
      await startAndConnect({
        prepare: async () => {
          const response = await fetch(`${config.root}/prepare`, {method:'POST', headers:{'Content-Type':'application/json'}, body:'{}', signal:AbortSignal.any([controller.signal, AbortSignal.timeout(30_000)])})
          if (!response.ok) throw new Error('EC2 start was not confirmed. Check status before trying again; shutdown was not extended.')
          return response.json()
        },
        status: async () => {
          const response = await fetch(`${transport.root}/api/producer/status`, {cache:'no-store', signal:AbortSignal.any([controller.signal, AbortSignal.timeout(10_000)])})
          if (!response.ok) throw new Error('Engine is not ready')
          return response.json()
        },
        connect: () => engine.connect(controller.signal), now: Date.now,
        wait: () => new Promise(resolve => setTimeout(resolve, 2000)),
        signal: controller.signal, progress: setStartupMessage,
      })
      setStartupMessage('')
    } catch (error) {
      if (!controller.signal.aborted) setStartupMessage(error instanceof Error ? error.message : 'Startup failed. Check EC2 status; no automatic restart was attempted.')
    } finally {
      if (startup.current === controller) startup.current = null
      if (!controller.signal.aborted) setStarting(false)
    }
  }
  function cancelStartup() { startup.current?.abort(); startup.current = null; setStarting(false); setStartupMessage('Connection cancelled. Automatic shutdown remains armed; use Stop producer engine to end compute charges.') }
  return <section aria-label="Program engine connection" className="relative z-[110] shrink-0 border-b border-white/10 bg-[#07111d] px-5 py-2 text-xs text-white/75">
    <div className="flex flex-wrap items-center gap-3">
      <span className={engine.connected ? "text-emerald-300" : "text-amber-200"}>{engine.connected ? "Program engine connected" : "Program engine disconnected"}</span>
      <button type="button" disabled={engine.busy || starting} onClick={() => void (engine.connected ? engine.stop() : config.canStart ? start() : engine.connect())} className="rounded border border-white/20 px-3 py-1 disabled:opacity-40">
        {engine.connected ? "Disconnect engine inputs" : starting ? "Starting & connecting…" : config.canStart ? "Start & connect engine" : "Connect engine inputs"}
      </button>
      {starting ? <button type="button" onClick={cancelStartup} className="rounded border border-white/20 px-3 py-1">Cancel connection</button> : null}
      <span>Recording off · self-hosted relay</span>
      <span role="status" aria-live="polite" className="min-w-0 flex-1">{startupMessage || engine.message}</span>
    </div>
    <p className="mt-1 text-white/55">{receiver && now - receiver.atMs < 5000 ? `Received Program: ${receiver.width} × ${receiver.height} · ${receiver.fps ?? "unavailable"} fps` : "No fresh outgoing measurements yet."} Disconnecting inputs does not stop EC2; use Stop producer engine to end compute charges.</p>
    {config.canStart&&soak?<OriginalRoomSoakControls eventId={config.eventId} transport={transport} engine={engine} soak={soak} onCue={onCue} onTake={onTake}/>:null}
    {config.canStart ? <details className="mt-1"><summary className="cursor-pointer text-white/55">EC2 start / stop and usage costs</summary><Ec2ProducerControls root={config.root} hourTest={Boolean(soak)} startAndConnect={start} starting={starting} onStop={cancelStartup}/></details> : null}
    <p className="mt-1 text-[10px] text-white/45">TAKE sends the complete library canvas. PowerPoint slides are static; slide changes stay in Preview until TAKE. Program listening is muted locally; use the video’s volume control to listen. Preview is always muted.</p>
  </section>
}
