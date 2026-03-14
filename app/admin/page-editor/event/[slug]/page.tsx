"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useState } from "react"

export default function AdminEventPageEditorPreview() {
  const params = useParams()
  const slug = String(params.slug ?? "")
  const [isEditing, setIsEditing] = useState(false)

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="border-b border-white/10 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <div className="text-xs uppercase tracking-[0.22em] text-white/40">
              Page Editor Preview
            </div>
            <h1 className="mt-1 text-2xl font-bold">Event Page</h1>
            <div className="mt-1 text-xs text-white/50">
              /admin/page-editor/event/{slug}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/page-editor/event"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10"
            >
              Back
            </Link>

            <button
              onClick={() => setIsEditing((v) => !v)}
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950"
            >
              {isEditing ? "Close Editor" : "Edit Page"}
            </button>
          </div>
        </div>
      </div>

      <div className="relative flex min-h-[calc(100vh-81px)]">
        <div className="flex-1 overflow-auto">
          <div className="mx-auto max-w-6xl px-6 py-10">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-10">
              <div className="text-sm uppercase tracking-[0.22em] text-white/40">
                Event Preview Canvas
              </div>

              <h2 className="mt-3 text-4xl font-bold">Current Event Page</h2>

              <p className="mt-4 max-w-2xl text-white/70">
                This is the real event page loaded inside the editor canvas.
              </p>

              <div className="mt-8 relative h-[800px] w-full overflow-hidden rounded-2xl border border-white/10 bg-black">
                <iframe
                  src={`/events/${slug}`}
                  title="Event preview"
                  className={`absolute inset-0 h-full w-full ${isEditing ? "pointer-events-none" : ""}`}
                />

                <div className="absolute left-24 top-24 rounded-xl bg-amber-400 px-4 py-2 text-sm font-medium text-black shadow-lg">
                  Sample Text Block
                </div>

                {isEditing ? (
                  <div className="pointer-events-none absolute left-4 top-4 rounded-lg bg-black/70 px-3 py-2 text-xs text-white/80">
                    Edit mode: preview locked
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <aside
          className={`border-l border-white/10 bg-slate-950/95 backdrop-blur-xl transition-all duration-300 ${
            isEditing ? "w-[380px] opacity-100" : "w-0 overflow-hidden opacity-0"
          }`}
        >
          <div className="w-[380px] p-6">
            <div className="text-xs uppercase tracking-[0.22em] text-white/40">
              Editor Panel
            </div>

            <h3 className="mt-2 text-xl font-semibold">Edit Event Page</h3>

            <p className="mt-2 text-sm text-white/65">
              This right-side drawer will become your visual controls panel.
            </p>

            <div className="mt-6 space-y-4">
              <button className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left hover:bg-white/10">
                Colors
              </button>
              <button className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left hover:bg-white/10">
                Background
              </button>
              <button className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left hover:bg-white/10">
                Header
              </button>
              <button className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left hover:bg-white/10">
                Hero
              </button>
              <button className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left hover:bg-white/10">
                Add Element
              </button>
            </div>

            <button className="mt-8 w-full rounded-xl bg-emerald-600 px-4 py-3 font-semibold hover:bg-emerald-500">
              Save
            </button>
          </div>
        </aside>
      </div>
    </div>
  )
}