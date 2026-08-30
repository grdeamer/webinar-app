import { notFound } from "next/navigation"
import Link from "next/link"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export default async function EventPageEditorPage(props: {
  params: Promise<{ id: string }>
}) {
  const { id } = await props.params

  const { data: event } = await supabaseAdmin
    .from("events")
    .select("id, slug, title, updated_at")
    .eq("id", id)
    .single()

  if (!event?.slug) {
    notFound()
  }

  const pages = [
    ["Event home", "Hero, countdown, featured sessions", "Published"],
    ["Agenda", "Day and track schedule", "Published"],
    ["Districts", "District selector and meeting links", "Published"],
    ["Session lobby", "Arrival and speaker information", "Published"],
    ["Resources", "Downloads and follow-up content", "Draft"],
  ]

  return <div className="space-y-6 text-white">
    <header className="flex flex-col gap-5 border-b border-[#273348] pb-7 lg:flex-row lg:items-end lg:justify-between">
      <div><div className="editorial-eyebrow">Event &nbsp;/&nbsp; Experience</div><h1 className="editorial-title mt-5">Experience Studio</h1><p className="mt-3 text-base text-white/55">Build and publish the attendee-facing event site.</p></div>
      <div className="flex gap-2"><Link href={`/events/${event.slug}`} target="_blank" className="rounded-xl bg-[#3974df] px-4 py-2.5 text-sm font-semibold">Preview site →</Link><Link href={`/admin/page-editor/event/${event.slug}`} className="rounded-xl bg-[#6750d3] px-4 py-2.5 text-sm font-semibold">Edit experience →</Link></div>
    </header>
    <section className="flex flex-col gap-3 rounded-2xl border border-[#273348] bg-[#0d1422] p-5 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-xl font-semibold">Published experience</h2><p className="mt-1 text-xs text-[#9aa6bb]">Last updated {event.updated_at ? new Date(event.updated_at).toLocaleString() : "recently"} · attendee pages live</p></div><span className="w-fit rounded-full border border-[#54e5a5] px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#54e5a5]">● Live</span></section>
    <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_382px]">
      <div className="rounded-2xl border border-[#273348] bg-[#070c16] p-5"><div className="flex items-center justify-between"><h2 className="text-xl font-semibold">Pages and moments</h2><Link href={`/admin/page-editor/event/${event.slug}`} className="text-xs text-[#9aa6bb]">Add page →</Link></div><div className="mt-4 space-y-3">{pages.map(([name, detail, status]) => <Link key={name} href={`/admin/page-editor/event/${event.slug}`} className="flex items-center justify-between gap-4 rounded-xl bg-[#1a2231] p-3 transition hover:bg-[#222c3d]"><div><div className="text-sm font-medium">{name}</div><div className="mt-1 text-xs text-[#9aa6bb]">{detail}</div></div><span className={`rounded-full border px-2 py-1 text-[9px] font-semibold uppercase tracking-wider ${status === "Published" ? "border-[#54e5a5] text-[#54e5a5]" : "border-[#68758c] text-[#9aa6bb]"}`}>● {status}</span></Link>)}</div></div>
      <div className="rounded-2xl border border-[#4f8cff] bg-[#4d3aa8] p-5"><div className="flex items-center justify-between text-xs"><span>Event home preview</span><span className="rounded-full bg-[#8cb5ff] px-2 py-1 text-[9px] font-bold text-[#030714]">DESKTOP</span></div><div className="mt-4 min-h-[350px] rounded-xl border border-[#273348] bg-[#030714] p-6"><div className="editorial-eyebrow">Jupiter · {event.title}</div><h2 className="mt-6 text-2xl font-medium">Lead what comes next.</h2><p className="mt-4 text-sm leading-6 text-[#9aa6bb]">Join peers for ideas, meaningful conversation, and connection.</p><Link href={`/events/${event.slug}`} target="_blank" className="mt-5 inline-flex rounded-xl bg-[#6750d3] px-5 py-3 text-sm font-semibold">Enter event →</Link></div><div className="editorial-eyebrow mt-4">Theme · Jupiter Night</div><p className="mt-2 text-xs text-[#9aa6bb]">Atmospheric header and restrained gradients.</p></div>
    </section>
  </div>
}
