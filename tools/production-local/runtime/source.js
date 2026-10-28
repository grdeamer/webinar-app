import { LK, canvas, capability, connect, jsonFetch, scheduleFrames, senderCounters, status } from './common.js'

export async function runSource(role) {
  const sourceA = role === 'source-a'
  const profile = window.localHaVideo || { width: 640, height: 360, codec: 'vp8', maxBitrate: 1_500_000 }
  const surface = canvas(profile.width, profile.height); const ctx = surface.getContext('2d'); ctx.scale(profile.width / 640, profile.height / 360)
  let frames = 0; let paused = false; let manualTrack = null
  const stop = scheduleFrames(now => {
    if (paused) return
    frames++
    ctx.fillStyle = sourceA ? '#073b60' : '#582647'; ctx.fillRect(0, 0, 640, 360)
    ctx.fillStyle = sourceA ? '#47d6ed' : '#ffac67'
    const x = (now / (sourceA ? 6 : 9)) % 740 - 50
    ctx.fillRect(x, 140, 50, 120)
    ctx.fillStyle = 'white'; ctx.font = 'bold 30px sans-serif'
    ctx.fillText(`SYNTHETIC SOURCE ${sourceA ? 'A' : 'B'}`, 30, 58)
    ctx.font = '18px monospace'; ctx.fillText(`Independent frames: ${frames}`, 30, 96)
    ctx.fillText(`${sourceA ? '440' : '660'} Hz test tone / ${profile.width} x ${profile.height} / target 30 fps`, 30, 320)
    manualTrack?.requestFrame()
  })
  const audio = new AudioContext({ sampleRate: 48000 }); await audio.resume()
  const oscillator = audio.createOscillator(); oscillator.frequency.value = sourceA ? 440 : 660
  const gain = audio.createGain(); gain.gain.value = 0.08
  const output = audio.createMediaStreamDestination(); oscillator.connect(gain).connect(output); oscillator.start()
  const { room } = await connect(role)
  const capture = surface.captureStream(window.localHaVideo ? 0 : 30).getVideoTracks()[0]
  if (window.localHaVideo) manualTrack = capture
  const video = await room.localParticipant.publishTrack(capture, { name: 'synthetic-video', source: LK.Track.Source.Camera, simulcast: false, degradationPreference: 'maintain-resolution', videoCodec: profile.codec, videoEncoding: { maxBitrate: profile.maxBitrate, maxFramerate: 30 } })
  const sound = await room.localParticipant.publishTrack(output.stream.getAudioTracks()[0], { name: 'synthetic-audio', source: LK.Track.Source.Microphone, dtx: false, red: false })
  status(`Independent ${role} publishing locally`)
  let reporting = false
  const timer = setInterval(async () => {
    if (reporting) return; reporting = true
    try {
      const encoding = window.localHaVideo ? await senderCounters(video.track, sound.track) : null
      const control = await jsonFetch(`/api/media/report?role=${role}`, { frames, videoTrackSid: video.trackSid, encoding }, capability)
      paused = control.paused; gain.gain.value = paused ? 0 : .08
    } catch (error) { status(error.message) }
    finally { reporting = false }
  }, 1000)
  window.stopLocalSource = async () => { clearInterval(timer); stop(); oscillator.stop(); await audio.close(); await room.disconnect() }
}
