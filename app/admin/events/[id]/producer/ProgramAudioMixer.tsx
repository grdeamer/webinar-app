"use client"
import { useEffect, useState } from 'react'
import type { AudioMix } from '@/lib/production/contracts'
import { editProgramAudioMix, type ProgramMixerController, type RehearsalAudio } from '@/lib/producer/programAudioMix'
function RehearsalMeter({ input, mix }: { input: RehearsalAudio; mix: AudioMix }) {
  const [rms, setRms] = useState(0)
  const [peak, setPeak] = useState(0)
  const channel = mix.channels.find((item) => item.sourceId === input.sourceId)
  const audible = channel && !channel.muted && !mix.muted &&
    (channel.solo || !mix.channels.some((item) => item.solo))
  const gain = audible ? 10 ** ((channel.gainDb + mix.masterGainDb) / 20) : 0

  useEffect(() => {
    const context = new AudioContext()
    const source = context.createMediaStreamSource(new MediaStream([input.track]))
    const analyser = context.createAnalyser()
    source.connect(analyser)
    void context.resume().catch(() => {})
    const samples = new Float32Array(analyser.fftSize)
    const timer = window.setInterval(() => {
      analyser.getFloatTimeDomainData(samples)
      const level = gain * Math.sqrt(samples.reduce((sum, value) => sum + value * value, 0) / samples.length)
      setRms(level)
      setPeak((previous) => Math.max(previous, level))
    }, 200)
    return () => {
      window.clearInterval(timer)
      source.disconnect()
      void context.close().catch(() => {})
    }
  }, [input.track, gain])

  const db = (level: number) => level < 0.0005 ? 'Silence' : `${(20 * Math.log10(level)).toFixed(1)} dBFS`
  return <p className="my-2 text-sm text-emerald-200">Private rehearsal mix · {db(rms)} · loudest reading {db(peak)}</p>
}

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
    <p role="status" className="my-2 text-sm">{!connected ? (engine.stoppedMessage ?? 'Local engine stopped. Start npm run production:producer:local to connect.') : `${snapshot!.live ? 'Live Program' : 'Off air'} · committed r${snapshot!.revision} · ${observed ? 'independent receiver confirmed' : 'waiting for fresh receiver confirmation'}`}</p>
    {connected && snapshot && !snapshot.live && engine.rehearsalAudio && snapshot.revision >= engine.rehearsalAudio.revision
      ? <RehearsalMeter key={engine.rehearsalAudio.revision} input={engine.rehearsalAudio} mix={snapshot.mix} />
      : null}
    {connected && snapshot?.live && snapshot.receiver ? <p className="text-sm">Outgoing receive: {snapshot.receiver.width}×{snapshot.receiver.height} · {snapshot.receiver.fps ?? '—'} fps · {snapshot.receiver.audioRms > 0 ? (20*Math.log10(snapshot.receiver.audioRms)).toFixed(1)+' dBFS' : 'silence'} · dominant {Math.round(snapshot.receiver.dominantHz)} Hz</p> : null}
    {error ? <p role="alert" className="text-amber-200">{error}</p> : null}
    <fieldset disabled={!connected || busy} className="mt-3 flex flex-wrap gap-3 disabled:opacity-50">
      <legend className="sr-only">Program master and source channels</legend>
      {draft ? [{sourceId:null,label:'Master',gainDb:draft.masterGainDb,muted:draft.muted,solo:false}, ...draft.channels.map(channel=>({...channel,label:snapshot?.channels.find(source=>source.sourceId===channel.sourceId)?.label ?? channel.sourceId}))].map(channel=><div key={channel.sourceId??'master'} className="min-w-40 rounded border border-white/20 p-3">
        <h3>{channel.label}</h3><label className="block text-sm">{channel.label} gain (dB)<input aria-label={`${channel.label} gain (dB)`} type="range" min="-60" max="12" step="1" value={channel.gainDb} onChange={event=>gain(channel.sourceId,Number(event.target.value))} /></label><output>{channel.gainDb} dB</output>
        <div className="mt-2 flex gap-2"><button className="rounded border px-3 py-1" type="button" aria-label={`Mute ${channel.label}`} aria-pressed={channel.muted} onClick={()=>void apply(editProgramAudioMix(draft,channel.sourceId,'muted',!channel.muted))}>Mute</button>{channel.sourceId ? <button className="rounded border px-3 py-1" type="button" aria-label={`Solo ${channel.label}`} aria-pressed={channel.solo} onClick={()=>void apply(editProgramAudioMix(draft,channel.sourceId,'solo',!channel.solo))}>Solo</button> : null}</div>
      </div>) : null}
      <button className="rounded border px-3 py-2" type="button" disabled={!draft || !dirty} onClick={()=>{if(draft)void apply(draft)}}>Apply Program gains</button>
      {engine.allowPrepare !== false ? <button className="rounded border px-3 py-2" type="button" onClick={()=>void engine.prepare()}>Prepare generated A/B Program test</button> : null}
    </fieldset>
    <p className="mt-2 text-xs text-white/65">Changes affect encoded Program, not local listening volume. Pending fader edits apply with “Apply Program gains”. Recording remains off.</p>
  </section>
}
