"use client"

import { useEffect } from "react"

export default function Modal({
  open,
  title,
  onClose,
  children,
  widthClass = "max-w-2xl",
}: {
  open: boolean
  title?: string
  onClose: () => void
  children: React.ReactNode
  widthClass?: string
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60]">
      {/* Backdrop */}
      <button
        aria-label="Close modal"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      {/* Panel */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          className={[
            "w-full",
            widthClass,
            "rounded-3xl border border-white/10 bg-slate-950/80 backdrop-blur-xl",
            "shadow-2xl shadow-black/50",
            "animate-[modalIn_.18s_ease-out]",
          ].join(" ")}
        >
          <div className="flex items-center justify-between gap-3 border-b border-white/10 px-6 py-4">
            <div className="min-w-0">
              {title ? (
                <div className="truncate text-lg font-semibold">{title}</div>
              ) : null}
            </div>
            <button
              onClick={onClose}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10 transition"
            >
              Close
            </button>
          </div>

          <div className="px-6 py-5">{children}</div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes modalIn {
          from {
            opacity: 0;
            transform: translateY(8px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  )
}