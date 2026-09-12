"use client"

import { useMemo, useState } from "react"
import { ChevronRight, ExternalLink, MapPinned } from "lucide-react"

export type DistrictDirectoryItem = {
  id: string
  code: string | null
  title: string
  presenter: string | null
  external_join_url: string | null
  district_parent_id: string | null
  node_type: "zone" | "region" | "district"
}

function isSafeDestination(value: string | null) {
  return !!value && /^https:\/\//i.test(value)
}

export default function DistrictDirectory({ items }: { items: DistrictDirectoryItem[] }) {
  const firstDistrict = items.find((item) => item.node_type === "district") || null
  const [selectedId, setSelectedId] = useState<string | null>(firstDistrict?.id || null)
  const selected = items.find((item) => item.id === selectedId && item.node_type === "district") || firstDistrict

  const childrenByParent = useMemo(() => {
    const ids = new Set(items.map((item) => item.id))
    const children = new Map<string | null, DistrictDirectoryItem[]>()
    for (const item of items) {
      const parentId = item.district_parent_id && ids.has(item.district_parent_id)
        ? item.district_parent_id
        : null
      children.set(parentId, [...(children.get(parentId) || []), item])
    }
    return children
  }, [items])

  function renderBranch(parentId: string | null, depth = 0, visited = new Set<string>()) {
    return (childrenByParent.get(parentId) || []).map((item) => {
      if (visited.has(item.id)) return null
      const nextVisited = new Set(visited).add(item.id)
      const children = childrenByParent.get(item.id) || []
      const isSelected = selected?.id === item.id
      return (
        <li key={item.id}>
          <button
            type="button"
            aria-pressed={isSelected}
            onClick={() => item.node_type === "district" ? setSelectedId(item.id) : undefined}
            className={`group flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition ${isSelected ? "border-violet-300/35 bg-violet-500/15 text-white" : "border-transparent text-white/68 hover:border-white/10 hover:bg-white/[.05] hover:text-white"}`}
            style={{ paddingLeft: `${12 + depth * 20}px` }}
          >
            <span className={`grid size-7 shrink-0 place-items-center rounded-lg border ${isSelected ? "border-violet-300/35 bg-violet-400/15 text-violet-100" : "border-white/10 bg-black/20 text-white/40"}`}>
              {item.node_type !== "district" ? <ChevronRight size={14} /> : <MapPinned size={14} />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{item.title}</span>
              <span className="mt-0.5 block text-[11px] uppercase tracking-[.12em] text-white/38">{item.node_type}{item.code ? ` · ${item.code}` : ""}</span>
            </span>
          </button>
          {children.length ? <ul className="mt-1 space-y-1">{renderBranch(item.id, depth + 1, nextVisited)}</ul> : null}
        </li>
      )
    })
  }

  if (!items.length) {
    return <div className="rounded-3xl border border-white/10 bg-white/[.04] p-8 text-white/60">No districts have been configured yet.</div>
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-white/10 bg-[#09111f]/90 shadow-[0_28px_80px_rgba(0,0,0,.28)]">
      <div className="border-b border-white/10 px-6 py-5">
        <div className="text-xs font-semibold uppercase tracking-[.18em] text-violet-200/70">District directory</div>
        <h2 className="mt-2 text-2xl font-semibold text-white">Choose a district</h2>
        <p className="mt-2 text-sm text-white/50">Select any district in the tree to view its destination.</p>
      </div>
      <div className="grid min-h-[340px] md:grid-cols-[minmax(260px,.8fr)_minmax(0,1.2fr)]">
        <nav aria-label="District tree" className="border-b border-white/10 p-4 md:border-b-0 md:border-r">
          <ul className="space-y-1">{renderBranch(null)}</ul>
        </nav>
        <div className="flex items-center p-6 md:p-9">
          {selected ? <div className="w-full">
            <div className="text-xs font-semibold uppercase tracking-[.16em] text-white/38">Selected district</div>
            <h3 className="mt-3 text-3xl font-semibold tracking-[-.03em] text-white">{selected.title}</h3>
            {selected.code ? <div className="mt-2 text-sm text-white/45">District code {selected.code}</div> : null}
            {selected.presenter ? <div className="mt-5 rounded-xl border border-white/8 bg-white/[.035] px-4 py-3 text-sm text-white/60">District lead <span className="font-semibold text-white/85">{selected.presenter}</span></div> : null}
            {isSafeDestination(selected.external_join_url) ? <a href={selected.external_join_url!} target="_blank" rel="noopener noreferrer" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_36px_rgba(99,102,241,.24)] hover:brightness-110">Open district link <ExternalLink size={15} /></a> : <div className="mt-7 rounded-xl border border-amber-300/15 bg-amber-400/[.06] px-4 py-3 text-sm text-amber-100/70">This district does not have a destination link yet.</div>}
          </div> : null}
        </div>
      </div>
    </section>
  )
}
