"use client"

import { ChevronDown, ChevronUp } from "lucide-react"
import { useState } from "react"
import { EDITOR_PAGES } from "./editorPages"

export default function PageFilmstrip({
  selectedPageKey,
  onSelectPage,
}: {
  selectedPageKey: string
  onSelectPage: (pageKey: string) => void
}) {
  const [showAllPages, setShowAllPages] = useState(false)
  const visiblePages = showAllPages ? EDITOR_PAGES : EDITOR_PAGES.slice(0, 5)

  return (
    <div className="shrink-0 border-t border-white/[0.07] bg-[#080b13]/98 px-4 py-3 shadow-[0_-16px_36px_rgba(0,0,0,0.22)]">
      <div className="flex items-stretch gap-3 overflow-x-auto pb-1">
        {visiblePages.map((page, index) => {
          const selected = selectedPageKey === page.value
          return (
            <button
              key={page.value}
              type="button"
              aria-current={selected ? "page" : undefined}
              onClick={() => onSelectPage(page.value)}
              className="group w-40 shrink-0 text-left"
            >
              <div className={`relative aspect-[16/8.5] overflow-hidden rounded-lg border bg-[#101727] transition ${
                selected
                  ? "border-violet-400 ring-2 ring-violet-400/35"
                  : "border-white/10 group-hover:border-white/28"
              }`}>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_80%,rgba(124,92,255,0.34),transparent_38%),linear-gradient(145deg,#07111f,#101326)]" />
                <div className="absolute left-3 top-3 h-1.5 w-10 rounded-full bg-white/18" />
                <div className="absolute left-3 top-7 h-2 w-20 rounded-full bg-white/72" />
                <div className="absolute left-3 top-11 h-1 w-16 rounded-full bg-white/18" />
                <span className="absolute left-2 top-2 flex h-5 min-w-5 items-center justify-center rounded-md bg-black/70 px-1.5 text-[9px] font-bold text-white/70">
                  {index + 1}
                </span>
              </div>
              <div className="mt-1.5 truncate text-center text-[11px] font-semibold text-white/64 group-hover:text-white">
                {page.label}
              </div>
            </button>
          )
        })}
        <button
          type="button"
          aria-expanded={showAllPages}
          onClick={() => setShowAllPages((current) => !current)}
          className="flex aspect-[16/8.5] w-32 shrink-0 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-white/16 bg-white/[0.025] text-white/40 transition hover:border-violet-300/40 hover:bg-violet-400/[0.07] hover:text-violet-100"
          aria-label={showAllPages ? "Show primary pages" : "Show all pages"}
        >
          {showAllPages ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          <span className="text-[10px] font-semibold">{showAllPages ? "Show less" : "All pages"}</span>
        </button>
      </div>
    </div>
  )
}
