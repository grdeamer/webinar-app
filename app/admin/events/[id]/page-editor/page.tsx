import { publicationStatus } from "@/lib/page-editor/pageSafety"
import { notFound } from "next/navigation"
import Link from "next/link"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { requireEventPageFeature } from "@/lib/eventTeamAccess"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export default async function EventPageEditorPage(props: {
  params: Promise<{ id: string }>
}) {
  const { id } = await props.params
  await requireEventPageFeature(id, "experience")

  const { data: event } = await supabaseAdmin
    .from("events")
    .select("id, slug, title, updated_at")
    .eq("id", id)
    .single()

  if (!event?.slug) {
    notFound()
  }

  const [documents, manifest] = await Promise.all([
    supabaseAdmin.from("event_page_sections").select("page_key,published_document,document_revision").eq("event_id", id),
    supabaseAdmin.from("event_page_manifest").select("page_key,title,status").eq("event_id", id).order("position"),
  ])
  const unavailable = Boolean(documents.error || manifest.error)
  const documentsByPage = new Map(documents.data?.map((row) => [row.page_key, row]))
  const pages = (manifest.data ?? []).map((page) => ({
    key: page.page_key,
    title: page.title,
    status: unavailable ? "Unavailable" : publicationStatus(documentsByPage.get(page.page_key), page.status),
  }))
  const publishedCount = pages.filter(({ status }) => status === "Published" || status === "Unpublished changes").length
  const editor = `/admin/page-editor/event/${event.slug}`
  const focus = "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--jv1-focus)]"

  return (
    <div className="space-y-8 text-[var(--site-ink,var(--jv1-text))]">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--site-line,var(--jv1-border-strong))] pb-5">
        <h1 className="text-3xl font-semibold tracking-tight">Event site</h1>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Link href={`${editor}?mode=preview&page=event_home`} target="_blank" rel="noopener noreferrer" className={`rounded-md px-3 py-2 underline-offset-4 hover:underline ${focus}`}>Preview draft ↗</Link>
          <Link href={`/events/${event.slug}`} target="_blank" rel="noopener noreferrer" className={`rounded-md px-3 py-2 underline-offset-4 hover:underline ${focus}`}>Open attendee site ↗</Link>
          <Link href={`${editor}?mode=edit&page=event_home`} className={`rounded-md bg-[#6750d3] px-3 py-2 font-semibold !text-white hover:bg-[#5944bb] ${focus}`}>Open Page Builder</Link>
        </div>
      </header>

      <section aria-labelledby="site-pages">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 pb-3">
          <h2 id="site-pages" className="text-lg font-semibold">Site pages</h2>
          <p className="text-sm tabular-nums text-[var(--site-muted,var(--jv1-secondary))]">
            {unavailable ? "Publication status unavailable" : `${publishedCount} of ${pages.length} published`}
          </p>
        </div>
        {pages.length ? (
          <ul className="divide-y divide-[var(--site-line,var(--jv1-border-strong))] border-y border-[var(--site-line,var(--jv1-border-strong))]">
            {pages.map(({ key, title, status }) => (
              <li key={key}>
                <Link href={`${editor}?mode=edit&page=${encodeURIComponent(key)}`}
                  className={`grid min-h-12 grid-cols-[minmax(0,1fr)_minmax(0,9rem)_1rem] items-center gap-3 px-2 py-2.5 text-sm hover:bg-[var(--site-selected,var(--jv1-subtle))] sm:grid-cols-[minmax(0,1fr)_11rem_3rem] sm:px-3 ${focus}`}>
                  <span className="break-words font-medium">{title}</span>
                  <span className={status === "Published" ? "font-medium" : "text-[var(--site-muted,var(--jv1-secondary))]"}>{status}</span>
                  <span aria-hidden="true" className="justify-self-end text-[var(--site-muted,var(--jv1-secondary))]">→</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : <p className="border-t border-[var(--site-line,var(--jv1-border-strong))] py-4 text-sm text-[var(--site-muted,var(--jv1-secondary))]">{unavailable ? "Pages could not be loaded." : "No site pages yet."}</p>}
      </section>

      <section aria-labelledby="site-screens">
        <h2 id="site-screens" className="pb-3 text-lg font-semibold">Event screens</h2>
        <Link href={`${editor}?mode=edit&page=event_home&screen=hold`}
          className={`flex min-h-12 items-center justify-between gap-3 border-y border-[var(--site-line,var(--jv1-border-strong))] px-2 py-3 text-sm hover:bg-[var(--site-selected,var(--jv1-subtle))] sm:px-3 ${focus}`}>
          <span className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <span className="font-medium">Hold screen</span>
            <span className="text-[var(--site-muted,var(--jv1-secondary))]">Shown while event access is closed</span>
          </span>
          <span aria-hidden="true" className="shrink-0 text-[var(--site-muted,var(--jv1-secondary))]">→</span>
        </Link>
      </section>
    </div>
  )
}
