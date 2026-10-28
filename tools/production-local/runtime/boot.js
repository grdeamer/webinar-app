import { health, status } from './common.js'
import { runSource } from './source.js'
import { runCompositor } from './compositor.js'
import { runObserver } from './observer.js'
import { runViewer } from './viewer.js'

async function start() {
  const role = location.pathname.split('/').at(-1)
  if (role === 'source-a' || role === 'source-b') await runSource(role)
  else if (role === 'renderer') await runCompositor()
  else if (role === 'observer') await runObserver()
  else await runViewer()
}
start().catch(error => { health.error = error.message; status(`Local media error: ${error.message}`) })
