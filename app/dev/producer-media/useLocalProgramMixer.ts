"use client"
import { useCallback, useEffect, useRef, useState } from 'react'
import type { AudioMix } from '@/lib/production/contracts'
import type { ProgramMixerController, ProgramMixerSnapshot } from '@/lib/producer/programAudioMix'
export default function useLocalProgramMixer(enabled=true): ProgramMixerController {
  const [snapshot, setSnapshot] = useState<ProgramMixerSnapshot | null>(null), [busy,setBusy] = useState(false), [error,setError] = useState<string | null>(null)
  const current = useRef(snapshot), inFlight = useRef(false)
  const refresh = useCallback(async (signal?: AbortSignal) => {
    const response = await fetch('/dev/producer-media/engine', { cache: 'no-store', signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(3000)]) : AbortSignal.timeout(3000) }), value = await response.json()
    if (!response.ok) throw new Error(value.error || 'Local mixer unavailable')
    current.current = value; setSnapshot(value)
  }, [])
  useEffect(() => {
    if(!enabled)return
    const controller = new AbortController()
    let pending = false
    const poll = async () => { if (pending || inFlight.current) return; pending = true; try { await refresh(controller.signal) } catch { if (!controller.signal.aborted) { current.current = null; setSnapshot(null) } } finally { pending = false } }
    void poll(); const timer = setInterval(() => void poll(),1000)
    return () => { controller.abort(); clearInterval(timer) }
  }, [refresh,enabled])
  async function change(action: 'mix' | 'prepare', mix?: AudioMix, expected?: {runId:string; revision:number}): Promise<boolean> {
    if (inFlight.current || !current.current?.running) return false
    const before = current.current
    if (expected && (before.runId !== expected.runId || before.revision !== expected.revision)) { setError('Mix changed in another console. Review the current mix before retrying.'); return false }
    inFlight.current = true; setBusy(true); setError(null)
    try {
      const response = await fetch('/dev/producer-media/engine', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ action, mix, runId:before.runId, expectedRevision:before.revision }), signal:AbortSignal.timeout(15000) }), value = await response.json()
      if (!response.ok) throw new Error(value.error || 'Mix was not committed')
      current.current = value; setSnapshot(value); return true
    } catch (error) { setError(error instanceof Error ? error.message : 'Mixer failed'); await refresh().catch(() => {}); return false }
    finally { inFlight.current = false; setBusy(false) }
  }
  return { snapshot, busy, error, apply: (mix,expected) => change('mix',mix,expected), prepare: () => change('prepare') }
}
