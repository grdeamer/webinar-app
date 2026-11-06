import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
export async function GET(request: Request, { params }: { params: Promise<{ kind: string }> }) {
  if (process.env.NODE_ENV !== 'development' || !['localhost','127.0.0.1'].includes(new URL(request.url).hostname)) return new Response(null,{status:404})
  const { kind } = await params
  const fixture = kind === 'video' ? ['.local/original-room-hour/Soak 1080p30.mp4','video/mp4'] : kind === 'slides' ? ['tools/production-local/runtime/assets/deck.pdf','application/pdf'] : null
  if (!fixture) return new Response(null,{status:404})
  return new Response(await readFile(resolve(process.cwd(),fixture[0])),{headers:{'Content-Type':fixture[1],'Cache-Control':'no-store'}})
}
