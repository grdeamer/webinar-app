import Link from "next/link"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export default function AdminGeneralSessionPageEditorPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
        <div className="text-sm uppercase tracking-[0.22em] text-white/40">Page Editor</div>
        <h1 className="mt-2 text-3xl font-bold">General Session Page Preview</h1>
        <p className="mt-3 max-w-3xl text-white/70">
          Open the current general session experience in a dedicated preview tab.
        </p>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="text-lg font-semibold">General Session</div>
        <p className="mt-3 text-sm leading-6 text-white/65">
          Preview the current general session page and prepare for the upcoming visual editor.
        </p>

        <div className="mt-6 flex gap-3">
          <Link
            href="/general-session"
            target="_blank"
            className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950"
          >
            Open Preview
          </Link>

          <Link
            href="/admin/general-session"
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10"
          >
            General Session Admin
          </Link>
        </div>
      </div>
    </div>
  )
}