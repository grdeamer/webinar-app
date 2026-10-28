import { ProgramPlayer } from './program-player.js'

const video = document.getElementById('audience-video'), status = document.getElementById('audience-status'), sound = document.getElementById('audience-audio')
const names = { idle: 'Ready', stopped: 'Preview stopped', expired: 'Preview expired; start again to watch', legacy: 'Legacy delivery selected. This local preview is disconnected.', waiting: 'Waiting for finished Program', stalled: 'Program stalled; waiting for recovery', live: 'Receiving finished Program' }
const player = new ProgramPlayer(video, info => {
  status.textContent = names[info.state] || info.state
  document.getElementById('audience-evidence').textContent = info.publisherIdentity ? `${info.publisherIdentity} / ${info.width} × ${info.height} / one finished Program video + mixed audio` : 'No source-room subscription'
  sound.textContent = video.muted ? 'Audio off' : 'Audio on'
})
document.getElementById('audience-start').onclick = () => void player.start()
document.getElementById('audience-stop').onclick = () => void player.stop()
sound.onclick = () => { video.muted = !video.muted; sound.textContent = video.muted ? 'Audio off' : 'Audio on'; video.play().catch(() => {}) }
document.addEventListener('visibilitychange', () => { if (document.hidden) void player.stop() })
window.addEventListener('pagehide', () => void player.stop())
