"use client"

import { useMemo, useState } from "react"
import Modal from "@/components/Modal"

type Material = { title?: string; url: string }
type Webinar = {
  id: string
  title: string
  description?: string | null
  dateLabel?: string | null
  timeLabel?: string | null
  speaker?: string | null
  agendaUrl?: string | null
  materials?: Material[]
}

export default function WebinarCard({ w }: { w: Webinar }) {
  const [openDetails, setOpenDetails] = useState(false)
  const [openMaterials, setOpenMaterials] = useState(false)

  const materials = useMemo(() => w.materials ?? [], [w.materials])

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/30">
      <div className="flex items-center justify-between">
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
          UPCOMING
        </span>
        <div className="text-xs text-white/60">{w.dateLabel ?? ""}</div>
      </div>

      <div className="mt-5 text-2xl font-semibold">{w.title}</div>
      {w.description ? (
        <div className="mt-2 text-white/70 line-clamp-2">{w.description}</div>
      ) : null}

      <div className="mt-8 flex items-center gap-3">
        <button className="rounded-2xl bg-indigo-600 hover:bg-indigo-700 transition px-6 py-3 font-medium">
          Join / Watch →
        </button>

        <button
          onClick={() => setOpenDetails(true)}
          className="rounded-2xl border border-white/10 bg-white/5 px-6 py-3 font-medium hover:bg-white/10 transition"
        >
          Details
        </button>

        <button
          onClick={() => setOpenMaterials(true)}
          className="rounded-2xl border border-white/10 bg-white/5 px-6 py-3 font-medium hover:bg-white/10 transition"
        >
          Materials
        </button>
      </div>

      {/* DETAILS MODAL */}
      <Modal open={openDetails} onClose={() => setOpenDetails(false)} title="Webinar details">
        <div className="space-y-4">
          <div className="text-xl font-semibold">{w.title}</div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs text-white/60">Time</div>
              <div className="mt-1 text-white/90">
                {w.timeLabel ?? "—"}{" "}
                {w.dateLabel ? <span className="text-white/60">• {w.dateLabel}</span> : null}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs text-white/60">Speaker</div>
              <div className="mt-1 text-white/90">{w.speaker ?? "—"}</div>
            </div>
          </div>

          {w.description ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs text-white/60">About</div>
              <div className="mt-2 text-white/80 leading-relaxed">{w.description}</div>
            </div>
          ) : null}

          {w.agendaUrl ? (
            <a
              href={w.agendaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 transition"
            >
              Open agenda PDF <span aria-hidden>↗</span>
            </a>
          ) : null}
        </div>
      </Modal>

      {/* MATERIALS MODAL */}
      <Modal
        open={openMaterials}
        onClose={() => setOpenMaterials(false)}
        title="Class materials"
        widthClass="max-w-xl"
      >
        {materials.length === 0 ? (
          <div className="text-white/70">No materials posted yet.</div>
        ) : (
          <div className="space-y-2">
            {materials.map((m, idx) => (
              <a
                key={idx}
                href={m.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 hover:bg-white/10 transition"
              >
                <div className="min-w-0">
                  <div className="truncate font-medium text-white/90">
                    {m.title || "Material"}
                  </div>
                  <div className="truncate text-xs text-white/50">{m.url}</div>
                </div>
                <span className="text-white/60">↗</span>
              </a>
            ))}
          </div>
        )}
      </Modal>
    </div>
  )
}