"use client"

import { useEffect, useRef, useState } from "react"
import { Power, LoaderCircle, Unplug, MonitorPlay, ShieldCheck, ChevronDown } from "lucide-react"
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
  function cancelStartup() { if (!startup.current) return; startup.current.abort(); startup.current = null; setStarting(false); setStartupMessage('Connection cancelled. Automatic shutdown remains armed; use Stop producer engine to end compute charges.') }
  const freshReceiver = receiver && now - receiver.atMs < 5000
  return <section aria-label="Program engine connection" className="relative z-[110] shrink-0 border-b border-white/[0.08] bg-[#07111d] px-5 py-3 text-xs text-white/75">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${engine.connected ? 'bg-emerald-400' : starting ? 'animate-pulse bg-sky-300' : 'bg-slate-500'}`} />
        <span className="font-medium text-white/90">Program engine</span>
        <span className="rounded-md border border-white/[0.08] bg-white/[0.025] px-2 py-1 text-[10px] text-white/50">{engine.connected ? 'Connected' : starting ? 'Starting' : 'Offline'}</span>
        {engine.ready ? <span className="text-[10px] font-medium text-emerald-300">Preview ready</span> : null}
      </div>
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center gap-1.5 text-[10px] text-white/45"><ShieldCheck size={13} aria-hidden="true" />Recording off</span>
        <button type="button" disabled={engine.busy || starting} onClick={() => void (engine.connected ? engine.stop() : config.canStart ? start() : engine.connect())}
          title={engine.connected ? 'Disconnect inputs; use Stop engine to end EC2 charges' : config.canStart ? 'Start EC2 and connect inputs with automatic shutdown' : 'Connect to the running engine'}
          className={`inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 disabled:cursor-not-allowed disabled:opacity-45 ${engine.connected ? 'border-white/15 bg-white/[0.035] text-white/75 hover:bg-white/[0.07]' : 'border-sky-300/30 bg-sky-400/[0.12] text-sky-100 hover:border-sky-300/50 hover:bg-sky-400/[0.18]'}`}>
          {starting ? <LoaderCircle size={15} className="animate-spin" aria-hidden="true" /> : engine.connected ? <Unplug size={15} aria-hidden="true" /> : config.canStart ? <Power size={15} aria-hidden="true" /> : <MonitorPlay size={15} aria-hidden="true" />}
          {engine.connected ? 'Disconnect inputs' : starting ? 'Starting engine…' : config.canStart ? 'Start engine' : 'Connect inputs'}
        </button>
        {starting ? <button type="button" onClick={cancelStartup} className="text-[11px] text-white/55 underline-offset-4 hover:text-white hover:underline">Cancel</button> : null}
      </div>
    </div>
    <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 pl-5">
      <span role="status" aria-live="polite" className="min-w-0 text-[11px] leading-relaxed text-white/50">{startupMessage || engine.message}</span>
      <span className="font-mono text-[10px] tabular-nums text-white/40">{freshReceiver ? `${receiver.width} × ${receiver.height} · ${receiver.fps ?? '—'} fps` : 'Self-hosted · 1080p30 target'}</span>
    </div>
    {config.canStart && soak ? <OriginalRoomSoakControls eventId={config.eventId} transport={transport} engine={engine} soak={soak} onCue={onCue} onTake={onTake}/> : null}
    <details className="group mt-2 pl-5">
      <summary className="flex w-fit cursor-pointer list-none items-center gap-1 text-[10px] text-white/35 transition hover:text-white/65">Engine details<ChevronDown size={12} className="transition group-open:rotate-180" aria-hidden="true" /></summary>
      <div className="mt-2 space-y-2 border-l border-white/10 pl-3 text-[11px] leading-relaxed text-white/45">
        <p>TAKE sends the complete canvas when Preview is ready. PowerPoint changes stay in Preview until TAKE. Program listening is muted locally.</p>
        <p>Disconnecting inputs does not stop EC2. {config.canStart ? 'Use Stop producer engine below to end compute charges.' : 'The engine owner controls EC2 start and stop.'} Automatic shutdown remains armed.</p>
        {config.canStart ? <Ec2ProducerControls root={config.root} hourTest={Boolean(soak)} startAndConnect={start} starting={starting} onStop={cancelStartup}/> : null}
      </div>
    </details>
  </section>
}
