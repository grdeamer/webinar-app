import assert from 'node:assert/strict'
import { writeFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import type { AudioMix } from '../lib/production/contracts.ts'
import type { ProgramMixerSnapshot } from '../lib/producer/programAudioMix.ts'
const base = 'http://localhost:3000/dev/producer-media/engine'
const began = Date.now(), deadline = began + 240000
const result: Record<string, unknown> = { outcome: 'running', beganAtMs: began, recording: false, externalServices: false, checks: [] }
const checks = result.checks as unknown[]
async function status(): Promise<ProgramMixerSnapshot> {
  const response = await fetch(base, {signal:AbortSignal.timeout(5000)}); assert.equal(response.status,200)
  const s = await response.json() as ProgramMixerSnapshot
  assert.ok(s.running && s.expiresAtMs > Date.now()); assert.equal(s.recordingEnabled,false)
  if (result.runId) assert.equal(s.runId,result.runId)
  return s
}
async function mix(audio: AudioMix) {
  const s = await status(), response = await fetch(base, {method:'POST',headers:{'Content-Type':'application/json',Origin:'http://localhost:3000'},body:JSON.stringify({action:'mix',runId:s.runId,expectedRevision:s.revision,mix:audio}),signal:AbortSignal.timeout(5000)})
  assert.equal(response.status,200); return (await response.json() as ProgramMixerSnapshot).revision
}
async function observe(revision: number, silence = false, hz?: number) {
  const until = Math.min(deadline,Date.now()+15000), points: {rms:number; hz:number}[] = []
  let prior = 0
  while(Date.now()<until) {
    const s = await status(), r = s.receiver
    if(r && r.atMs!==prior && r.revision===revision && Date.now()-r.atMs<2500) {
      prior=r.atMs
      if ((silence ? r.audioRms<0.0001 : r.audioRms>0.0005) && (hz===undefined || Math.abs(r.dominantHz-hz)<40)) points.push({rms:r.audioRms,hz:r.dominantHz})
      else points.length=0
      if(points.length>=3) return points
    }
    await delay(350)
  }
  throw new Error(`Receiver did not confirm revision ${revision}, silence=${silence}, hz=${hz}`)
}
function pass(name:string,data:unknown) { checks.push({name,data}); console.log('MIXER PASS '+name+' '+JSON.stringify(data)) }
const median = (values:number[]) => [...values].sort((a,b)=>a-b)[Math.floor(values.length/2)]
try {
  const first = await status(); result.runId=first.runId
  const audio: AudioMix={masterGainDb:-12,muted:false,channels:[{sourceId:'camera-a',gainDb:0,muted:false,solo:true},{sourceId:'camera-b',gainDb:0,muted:false,solo:false}]}
  let points=await observe(await mix(audio),false,440); const baseline=median(points.map(p=>p.rms)); pass('solo A removes B and receives 440Hz',points)
  await observe(await mix({...audio,muted:true}),true); pass('master mute reaches encoded receiver','<0.0001 RMS')
  await observe(await mix(audio),false,440); pass('master unmute restores encoded receiver','440Hz')
  await observe(await mix({...audio,channels:audio.channels.map(c=>c.sourceId==='camera-a'?{...c,muted:true}:c)}),true); pass('muting soloed source silences Program despite other unmuted source','<0.0001 RMS')
  points=await observe(await mix({...audio,channels:audio.channels.map(c=>({...c,solo:c.sourceId==='camera-b'}))}),false,660); pass('solo B removes A and receives 660Hz',points)
  points=await observe(await mix({...audio,channels:audio.channels.map(c=>c.sourceId==='camera-a'?{...c,gainDb:-12}:c)}),false,440)
  const channelRatio=median(points.map(p=>p.rms))/baseline; assert.ok(channelRatio>.15&&channelRatio<.4); pass('channel -12dB changes encoded output amplitude',{ratio:channelRatio,expected:Math.pow(10,-12/20)})
  points=await observe(await mix({...audio,masterGainDb:-18}),false,440)
  const masterRatio=median(points.map(p=>p.rms))/baseline; assert.ok(masterRatio>.35&&masterRatio<.7); pass('master -6dB relative adjustment changes encoded output',{ratio:masterRatio,expected:Math.pow(10,-6/20)})
  await mix(audio)
  const p: Record<string, unknown>[]=[]; const until=Date.now()+31000
  while(Date.now()<until) {
    const response=await fetch('http://127.0.0.1:4311/api/producer/status'), s=await response.json(), r=s.runtime.observer
    assert.equal(s.runtime.runId,result.runId); assert.equal(s.runtime.recordingEnabled,false); assert.equal(s.externalServices,false)
    assert.ok(r && Date.now()-r.atMs<2500); assert.equal(r.width,1920);assert.equal(r.height,1080)
    p.push({atMs:r.atMs,frames:r.validFrames,decoded:r.rtc.framesDecoded,presented:r.presentedFrames,videoSid:r.videoTrackSid,audioSid:r.audioTrackSid,generation:r.generation,selectionMismatches:r.selectionMismatches})
    await delay(1000)
  }
  const a=p[0],z=p.at(-1)!,seconds=(Number(z.atMs)-Number(a.atMs))/1000
  const fps=Object.fromEntries(['frames','decoded','presented'].map(key=>[key,(Number(z[key])-Number(a[key]))/seconds]))
  assert.ok(seconds>=29)
  for(const value of Object.values(fps)) assert.ok(value>=29.5&&value<=30.5,`FPS outside qualification band: ${value}`)
  assert.ok(p.every(x=>x.videoSid===a.videoSid&&x.audioSid===a.audioSid&&x.selectionMismatches===a.selectionMismatches))
  pass('encoded outgoing FullHD30 window preserves publications and provenance',{seconds,fps,samples:p.length})
  result.outcome='completed'
} catch(error) {result.outcome='failed'; result.error=error instanceof Error?error.message:String(error);process.exitCode=1}
finally {
  result.endedAtMs=Date.now()
  mkdirSync(resolve('.local/production'),{recursive:true});writeFileSync(resolve('.local/production/local-program-mixer-result.json'),JSON.stringify(result,null,2))
  console.log('MIXER RESULT '+result.outcome+(result.error?': '+result.error:''))
}
