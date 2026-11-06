/** Next may normalize request.url to localhost; browser Origin must match Host exactly. */
export function localTransportOriginAllowed(request: Request, write = false): boolean {
  try {
    const url = new URL(request.url), host = request.headers.get('host') ?? url.host
    const target = new URL(`http://${host}`)
    if (!['localhost','127.0.0.1','[::1]'].includes(url.hostname) || !['localhost','127.0.0.1','[::1]'].includes(target.hostname)) return false
    if (request.headers.get('sec-fetch-site') === 'cross-site') return false
    const origin = request.headers.get('origin')
    if (!origin) return !write
    return origin === target.origin
  } catch { return false }
}
