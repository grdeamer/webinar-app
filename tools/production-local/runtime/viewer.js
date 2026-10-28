import { connect, status } from './common.js'

export async function runViewer() {
  let room = null; let expiry = null
  const main = document.getElementById('media')
  const video = document.createElement('video'); video.autoplay = true; video.muted = true; video.playsInline = true; video.controls = true
  const controls = document.createElement('div'); controls.className = 'buttons'
  const start = document.createElement('button'); start.textContent = 'Start 2-minute live view'
  const sound = document.createElement('button'); sound.textContent = 'Audio off'; sound.disabled = true
  const stop = document.createElement('button'); stop.textContent = 'Stop view'
  controls.append(start, sound, stop); main.append(controls, video)
  async function disconnect() {
    clearTimeout(expiry); await room?.disconnect(); room = null
    video.srcObject = null; video.muted = true; sound.textContent = 'Audio off'; sound.disabled = true
    status('Local monitor stopped. Monitoring records nothing.')
  }
  start.onclick = async () => {
    try {
      await disconnect()
      const stream = new MediaStream(); video.srcObject = stream
      const result = await connect('viewer', track => {
        for (const old of stream.getTracks()) if (old.kind === track.mediaStreamTrack.kind) stream.removeTrack(old)
        stream.addTrack(track.mediaStreamTrack); video.play().catch(() => {})
      })
      room = result.room; sound.disabled = false
      room.on('trackUnsubscribed', track => stream.removeTrack(track.mediaStreamTrack))
      expiry = setTimeout(() => void disconnect(), 120_000)
      status('Authoritative outgoing Program / local synthetic test / expires in 2 minutes')
    } catch (error) { status(error.message) }
  }
  sound.onclick = () => { video.muted = !video.muted; sound.textContent = video.muted ? 'Audio off' : 'Audio on'; video.play().catch(() => {}) }
  stop.onclick = () => void disconnect()
  document.addEventListener('visibilitychange', () => { if (document.hidden) void disconnect() })
  window.addEventListener('pagehide', () => void disconnect())
  status('Program monitor ready. Start explicitly; audio is off by default. No recording.')
}
