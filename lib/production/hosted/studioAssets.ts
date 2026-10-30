import 'server-only'
import { mediaConnectSources } from './transportPolicy.ts'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
const files: Record<string, [string, string]> = {
  '/studio': ['producer.html', 'text/html'], '/producer-room.js': ['producer-room.js', 'text/javascript'], '/producer-input.js': ['producer-input.js', 'text/javascript'], '/file-capture.js': ['file-capture.js', 'text/javascript'], '/producer.css': ['producer.css', 'text/css'], '/style.css': ['style.css', 'text/css'],
  ...Object.fromEntries(['common.js', 'frame-clock.js', 'assets.js', 'scene-renderer.js', 'layout.js', 'marker.js'].map(name => [`/runtime/${name}`, [`runtime/${name}`, 'text/javascript'] as [string, string]])), '/runtime/assets/brand.svg': ['runtime/assets/brand.svg', 'image/svg+xml'],
}
export function readStudioAsset(path: string, root: string) {
  const file = files[path]
  if (!file && path !== '/vendor/livekit-client.js') return new Response('Not found', { status: 404 })
  let body = readFileSync(path === '/vendor/livekit-client.js' ? resolve(process.cwd(), 'node_modules/livekit-client/dist/livekit-client.umd.js') : resolve(process.cwd(), 'tools/production-local', file[0]), 'utf8')
  if (path === '/studio') body = body.replace('<html lang="en">', `<html lang="en" data-api-root="${root}">`).replaceAll('href="/', `href="${root}/`).replaceAll('src="/', `src="${root}/`).replace('Private media stays on this Mac. No Zoom rooms, cloud services or deployments.', 'Encrypted media is relayed through the hosted rehearsal worker. This rehearsal does not send to Zoom rooms. No recording or persistent media storage.').replaceAll('Local rehearsal', 'Hosted rehearsal').replaceAll('Local producer room', 'Hosted producer room').replace('Local only · recording disabled', 'Hosted rehearsal · recording disabled').replaceAll('saved locally', 'saved for this rehearsal').replace('Same-Mac tests do not prove Internet delivery or whole-host recovery.', 'This rehearsal measures Internet delivery; compositors share one worker host. Whole-host recovery is not provided.')
  const mediaSources = mediaConnectSources(process.env.LIVEKIT_URL)
  return new Response(body, { headers: { 'Content-Type': `${file?.[1] ?? 'text/javascript'}; charset=utf-8`, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...(path === '/studio' ? { 'Content-Security-Policy': `default-src 'self'; script-src 'self'; connect-src 'self' ${mediaSources}; media-src 'self' blob:; img-src 'self' blob:; style-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'`, 'Permissions-Policy': 'camera=(self), microphone=(self), display-capture=(self)' } : {}) } })
}
