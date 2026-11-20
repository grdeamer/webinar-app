import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { telescopeRelease } from "@/lib/telescope-download"

const privateHeaders = { "Cache-Control": "private, no-store" }

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.is_anonymous) {
    return Response.json({ error: "Sign in to download Telescope." }, { status: 401, headers: privateHeaders })
  }

  const storage = supabaseAdmin.storage.from(telescopeRelease.bucket)
  const { data, error } = await storage.createSignedUrls([...telescopeRelease.parts], 120)
  if (error || !data || data.length !== telescopeRelease.parts.length || data.some((part) => !part.signedUrl)) {
    return Response.json({ error: "Telescope is temporarily unavailable." }, { status: 503, headers: privateHeaders })
  }

  // Keep storage URLs server-side and stream the package parts in order.
  const responses = await Promise.all(data.map((part) =>
    fetch(part.signedUrl, { cache: "no-store", signal: request.signal }).catch((): null => null)
  ))
  const bodies = responses.map((response) => response?.ok ? response.body : null)
  if (bodies.some((body) => body === null)) {
    await Promise.allSettled(responses.map((response) => response?.body?.cancel()))
    return Response.json({ error: "Telescope is temporarily unavailable." }, { status: 503, headers: privateHeaders })
  }

  const readers = bodies.flatMap((body) => body ? [body.getReader()] : [])
  let part = 0
  const packageStream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      while (part < readers.length) {
        const { done, value } = await readers[part].read()
        if (!done) {
          controller.enqueue(value)
          return
        }
        part += 1
      }
      controller.close()
    },
    async cancel(reason) {
      await Promise.allSettled(readers.map((reader) => reader.cancel(reason)))
    },
  })
  return new Response(packageStream, {
    headers: {
      ...privateHeaders,
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${telescopeRelease.filename}"`,
      "X-Content-Type-Options": "nosniff",
    },
  })
}
