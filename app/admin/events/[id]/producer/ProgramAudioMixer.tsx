"use client"
import { useEffect, useState } from 'react'
import type { AudioMix } from '@/lib/production/contracts'
import { editProgramAudioMix, type ProgramMixerController } from '@/lib/producer/programAudioMix'
export default function ProgramAudioMixer({ engine }: { engine: ProgramMixerController }) {
  const { snapshot, busy, error } = engine
  const [editing,setEditing] = useState<{runId:string; revision:number; mix:AudioMix} | null>(null)
  const [now,setNow] = useState(0)
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer) }, [])
  const dirty = Boolean(snapshot && editing?.runId === snapshot.runId && editing.revision === snapshot.revision)
  const draft = dirty ? editing!.mix : snapshot?.mix ?? null
  const connected = Boolean(snapshot?.running && now > 0 && snapshot.expiresAtMs > now)
  const observed = Boolean(snapshot?.receiver && now - snapshot.receiver.atMs < 2500 && snapshot.receiver.revision === snapshot.revision)
  async function apply(next: AudioMix) { if (snapshot && await engine.apply(next, {runId:snapshot.runId,revision:snapshot.revision})) setEditing(null) }
  function gain(sourceId: string | null, value: number) { if (draft && snapshot) setEditing({runId:snapshot.runId,revision:snapshot.revision,mix:editProgramAudioMix(draft,sourceId,'gainDb',value)}) }
  return <section aria-label="Program audio engine mixer" className="rounded border border-violet-300/30 bg-slate-950 p-4 text-white">
    <h2 className="text-lg font-semibold">Program audio engine mixer</h2>
    <p role="status" className="my-2 text-sm">{!connected ? 'Local engine stopped. Start npm run production:producer:local to connect.' : `${snapshot!.live ? 'Live Program' : 'Off air'} · committed r${snapshot!.revision} · ${observed ? 'independent receiver confirmed' : 'waiting for fresh receiver confirmation'}`}</p>
    {connected && snapshot?.receiver ? <p className="text-sm">Outgoing receive: {snapshot.receiver.width}×{snapshot.receiver.height} · {snapshot.receiver.fps ?? '—'} fps · {snapshot.receiver.audioRms > 0 ? (20*Math.log10(snapshot.receiver.audioRms)).toFixed(1)+' dBFS' : 'silence'} · dominant {Math.round(snapshot.receiver.dominantHz)} Hz</p> : null}
    {error ? <p role="alert" className="text-amber-200">{error}</p> : null}
    <fieldset disabled={!connected || busy} className="mt-3 flex flex-wrap gap-3 disabled:opacity-50">
      <legend className="sr-only">Program master and source channels</legend>
      {draft ? [{sourceId:null,label:'Master',gainDb:draft.masterGainDb,muted:draft.muted,solo:false}, ...draft.channels.map(channel=>({...channel,label:snapshot?.channels.find(source=>source.sourceId===channel.sourceId)?.label ?? channel.sourceId}))].map(channel=><div key={channel.sourceId??'master'} className="min-w-40 rounded border border-white/20 p-3">
        <h3>{channel.label}</h3><label className="block text-sm">{channel.label} gain (dB)<input aria-label={`${channel.label} gain (dB)`} type="range" min="-60" max="12" step="1" value={channel.gainDb} onChange={event=>gain(channel.sourceId,Number(event.target.value))} /></label><output>{channel.gainDb} dB</output>
        <div className="mt-2 flex gap-2"><button className="rounded border px-3 py-1" type="button" aria-label={`Mute ${channel.label}`} aria-pressed={channel.muted} onClick={()=>void apply(editProgramAudioMix(draft,channel.sourceId,'muted',!channel.muted))}>Mute</button>{channel.sourceId ? <button className="rounded border px-3 py-1" type="button" aria-label={`Solo ${channel.label}`} aria-pressed={channel.solo} onClick={()=>void apply(editProgramAudioMix(draft,channel.sourceId,'solo',!channel.solo))}>Solo</button> : null}</div>
      </div>) : null}
      <button className="rounded border px-3 py-2" type="button" disabled={!draft || !dirty} onClick={()=>{if(draft)void apply(draft)}}>Apply Program gains</button>
      <button className="rounded border px-3 py-2" type="button" onClick={()=>void engine.prepare()}>Prepare generated A/B Program test</button>
    </fieldset>
    <p className="mt-2 text-xs text-white/65">Changes affect encoded Program, not local listening volume. Pending fader edits apply with “Apply Program gains”. Recording remains off.</p>
  </section>
}
