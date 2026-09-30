"use client"

import { FileText, Palette, Plus } from "lucide-react"
import type { EventPageSection } from "@/lib/page-editor/sectionTypes"
import type { EditorPageManifestItem } from "./PageFilmstrip"
import type { EditorToolPanel } from "./EditorToolDock"

type Props = {
  pages: EditorPageManifestItem[]
  selectedPageKey: string
  sections: EventPageSection[]
  selectedSectionId: string | null
  onSelectPage: (key: string) => void
  onSelectSection: (section: EventPageSection) => void
  onAddContent: () => void
  onAddPage: () => void
  onRenamePage: (page: EditorPageManifestItem) => void
  onDuplicatePage: (page: EditorPageManifestItem) => void
  onDeletePage: (page: EditorPageManifestItem) => void
  onReorderPages: (pages: EditorPageManifestItem[]) => void
  onOpenTool: (tool: EditorToolPanel) => void
}

const CONTROL = "rounded-lg px-3 py-2 text-left text-xs text-white/65 transition hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300/60"

export default function ExperienceJourneySidebar(props: Props) {
  const page = props.pages.find((item) => item.pageKey === props.selectedPageKey)
  const index = props.pages.findIndex((item) => item.pageKey === props.selectedPageKey)
  function movePage(offset: number) {
    const next = [...props.pages]
    const destination = index + offset
    if (index < 0 || destination < 0 || destination >= next.length) return
    const [moved] = next.splice(index, 1)
    next.splice(destination, 0, moved)
    props.onReorderPages(next)
  }
  return (
    <aside aria-label="Attendee journey" className="w-full shrink-0 border-b border-white/[0.07] bg-[#080b13] p-3 lg:w-[210px] lg:overflow-y-auto lg:border-r lg:border-b-0">
      <div className="mb-3 flex items-center justify-between px-2"><h2 className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">Attendee journey</h2><button type="button" onClick={props.onAddPage} aria-label="Add page" className={CONTROL}><Plus className="h-4 w-4" /></button></div>
      <nav aria-label="Experience pages" className="flex flex-wrap gap-1 lg:flex-col">
        {props.pages.map((item) => <button key={item.pageKey} type="button" aria-current={item.pageKey === props.selectedPageKey ? "page" : undefined} onClick={() => props.onSelectPage(item.pageKey)} className={`${CONTROL} flex min-w-0 items-center gap-2 ${item.pageKey === props.selectedPageKey ? "bg-violet-500/15 text-violet-100 shadow-[inset_2px_0_0_#8b5cf6]" : ""}`}><FileText aria-hidden="true" className="h-4 w-4 shrink-0" /><span className="break-words">{item.title}</span></button>)}
      </nav>
      {page ? <details className="mt-3 border-t border-white/[0.07] pt-3"><summary className={`${CONTROL} cursor-pointer`}>Manage page</summary><div className="mt-1 grid gap-1">
        <button type="button" className={CONTROL} onClick={() => props.onRenamePage(page)}>Rename</button><button type="button" className={CONTROL} onClick={() => props.onDuplicatePage(page)}>Duplicate</button>
        <button type="button" disabled={index <= 0} className={`${CONTROL} disabled:opacity-30`} onClick={() => movePage(-1)}>Move up</button><button type="button" disabled={index === props.pages.length - 1} className={`${CONTROL} disabled:opacity-30`} onClick={() => movePage(1)}>Move down</button>
        {!page.isSystem ? <button type="button" className={`${CONTROL} text-red-200`} onClick={() => props.onDeletePage(page)}>Delete page</button> : null}
      </div></details> : null}
      <div className="mt-5 border-t border-white/[0.07] pt-4"><h3 className="mb-2 px-2 text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">On this page</h3><div className="flex flex-wrap gap-1 lg:flex-col">
        {props.sections.map((section, i) => <button key={section.id} type="button" aria-pressed={props.selectedSectionId === section.id} onClick={() => props.onSelectSection(section)} className={`${CONTROL} flex gap-2 ${props.selectedSectionId === section.id ? "bg-white/[0.06] text-white" : ""}`}><span className="text-white/35">{String(i + 1).padStart(2, "0")}</span><span className="break-words">{String(section.config.adminLabel || section.config.title || section.type)}{section.config.visible === false ? " · Hidden" : ""}</span></button>)}
        {!props.sections.length ? <p className="px-2 text-xs text-white/45">Add a section to get started.</p> : null}
      </div></div>
      <div className="mt-5 grid gap-2 border-t border-white/[0.07] pt-4"><button type="button" className={`${CONTROL} flex items-center gap-2 border border-violet-300/20 bg-violet-500/10 text-violet-100`} onClick={props.onAddContent}><Plus aria-hidden="true" className="h-4 w-4" />Add content</button><button type="button" className={`${CONTROL} flex items-center gap-2`} onClick={() => props.onOpenTool("brand")}><Palette aria-hidden="true" className="h-4 w-4" />Brand & background</button>
        <details><summary className={`${CONTROL} cursor-pointer`}>Content tools</summary><div className="grid gap-1">{([['elements', 'Elements'], ['text', 'Text'], ['media', 'Media library'], ['apps', 'Event components'], ['design', 'Templates & layouts']] as const).map(([tool, label]) => <button type="button" key={tool} className={CONTROL} onClick={() => props.onOpenTool(tool)}>{label}</button>)}</div></details>
      </div>
    </aside>
  )
}
