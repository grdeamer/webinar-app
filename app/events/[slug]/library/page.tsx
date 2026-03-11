import { supabaseAdmin } from "@/lib/supabase/admin"
import { getEventBySlug } from "@/lib/events"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

type Item = {
  id: string
  kind: string
  title: string
  description: string | null
  url: string | null
  storage_path: string | null
}

export default async function LibraryPage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params
  const event = await getEventBySlug(slug)

  const { data, error } = await supabaseAdmin
    .from("event_library_items")
    .select("id,kind,title,description,url,storage_path")
    .eq("event_id", event.id)
    .order("sort_index", { ascending: true })
    .order("created_at", { ascending: false })

  if (error) throw new Error(error.message)
  const items = (data || []) as Item[]

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <h1 className="text-2xl font-bold">On‑demand Library</h1>
      <p className="mt-2 text-white/60">Recordings, PDFs, links, and follow-up resources.</p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {items.map((it) => (
          <div key={it.id} className="rounded-2xl border border-white/10 bg-black/20 p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="text-lg font-semibold">{it.title}</div>
              <div className="text-xs text-white/50">{it.kind}</div>
            </div>
            {it.description ? <div className="mt-2 text-sm text-white/70 whitespace-pre-wrap">{it.description}</div> : null}
            {it.url ? (
              <a className="mt-4 inline-flex rounded-xl bg-indigo-600 px-4 py-2 font-semibold hover:bg-indigo-500" href={it.url} target="_blank" rel="noreferrer">
                Open →
              </a>
            ) : (
              <div className="mt-4 text-sm text-white/50">No URL yet.</div>
            )}
          </div>
        ))}
        {items.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-black/20 p-5 text-white/60">
            No library items yet.
          </div>
        ) : null}
      </div>
    </div>
  )
}
