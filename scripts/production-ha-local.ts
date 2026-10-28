import { mkdirSync, openSync, closeSync, writeFileSync, unlinkSync } from 'node:fs'
import { createServer } from 'node:http'
import { resolve } from 'node:path'
import { LocalHaRuntime } from '../lib/production/localHaRuntime.ts'

process.umask(0o077)
const receiverArg = process.argv.find(x => x.startsWith('--receivers='))
const receivers = receiverArg ? Number(receiverArg.split('=')[1]) : 1
if (![1, 3, 5, 10].includes(receivers)) throw new Error('Unsupported receiver count')
const baseDirectory = resolve(import.meta.dirname, '../.local/production/ha')
const directory = receivers > 1 ? resolve(baseDirectory, 'load-runtime') : baseDirectory
mkdirSync(directory, { recursive: true, mode: 0o700 })
const lockPath = resolve(baseDirectory, 'runtime.lock'), lock = openSync(lockPath, 'wx', 0o600)
writeFileSync(lock, String(process.pid)); closeSync(lock)
const soak = process.argv.includes('--soak-60')
const runtime = new LocalHaRuntime(directory, { soak, receivers, controlKey: process.env.JUPITER_LOCAL_SOAK_CONTROL_KEY })
const server = createServer((request, response) => void runtime.handle(request, response))
server.requestTimeout = 5000
let closing = false
async function close() { if (closing) return; closing = true; await runtime.stop(); server.closeAllConnections(); server.close(() => { runtime.store.close(); unlinkSync(lockPath) }) }
server.on('error', error => { console.error(error.message.replace(/#[a-f0-9]{64}/g, '#[redacted]')); process.exitCode = 1; void close() })
server.listen(4311, '127.0.0.1', () => {
  console.log(`Jupiter local HA lab: http://127.0.0.1:4311/ — synthetic, ${soak ? 'managed soak / 65-minute hard limit' : 'ten-minute bound'}, no cloud or recording`)
  runtime.start().catch(error => { console.error(error.message.replace(/#[a-f0-9]{64}/g, '#[redacted]')); process.exitCode = 1; void close() })
})
process.once('SIGINT', () => void close()); process.once('SIGTERM', () => void close())
