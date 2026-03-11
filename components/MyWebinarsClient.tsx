"use client"

import { useMemo, useState } from "react"
import JoinButton from "@/components/JoinButton"
import Modal from "@/components/Modal"
import { ClassMaterialsBubble, type Material } from "@/components/ClassMaterialsBubble"

export type WebinarUIRow = {
  id: string
  title: string
  description: string | null
  webinar_date: string | null
  join_link: string | null
  tag: string | null
  agenda_pdf_url: string | null // already signed (or normal https)
  materials: Material[] | null  // already signed
  _datePretty?: string | null
  _badge?: { label: string; cls: string }
}

function fmtDateTime(iso: string | null) {
  if (!iso) return null
  const d = new Date(iso)
  if (isNaN(d.getTime())) return null
  return d.toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
}

export default function MyWebinarsClient({ webinars }: { webinars: WebinarUIRow[] }) {
  const [openDetailsId, setOpenDetailsId] = useState<string | null>(null)
  const [openMaterialsId, setOpenMaterialsId] = useState<string | null>(null)

  const byId = useMemo(() => new Map(webinars.map((w) => [w.id, w])), [webinars])

  const details = openDetailsId ? byId.get(openDetailsId) ?? null : null
  const mats = openMaterialsId ? byId.get(openMaterialsId) ?? null : null

  return (
    <>
      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
        {webinars.map((w) => {
          const badge = w._badge
          const datePretty = w._datePretty

          return (
            <div
              key={w.id}
              className="group rounded-3xl border border-white/10 bg-white/5 p-7 shadow-[0_0_0_1px_rgba(255,255,255,0.03)] hover:bg-white/7 transition"
            >
              <div className="flex items-center justify-between gap-3">
                {badge ? (
                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${badge.cls}`}>
                    {badge.label}
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-white/5 text-white/70 ring-1 ring-white/10">
                    SESSION
                  </span>
                )}

                {datePretty ? <span className="text-xs text-white/60">{datePretty}</span> : null}
              </div>

              <h3 className="mt-4 text-xl font-semibold leading-snug">{w.title}</h3>

              {w.description ? (
                <p className="mt-2 text-white/65 line-clamp-3">{w.description}</p>
              ) : (
                <p className="mt-2 text-white/45">No description provided.</p>
              )}

              {/* subtle “expand hint” on hover */}
              <div className="mt-4 text-xs text-white/45 opacity-0 group-hover:opacity-100 transition">
                Click <span className="text-white/70">Details</span> or <span className="text-white/70">Materials</span> to view without leaving the page.
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                {w.join_link ? (
                  <JoinButton webinarId={w.id} href={w.join_link} />
                ) : (
                  <button
                    disabled
                    className="inline-flex items-center justify-center rounded-xl bg-white/10 px-5 py-3 font-medium opacity-60 cursor-not-allowed"
                  >
                    No link available
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setOpenDetailsId(w.id)}
                  className="inline-flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 transition px-5 py-3 font-medium"
                >
                  Details
                </button>

                <button
                  type="button"
                  onClick={() => setOpenMaterialsId(w.id)}
                  className="inline-flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 transition px-5 py-3 font-medium"
                >
                  Materials
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* DETAILS MODAL */}
      {details ? (
        <Modal open onClose={() => setOpenDetailsId(null)} title="Session details">
          <div className="space-y-4">
            <div>
              <div className="text-lg font-semibold">{details.title}</div>
              {details.webinar_date ? (
                <div className="mt-1 text-sm text-white/60">{fmtDateTime(details.webinar_date)}</div>
              ) : null}
            </div>

            {details.description ? <p className="text-white/75 leading-relaxed">{details.description}</p> : null}

            <div className="flex flex-wrap gap-2 pt-2">
              {details.agenda_pdf_url ? (
                <a
                  href={details.agenda_pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm hover:bg-white/15 transition"
                >
                  Agenda (PDF) <span aria-hidden>↗</span>
                </a>
              ) : (
                <span className="inline-flex items-center rounded-xl bg-white/5 px-4 py-2 text-sm text-white/50 border border-white/10">
                  No agenda uploaded
                </span>
              )}

              {details.join_link ? (
                <a
                  href={details.join_link}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium hover:bg-indigo-700 transition"
                >
                  Join / Watch →
                </a>
              ) : null}
            </div>
          </div>
        </Modal>
      ) : null}

      {/* MATERIALS MODAL */}
      {mats ? (
        <Modal open onClose={() => setOpenMaterialsId(null)} title="Materials">
          <div className="space-y-4">
            <div className="text-lg font-semibold">{mats.title}</div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm text-white/70 mb-3">
                Downloads & links for this session:
              </div>

              <ClassMaterialsBubble materials={mats.materials ?? []} />

              {(mats.materials ?? []).length === 0 ? (
                <div className="mt-3 text-sm text-white/50">No materials uploaded yet.</div>
              ) : null}
            </div>

            {mats.agenda_pdf_url ? (
              <a
                href={mats.agenda_pdf_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm hover:bg-white/15 transition"
              >
                Open agenda (PDF) <span aria-hidden>↗</span>
              </a>
            ) : null}
          </div>
        </Modal>
      ) : null}
    </>
  )
}