/** Allow the configured SFU and its documented same-project regional endpoints. */
export function mediaHostAllowed(host: string, configured?: string) {
  if (host === '127.0.0.1') return true
  if (!configured) return false
  const expected = new URL(configured).hostname
  if (host === expected) return true
  if (!expected.endsWith('.livekit.cloud')) return false
  const project = expected.split('.')[0]
  return host.startsWith(project + '.') && host.endsWith('.livekit.cloud')
}
export function mediaConnectSources(configured?: string) {
  if (!configured) return ''
  const url = new URL(configured)
  if (url.protocol !== 'wss:' || url.username || url.password) throw new Error('Secure SFU origin required')
  return `${url.origin} ${url.origin.replace('wss:', 'https:')}${url.hostname.endsWith('.livekit.cloud') ? ' wss://*.livekit.cloud https://*.livekit.cloud' : ''}`
}
