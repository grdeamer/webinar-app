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
  const pages = (manifest.data ?? []).map(page => [page.title, "Edit page content and appearance", unavailable ? "Unavailable" : publicationStatus(documents.data?.find(row => row.page_key === page.page_key), page.status), page.page_key])
  const publishedCount = pages.filter(page => page[2] === "Published" || page[2] === "Unpublished changes").length

  return <div className="space-y-6 text-white">
    <header className="flex flex-col gap-5 border-b border-[#273348] pb-7 lg:flex-row lg:items-end lg:justify-between">
      <div><div className="editorial-eyebrow">Event &nbsp;/&nbsp; Experience</div><h1 className="editorial-title mt-5">Experience Studio</h1><p className="mt-3 text-base text-white/55">Build and publish the attendee-facing event site.</p></div>
      <div className="flex gap-2"><Link href={`/admin/page-editor/event/${event.slug}?mode=preview&page=event_home`} target="_blank" className="rounded-xl bg-[#3974df] px-4 py-2.5 text-sm font-semibold">Preview site →</Link><Link href={`/admin/page-editor/event/${event.slug}?mode=edit&page=event_home`} className="rounded-xl bg-[#6750d3] px-4 py-2.5 text-sm font-semibold">Edit experience →</Link></div>
    </header>
    <section className="flex flex-col gap-3 rounded-2xl border border-[#273348] bg-[#0d1422] p-5 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-xl font-semibold">Published experience</h2><p className="mt-1 text-xs text-[#9aa6bb]">{unavailable ? "Publication status could not be loaded." : `${publishedCount} published pages · ${pages.length} total pages`}</p></div><span className="w-fit rounded-full border border-[#68758c] px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#c5cfdf]">{unavailable ? "Unavailable" : publishedCount ? "Published pages available" : "Not published"}</span></section>
    <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_382px]">
      <div className="rounded-2xl border border-[#273348] bg-[#070c16] p-5"><div className="flex items-center justify-between"><h2 className="text-xl font-semibold">Pages and moments</h2><Link href={`/admin/page-editor/event/${event.slug}?mode=edit`} className="text-xs text-[#9aa6bb]">Manage pages →</Link></div><div className="mt-4 space-y-3"><Link href={`/admin/page-editor/event/${event.slug}?mode=edit&page=event_home&screen=hold`} className="flex items-center justify-between gap-4 rounded-xl bg-[#1a2231] p-3 transition hover:bg-[#222c3d]"><div><div className="text-sm font-medium">Hold screen</div><div className="mt-1 text-xs text-[#9aa6bb]">Logo, message, and appearance while the event is closed</div></div><span className="text-xs text-violet-200">Edit →</span></Link>{pages.map(([name, detail, status, pageKey]) => <Link key={name} href={`/admin/page-editor/event/${event.slug}?mode=edit&page=${pageKey}`} className="flex items-center justify-between gap-4 rounded-xl bg-[#1a2231] p-3 transition hover:bg-[#222c3d]"><div><div className="text-sm font-medium">{name}</div><div className="mt-1 text-xs text-[#9aa6bb]">{detail}</div></div><span className={`rounded-full border px-2 py-1 text-[9px] font-semibold uppercase tracking-wider ${status === "Published" ? "border-[#54e5a5] text-[#54e5a5]" : "border-[#68758c] text-[#9aa6bb]"}`}>● {status}</span></Link>)}</div></div>
      <div className="rounded-2xl border border-[#273348] bg-[#0d1422] p-5"><h2 className="text-xl font-semibold">Review your experience</h2><p className="mt-4 text-sm text-[#9aa6bb]">Open the editor preview to review draft content. The attendee site shows published content only.</p><Link href={`/admin/page-editor/event/${event.slug}?mode=preview&page=event_home`} className="mt-5 inline-flex rounded-xl bg-[#6750d3] px-5 py-3 text-sm font-semibold">Preview draft →</Link><Link href={`/events/${event.slug}`} target="_blank" className="mt-4 block text-sm text-[#9aa6bb]">Open attendee site →</Link></div>
    </section>
  </div>
}
