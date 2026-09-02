"use client"

import { ChevronDown, ChevronUp } from "lucide-react"
import { useState } from "react"
import { EDITOR_PAGES } from "./editorPages"
import type { EventPageElement, EventPageSection, EventTheme } from "@/lib/page-editor/sectionTypes"
import { getElementFrameStyle } from "@/lib/page-editor/elementPresentation"
import { getPageBackgroundStyle } from "@/lib/page-editor/themeBackground"

export type EditorPageManifestItem = { pageKey: string; title: string; isSystem: boolean }
export type PageThumbnailDocument = { elements: EventPageElement[]; sections: EventPageSection[]; eventTheme: EventTheme }

export default function PageFilmstrip({
  selectedPageKey,
  onSelectPage,
  pages,
  onAddPage,
  onRenamePage,
  onDuplicatePage,
  onDeletePage,
  onReorderPages,
  thumbnailDocuments,
  currentDocument,
}: {
  selectedPageKey: string
  onSelectPage: (pageKey: string) => void
  pages?: EditorPageManifestItem[]
  onAddPage: () => void
  onRenamePage: (page: EditorPageManifestItem) => void
  onDuplicatePage: (page: EditorPageManifestItem) => void
  onDeletePage: (page: EditorPageManifestItem) => void
  onReorderPages: (pages: EditorPageManifestItem[]) => void
  thumbnailDocuments: Record<string, PageThumbnailDocument>
  currentDocument: PageThumbnailDocument
}) {
  const [showAllPages, setShowAllPages] = useState(false)
  const [draggedKey, setDraggedKey] = useState<string | null>(null)
  const allPages = pages?.length ? pages : EDITOR_PAGES.map((page) => ({ pageKey: page.value, title: page.label, isSystem: true }))
  const visiblePages = showAllPages ? allPages : allPages.slice(0, 5)

  return (
    <div className="shrink-0 border-t border-white/[0.07] bg-[#080b13]/98 px-4 py-3 shadow-[0_-16px_36px_rgba(0,0,0,0.22)]">
      <div className="flex items-stretch gap-3 overflow-x-auto pb-1">
        {visiblePages.map((page, index) => {
          const selected = selectedPageKey === page.pageKey
          const thumbnail = selected ? currentDocument : thumbnailDocuments[page.pageKey]
          return (
            <div
              key={page.pageKey}
              draggable
              onDragStart={() => setDraggedKey(page.pageKey)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                if (!draggedKey || draggedKey === page.pageKey) return
                const next = [...allPages]
                const from = next.findIndex((item) => item.pageKey === draggedKey)
                const to = next.findIndex((item) => item.pageKey === page.pageKey)
                if (from < 0 || to < 0) return
                const [moved] = next.splice(from, 1)
                next.splice(to, 0, moved)
                onReorderPages(next)
                setDraggedKey(null)
              }}
              className="group w-40 shrink-0 text-left"
            >
              <button
                type="button"
                aria-current={selected ? "page" : undefined}
                onClick={() => onSelectPage(page.pageKey)}
                className={`relative block aspect-[16/8.5] w-full overflow-hidden rounded-lg border bg-[#101727] text-left transition ${
                selected
                  ? "border-violet-400 ring-2 ring-violet-400/35"
                  : "border-white/10 group-hover:border-white/28"
              }`}
              >
                <PageThumbnail document={thumbnail} />
                <span className="absolute left-2 top-2 flex h-5 min-w-5 items-center justify-center rounded-md bg-black/70 px-1.5 text-[9px] font-bold text-white/70">
                  {index + 1}
                </span>
              </button>
              <button type="button" onClick={() => onSelectPage(page.pageKey)} className="mt-1.5 block w-full truncate text-center text-[11px] font-semibold text-white/64 group-hover:text-white">
                {page.title}
              </button>
              <div className="mt-1 flex justify-center gap-1 opacity-0 transition group-focus-within:opacity-100 group-hover:opacity-100">
                <button type="button" onClick={() => onRenamePage(page)} className="rounded px-1.5 py-0.5 text-[9px] text-white/45 hover:bg-white/10">Rename</button>
                <button type="button" onClick={() => onDuplicatePage(page)} className="rounded px-1.5 py-0.5 text-[9px] text-white/45 hover:bg-white/10">Duplicate</button>
                {!page.isSystem ? <button type="button" onClick={() => onDeletePage(page)} className="rounded px-1.5 py-0.5 text-[9px] text-red-200/55 hover:bg-red-400/10">Delete</button> : null}
              </div>
            </div>
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
        <button type="button" onClick={onAddPage} className="flex aspect-[16/8.5] w-32 shrink-0 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-violet-300/25 bg-violet-400/[0.04] text-violet-100/60 hover:bg-violet-400/10"><span className="text-xl">+</span><span className="text-[10px] font-semibold">Add page</span></button>
      </div>
    </div>
  )
}

function PageThumbnail({ document }: { document?: PageThumbnailDocument }) {
  if (!document) return <div className="absolute inset-0 animate-pulse bg-[radial-gradient(circle_at_82%_80%,rgba(124,92,255,0.34),transparent_38%),linear-gradient(145deg,#07111f,#101326)]"><div className="absolute left-3 top-7 h-2 w-20 rounded-full bg-white/60" /></div>
  return <div className="absolute left-0 top-0 h-[680px] w-[1280px] origin-top-left overflow-hidden" style={{ transform: "scale(0.125)", ...getPageBackgroundStyle(document.eventTheme) }}>
    <div className="absolute inset-x-0 top-0 h-16 border-b border-white/10 bg-black/25" />
    {document.sections.slice(0, 8).map((section, index) => <div key={section.id} className="absolute inset-x-0 border-b border-white/5" style={{ top: 64 + index * 77, height: 77, backgroundColor: String(section.config.sectionBackgroundColor ?? (index % 2 ? "rgba(255,255,255,.025)" : "transparent")) }} />)}
    {document.elements.filter((element) => element.visible !== false).slice(0, 30).map((element) => {
      const frame = getElementFrameStyle(element)
      const isImage = element.element_type === "image" && typeof element.props?.src === "string"
      return <div key={element.id} className="absolute overflow-hidden border border-white/10 bg-white/10 text-white" style={{ ...frame, backgroundImage: isImage ? `url(${element.props?.src})` : undefined, backgroundSize: "cover", backgroundPosition: "center", fontSize: Math.max(18, Number(element.props?.fontSize ?? 22)), color: String(element.props?.textColor ?? "#fff") }}>{isImage ? null : element.content}</div>
    })}
  </div>
}
