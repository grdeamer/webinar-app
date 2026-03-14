import Link from "next/link"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const editorCards = [
  {
    title: "Event Page",
    body: "Edit the branded event landing page experience.",
    href: "/admin/page-editor/event",
  },
  {
    title: "Sessions Page",
    body: "Edit the sessions landing page look and layout.",
    href: "/admin/page-editor/sessions",
  },
  {
    title: "General Session Page",
    body: "Edit the live general session page and player layout.",
    href: "/admin/page-editor/general-session",
  },
]

export default function AdminPageEditorIndexPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
        <div className="text-sm uppercase tracking-[0.22em] text-white/40">Page Editor</div>
        <h1 className="mt-2 text-3xl font-bold">Page Editor</h1>
        <p className="mt-3 max-w-3xl text-white/70">
          Open a visual editing area for your event page, sessions page, or general session page.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {editorCards.map((card) => (
          <Link
            key={card.title}
            href={card.href}
            className="rounded-3xl border border-white/10 bg-white/5 p-6 transition hover:bg-white/10"
          >
            <div className="text-xl font-semibold">{card.title}</div>
            <p className="mt-3 text-sm leading-6 text-white/65">{card.body}</p>
            <div className="mt-6 text-sm font-medium text-indigo-300">Open editor →</div>
          </Link>
        ))}
      </div>
    </div>
  )
}