"use client"

import { useMemo, useState } from "react"
import Modal from "@/components/Modal"
import JoinButton from "@/components/JoinButton"

export type Material = { title?: string; url: string }

export type WebinarCardData = {
  id: string
  title: string
  description?: string | null
  dateLabel?: string | null
  timeLabel?: string | null
  speaker?: string | null
  agendaUrl?: string | null
  materials?: Material[]
  joinLink?: string | null
  badgeLabel?: string // "UPCOMING" | "LIVE" | "ON-DEMAND"
}

export default function WebinarCardClient({ w }: { w: WebinarCardData }) {
  const [openDetails, setOpenDetails] = useState(false)
  const [openMaterials, setOpenMaterials] = useState(false)

  const materials = useMemo(() => w.materials ?? [], [w.materials])

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-7 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
      <div className="flex items-center justify-between gap-3">
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
          {w.badgeLabel ?? "UPCOMING"}
        </span>
        <div className="text-xs text-white/60">{w.dateLabel ?? ""}</div>
      </div>

      <h3 className="mt-4 text-xl font-semibold leading-snug">{w.title}</h3>

      {w.description ? (
        <p className="mt-2 text-white/65 line-clamp-3">{w.description}</p>
      ) : (
        <p className="mt-2 text-white/45">No description provided.</p>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        {w.joinLink ? (
          <JoinButton webinarId={w.id} href={w.joinLink} />
        ) : (
          <button
            disabled
            className="inline-flex items-center justify-center rounded-2xl bg-white/10 px-6 py-3 font-medium opacity-60 cursor-not-allowed"
          >
            No link available
          </button>
        )}

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