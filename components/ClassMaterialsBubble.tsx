"use client"

import * as React from "react"
import { AnimatePresence, motion } from "framer-motion"

export type Material = {
  label: string
  url: string
  kind?: "pdf" | "pptx" | "docx" | "zip" | "link"
}

function KindPill({ kind }: { kind?: Material["kind"] }) {
  const text = (kind ?? "file").toUpperCase()
  return (
    <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] tracking-wide text-white/75">
      {text}
    </span>
  )
}

export function ClassMaterialsBubble({
  materials,
  label = "Class materials",
}: {
  materials: Material[]
  label?: string
}) {
  const [open, setOpen] = React.useState(false)

  const safeMaterials = (materials ?? []).filter(
    (m) => m && typeof m.url === "string" && m.url.length > 0
  )

  const disabled = safeMaterials.length === 0

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        aria-expanded={open}
        aria-controls="materials-bubble"
        className={[
          "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm transition",
          disabled
            ? "bg-white/5 text-white/40 cursor-not-allowed"
            : "bg-white/10 text-white hover:bg-white/15",
        ].join(" ")}
      >
        {label}
        <span className="text-white/60">{open ? "▲" : "▼"}</span>
      </button>

      <AnimatePresence>
        {open && !disabled && (
          <motion.div
            id="materials-bubble"
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 6 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className="absolute left-0 z-20 mt-3 w-[340px] origin-top-left"
          >
            <div className="relative rounded-3xl border border-white/10 bg-slate-950/95 p-4 shadow-xl backdrop-blur">
              {/* thought-bubble tail */}
              <div className="absolute -top-2 left-7 flex items-center gap-1">
                <span className="h-3 w-3 rounded-full border border-white/10 bg-slate-950/95" />
                <span className="h-2 w-2 rounded-full border border-white/10 bg-slate-950/95" />
                <span className="h-1.5 w-1.5 rounded-full border border-white/10 bg-slate-950/95" />
              </div>

              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-white">
                    Class materials
                  </div>
                  <div className="text-xs text-white/60">
                    Click to download (opens new tab)
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-xl bg-white/10 px-3 py-1.5 text-xs text-white/80 hover:bg-white/15 transition"
                >
                  Close
                </button>
              </div>

              <div className="mt-3 space-y-2">
                {safeMaterials.map((m) => (
                  <a
                    key={m.url}
                    href={m.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 hover:bg-white/10 transition"
                    title={m.label}
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm text-white/90">
                        {m.label}
                      </div>
                      <div className="truncate text-[11px] text-white/50">
                        {m.url}
                      </div>
                    </div>
                    <KindPill kind={m.kind} />
                  </a>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}