import { status, health } from './common.js'
import { runGateway } from './ha-gateway.js'
import { runHaObserver } from './ha-observer.js'
import { runSource } from './source.js'
import { runCompositor } from './compositor.js'
window.localHaVideo = { width: 1920, height: 1080, fps: 30, codec: 'h264', maxBitrate: 6_000_000 }
const role = location.pathname.split('/').at(-1)
try {
  if (role === 'gateway') await runGateway()
  else if (role === 'ha-observer' || role.startsWith('ha-load-')) await runHaObserver()
  else if (role.startsWith('source-')) await runSource(role)
  else { window.localHaCandidate = role; await runCompositor() }
} catch (error) { health.error = error.message; status(error.message) }
