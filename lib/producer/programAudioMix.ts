import type { AudioMix } from '../production/contracts'
export type ProgramMixerSnapshot = {
  runId: string; revision: number; running: boolean; live: boolean; expiresAtMs: number; recordingEnabled: false
  mix: AudioMix
  channels: { sourceId: string; label: string }[]
  receiver: { revision: number | null; atMs: number; audioRms: number; dominantHz: number; width: number; height: number; fps: number | null } | null
}
export type ProgramMixerController = {
  snapshot: ProgramMixerSnapshot | null; busy: boolean; error: string | null; allowPrepare?: boolean; stoppedMessage?: string
  apply: (mix: AudioMix, expected: { runId: string; revision: number }) => Promise<boolean>
  prepare: () => Promise<boolean>
}
export function editProgramAudioMix(mix: AudioMix, sourceId: string | null, field: 'gainDb' | 'muted' | 'solo', value: number | boolean): AudioMix {
  const next = structuredClone(mix)
  if (field === 'gainDb' && (typeof value !== 'number' || !Number.isFinite(value) || value < -60 || value > 12)) throw new Error('Gain must be between -60 and +12 dB')
  if (field !== 'gainDb' && typeof value !== 'boolean') throw new Error('Mute and solo must be true or false')
  if (sourceId === null) {
    if (field === 'solo') throw new Error('Master solo is not supported')
    if (field === 'gainDb') next.masterGainDb = value as number
    else next.muted = value as boolean
  } else {
    const channel = next.channels.find(item => item.sourceId === sourceId)
    if (!channel) throw new Error('Unknown Program source')
    if (field === 'gainDb') channel.gainDb = value as number
    else channel[field] = value as boolean
  }
  return next
}
