"use client"

import { useMemo, useState } from "react"
import { DndContext, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core"
import { BookOpen, ChevronDown, ChevronRight, Download, ExternalLink, GripVertical, MapPinned, Network, Plus, Save, Search, Trash2, X } from "lucide-react"

export type DistrictNode = {
  id: string
  event_id: string
  code: string
  title: string
  presenter: string | null
  external_join_url: string | null
  external_platform: string | null
  district_parent_id: string | null
  session_kind: string
  sort_order: number | null
  node_type: "zone" | "region" | "district"
}

type EventRow = { id: string; slug: string; title: string; district_directory_enabled: boolean }

function TreeRow({ node, depth, expanded, selected, childCount, onExpand, onSelect }: { node: DistrictNode; depth: number; expanded: boolean; selected: boolean; childCount: number; onExpand: () => void; onSelect: () => void }) {
  const draggable = useDraggable({ id: node.id, data: { node } })
  const droppable = useDroppable({ id: node.id, data: { node } })
  const style = draggable.transform ? { transform: `translate3d(${draggable.transform.x}px, ${draggable.transform.y}px, 0)` } : undefined
  return (
    <div ref={(element) => { draggable.setNodeRef(element); droppable.setNodeRef(element) }} style={style} className={`group relative flex min-h-14 items-center gap-2 rounded-xl border px-2.5 py-2 transition ${droppable.isOver ? "border-cyan-300/60 bg-cyan-400/10" : selected ? "border-violet-300/45 bg-violet-500/15" : "border-white/[.08] bg-white/[.025] hover:bg-white/[.05]"}`}>
      <span aria-hidden="true" style={{ width: depth * 22 }} className="shrink-0" />
      <button type="button" onClick={onExpand} disabled={!childCount} className="grid size-7 shrink-0 place-items-center rounded-lg text-white/45 hover:bg-white/10 disabled:opacity-25">{childCount ? expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} /> : <span className="size-1 rounded-full bg-white/30" />}</button>
      <button type="button" onClick={onSelect} className="min-w-0 flex-1 text-left">
        <span className="flex items-center gap-2"><span className={`rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-[.13em] ${node.node_type === "zone" ? "bg-violet-500/15 text-violet-200" : node.node_type === "region" ? "bg-blue-500/15 text-blue-200" : "bg-emerald-500/12 text-emerald-200"}`}>{node.node_type}</span><strong className="truncate text-sm text-white/88">{node.title}</strong></span>
        <span className="mt-1 block text-[11px] text-white/35">{node.code}{childCount ? ` · ${childCount} ${node.node_type === "zone" ? "regions" : "districts"}` : node.external_join_url ? " · link ready" : " · link needed"}</span>
      </button>
      <button type="button" {...draggable.listeners} {...draggable.attributes} aria-label={`Move ${node.title}`} className="grid size-9 shrink-0 cursor-grab place-items-center rounded-lg text-white/25 hover:bg-white/10 hover:text-white/70 active:cursor-grabbing"><GripVertical size={17} /></button>
    </div>
  )
}

export default function DistrictTreeEditor({ event, initialNodes }: { event: EventRow; initialNodes: DistrictNode[] }) {
  const [nodes, setNodes] = useState(initialNodes)
  const [selectedId, setSelectedId] = useState<string | null>(initialNodes.find((node) => node.node_type === "district")?.id || initialNodes[0]?.id || null)
  const [expanded, setExpanded] = useState(() => new Set(initialNodes.filter((node) => node.node_type !== "district").map((node) => node.id)))
  const [query, setQuery] = useState("")
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [helpOpen, setHelpOpen] = useState(initialNodes.length === 0)
  const [newType, setNewType] = useState<DistrictNode["node_type"]>("district")
  const [newTitle, setNewTitle] = useState("")
  const selected = nodes.find((node) => node.id === selectedId) || null
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const children = useMemo(() => {
    const result = new Map<string | null, DistrictNode[]>()
    for (const node of nodes) result.set(node.district_parent_id, [...(result.get(node.district_parent_id) || []), node])
    for (const list of result.values()) list.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0) || a.title.localeCompare(b.title))
    return result
  }, [nodes])

  async function mutate(payload: Record<string, unknown>) {
    setBusy(true); setMessage(null)
    try {
      const response = await fetch(`/api/admin/events/${event.id}/districts`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error || "District update failed")
      setNodes(body.nodes || [])
      setMessage("District tree saved")
      return body
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "District update failed")
      return null
    } finally { setBusy(false) }
  }

  function parentFor(type: DistrictNode["node_type"]) {
    if (type === "zone") return null
    if (type === "region") return selected?.node_type === "zone" ? selected.id : selected?.node_type === "region" ? selected.district_parent_id : nodes.find((node) => node.id === selected?.district_parent_id)?.district_parent_id || null
    return selected?.node_type === "region" ? selected.id : selected?.node_type === "district" ? selected.district_parent_id : null
  }

  async function createNode() {
    if (!newTitle.trim()) return
    const body = await mutate({ action: "create", node_type: newType, title: newTitle, parent_id: parentFor(newType) })
    if (body?.id) setSelectedId(body.id)
    setNewTitle("")
  }

  async function saveSelected() {
    if (!selected) return
    await mutate({ action: "update", id: selected.id, title: selected.title, code: selected.code, presenter: selected.presenter, external_join_url: selected.external_join_url, external_platform: selected.external_platform })
  }

  async function removeSelected() {
    if (!selected) return
    if (pendingDeleteId !== selected.id) {
      setPendingDeleteId(selected.id)
      setMessage(`Select “Confirm remove” to delete ${selected.title}. Roster assignments to this district will also be cleared.`)
      return
    }

    const removedId = selected.id
    const parentId = selected.district_parent_id
    setBusy(true); setMessage(null)
    try {
      const response = await fetch(`/api/admin/events/${event.id}/districts?nodeId=${encodeURIComponent(removedId)}`, { method: "DELETE" })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error || "District removal failed")
      const nextNodes = (body.nodes || []) as DistrictNode[]
      setNodes(nextNodes)
      setSelectedId(nextNodes.find((node) => node.district_parent_id === parentId)?.id || nextNodes.find((node) => node.node_type === "district")?.id || nextNodes[0]?.id || null)
      setPendingDeleteId(null)
      setMessage(`${selected.title} removed`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "District removal failed")
    } finally {
      setBusy(false)
    }
  }

  function downloadRosterExample() {
    const csv = [
      "email,first_name,last_name,district_code_1,district_code_2",
      "jane@example.com,Jane,Doe,PHL,BAL",
      "john@example.com,John,Smith,BOS,",
    ].join("\n")
    const href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }))
    const link = document.createElement("a")
    link.href = href
    link.download = `district_roster_${event.slug}.csv`
    link.click()
    URL.revokeObjectURL(href)
  }

  async function onDragEnd(eventInfo: DragEndEvent) {
    const dragged = nodes.find((node) => node.id === eventInfo.active.id)
    const target = nodes.find((node) => node.id === eventInfo.over?.id)
    if (!dragged || !target || dragged.id === target.id) return
    let parentId: string | null = target.district_parent_id
    if (dragged.node_type === "zone") {
      if (target.node_type !== "zone") return setMessage("Zones can only be reordered with Zones")
      parentId = null
    } else if (dragged.node_type === "region") {
      if (target.node_type === "zone") parentId = target.id
      else if (target.node_type !== "region") return setMessage("Drop a Region onto a Zone or another Region")
    } else {
      if (target.node_type === "region") parentId = target.id
      else if (target.node_type !== "district") return setMessage("Drop a District onto a Region or another District")
    }
    const siblings = nodes.filter((node) => node.node_type === dragged.node_type && node.district_parent_id === parentId)
    const targetOrder = target.node_type === dragged.node_type ? siblings.findIndex((node) => node.id === target.id) : siblings.length
    setNodes((current) => current.map((node) => node.id === dragged.id ? { ...node, district_parent_id: parentId, sort_order: Math.max(0, targetOrder) } : node))
    await mutate({ action: "move", id: dragged.id, parent_id: parentId, sort_order: Math.max(0, targetOrder) })
    if (parentId) setExpanded((current) => new Set(current).add(parentId!))
  }

  const visibleRows: Array<{ node: DistrictNode; depth: number }> = []
  const normalizedQuery = query.trim().toLowerCase()
  function visit(parentId: string | null, depth: number) {
    for (const node of children.get(parentId) || []) {
      const matches = !normalizedQuery || `${node.title} ${node.code}`.toLowerCase().includes(normalizedQuery)
      if (matches || !normalizedQuery) visibleRows.push({ node, depth })
      if ((expanded.has(node.id) || normalizedQuery) && node.node_type !== "district") visit(node.id, depth + 1)
    }
  }
  visit(null, 0)
  const counts = { zones: nodes.filter((node) => node.node_type === "zone").length, regions: nodes.filter((node) => node.node_type === "region").length, districts: nodes.filter((node) => node.node_type === "district").length }

  return (
    <DndContext sensors={sensors} onDragEnd={(eventInfo) => void onDragEnd(eventInfo)}>
      <div className="mx-auto max-w-[1660px] px-6 py-10 text-white lg:px-10">
        <div className="flex flex-wrap items-end justify-between gap-6 border-b border-white/10 pb-8"><div><div className="text-xs font-bold uppercase tracking-[.22em] text-violet-300/70">Event / Districts</div><h1 className="mt-4 text-5xl font-semibold tracking-[-.045em]">District structure</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-white/45">Drag Zones, Regions, and Districts into the order attendees should see. The public directory mirrors this structure.</p></div><div className="flex flex-wrap items-center justify-end gap-3 text-sm"><button type="button" onClick={() => setHelpOpen((current) => !current)} className={`inline-flex items-center gap-2 rounded-xl border px-4 py-3 font-semibold transition ${helpOpen ? "border-violet-300/35 bg-violet-500/15 text-violet-100" : "border-white/10 bg-white/[.04] text-white/70 hover:bg-white/[.08]"}`}><BookOpen size={16} />How districts work</button><span className="rounded-xl border border-white/10 bg-white/[.04] px-4 py-3">{counts.zones} zones</span><span className="rounded-xl border border-white/10 bg-white/[.04] px-4 py-3">{counts.regions} regions</span><span className="rounded-xl border border-white/10 bg-white/[.04] px-4 py-3">{counts.districts} districts</span></div></div>
        {helpOpen ? <section className="mt-6 overflow-hidden rounded-3xl border border-violet-300/20 bg-gradient-to-br from-[#10182a] via-[#0b1422] to-[#17132a] shadow-[0_24px_70px_rgba(0,0,0,.24)]"><div className="flex items-start justify-between gap-6 border-b border-white/10 px-6 py-5"><div><div className="text-xs font-bold uppercase tracking-[.2em] text-violet-300/70">District guide</div><h2 className="mt-2 text-2xl font-semibold">Build the tree first. Assign people second.</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-white/50">Districts route people to geographic meeting destinations. Sessions are scheduled program content. They appear separately in Jupiter even though they share some infrastructure behind the scenes.</p></div><button type="button" onClick={() => setHelpOpen(false)} aria-label="Close district guide" className="grid size-9 shrink-0 place-items-center rounded-xl border border-white/10 text-white/45 hover:bg-white/10 hover:text-white"><X size={16} /></button></div><div className="grid gap-px bg-white/10 lg:grid-cols-3"><div className="bg-[#0b1321] p-6"><span className="grid size-9 place-items-center rounded-xl bg-violet-500/15 text-sm font-bold text-violet-200">1</span><h3 className="mt-4 font-semibold">Create the structure</h3><p className="mt-2 text-sm leading-6 text-white/48">Create Zones, place Regions inside them, then add Districts inside each Region. Give every District a unique, recognizable code and its meeting URL.</p><div className="mt-4 rounded-xl border border-white/[.07] bg-black/20 px-4 py-3 font-mono text-xs text-white/55">East → Mid-Atlantic → PHL</div></div><div className="bg-[#0b1321] p-6"><span className="grid size-9 place-items-center rounded-xl bg-blue-500/15 text-sm font-bold text-blue-200">2</span><h3 className="mt-4 font-semibold">Upload the district roster</h3><p className="mt-2 text-sm leading-6 text-white/48">In People, choose <strong className="text-white/75">Import CSV → District roster</strong>. Use the exact codes already shown in this tree. Add numbered columns when someone belongs to multiple Districts.</p><pre className="mt-4 overflow-x-auto rounded-xl border border-white/[.07] bg-black/25 p-3 text-[11px] leading-5 text-white/55">{`email,district_code_1,district_code_2\njane@example.com,PHL,BAL`}</pre><button type="button" onClick={downloadRosterExample} className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-blue-200 hover:text-blue-100"><Download size={14} />Download roster example</button></div><div className="bg-[#0b1321] p-6"><span className="grid size-9 place-items-center rounded-xl bg-emerald-500/15 text-sm font-bold text-emerald-200">3</span><h3 className="mt-4 font-semibold">Review in the matrix</h3><p className="mt-2 text-sm leading-6 text-white/48">Open the Assignment Matrix in People and select the Districts view. Checkmarks show every District assigned to each person; click cells to add or remove assignments.</p><div className="mt-4 rounded-xl border border-amber-300/15 bg-amber-400/[.06] px-4 py-3 text-xs leading-5 text-amber-100/65"><strong className="text-amber-100">Avoid unknown codes.</strong> A roster code that is not already in this tree may create an unplaced District that must be moved into a Region.</div></div></div><div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-6 py-4 text-xs text-white/42"><span><strong className="text-white/68">District columns:</strong> district_code_1, district_code_2, …</span><span><strong className="text-white/68">Program columns:</strong> session_code_1, session_code_2, …</span></div></section> : null}
        {message ? <div className={`mt-5 rounded-xl border px-4 py-3 text-sm ${message.includes("saved") || message.includes("removed") ? "border-emerald-300/20 bg-emerald-400/[.07] text-emerald-100" : "border-amber-300/20 bg-amber-400/[.07] text-amber-100"}`}>{message}</div> : null}
        <div className="mt-7 grid gap-5 xl:grid-cols-[minmax(520px,.98fr)_minmax(420px,.72fr)]">
          <section className="rounded-3xl border border-white/10 bg-[#07101d]/92 p-5 shadow-[0_28px_80px_rgba(0,0,0,.28)]"><div className="flex flex-wrap items-center gap-3"><div className="relative min-w-[250px] flex-1"><Search size={16} className="absolute left-3 top-3.5 text-white/30" /><input value={query} onChange={(eventInfo) => setQuery(eventInfo.target.value)} placeholder="Search zones, regions, or districts" className="w-full rounded-xl border border-white/10 bg-black/20 py-3 pl-10 pr-3 text-sm outline-none placeholder:text-white/25 focus:border-violet-300/45" /></div></div><div className="mt-5 space-y-2">{visibleRows.map(({ node, depth }) => <TreeRow key={node.id} node={node} depth={depth} selected={node.id === selectedId} expanded={expanded.has(node.id)} childCount={(children.get(node.id) || []).length} onExpand={() => setExpanded((current) => { const next = new Set(current); if (next.has(node.id)) next.delete(node.id); else next.add(node.id); return next })} onSelect={() => { setSelectedId(node.id); setPendingDeleteId(null) }} />)}{!visibleRows.length ? <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center text-sm text-white/35">No district nodes match this search.</div> : null}</div></section>
          <aside className="space-y-5"><section className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#101827] to-[#15122a] p-6"><div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl border border-violet-300/20 bg-violet-500/10 text-violet-200"><Network size={20} /></span><div><div className="text-xs font-bold uppercase tracking-[.18em] text-white/35">Add to tree</div><div className="mt-1 text-sm text-white/70">Select the intended parent, then create a node.</div></div></div><div className="mt-5 grid gap-3 sm:grid-cols-[140px_1fr_auto]"><select value={newType} onChange={(eventInfo) => setNewType(eventInfo.target.value as DistrictNode["node_type"])} className="rounded-xl border border-white/10 bg-[#080d18] px-3 text-sm"><option value="zone">Zone</option><option value="region">Region</option><option value="district">District</option></select><input value={newTitle} onChange={(eventInfo) => setNewTitle(eventInfo.target.value)} placeholder={`${newType} name`} className="rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm outline-none placeholder:text-white/25" /><button disabled={busy || !newTitle.trim()} onClick={() => void createNode()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold disabled:opacity-35"><Plus size={16} />Add</button></div></section>
            <section className="rounded-3xl border border-white/10 bg-[#07101d]/92 p-6">{selected ? <><div className="flex items-center justify-between"><div><div className="text-xs font-bold uppercase tracking-[.18em] text-white/35">Selected {selected.node_type}</div><h2 className="mt-2 text-2xl font-semibold">{selected.title}</h2></div><span className={`grid size-12 place-items-center rounded-2xl ${selected.node_type === "district" ? "bg-emerald-500/10 text-emerald-200" : "bg-violet-500/10 text-violet-200"}`}>{selected.node_type === "district" ? <MapPinned /> : <Network />}</span></div><div className="mt-6 grid gap-4"><label className="text-xs font-semibold text-white/50">Name<input value={selected.title} onChange={(eventInfo) => setNodes((current) => current.map((node) => node.id === selected.id ? { ...node, title: eventInfo.target.value } : node))} className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none" /></label><label className="text-xs font-semibold text-white/50">Code<input value={selected.code || ""} onChange={(eventInfo) => setNodes((current) => current.map((node) => node.id === selected.id ? { ...node, code: eventInfo.target.value } : node))} className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none" /></label>{selected.node_type === "district" ? <><label className="text-xs font-semibold text-white/50">District lead<input value={selected.presenter || ""} onChange={(eventInfo) => setNodes((current) => current.map((node) => node.id === selected.id ? { ...node, presenter: eventInfo.target.value } : node))} className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none" /></label><label className="text-xs font-semibold text-white/50">Meeting URL<input value={selected.external_join_url || ""} onChange={(eventInfo) => setNodes((current) => current.map((node) => node.id === selected.id ? { ...node, external_join_url: eventInfo.target.value } : node))} placeholder="https://…" className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none" /></label></> : <div className="rounded-xl border border-blue-300/10 bg-blue-400/[.04] px-4 py-3 text-xs leading-5 text-blue-100/55">Organizational nodes never receive roster assignments or meeting links.</div>}</div><div className="mt-6 flex flex-wrap gap-3"><button disabled={busy} onClick={() => void saveSelected()} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-5 py-3 text-sm font-semibold disabled:opacity-40"><Save size={16} />Save node</button>{selected.external_join_url ? <a href={selected.external_join_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm text-white/65"><ExternalLink size={15} />Test link</a> : null}<button disabled={busy} onClick={() => void removeSelected()} className={`ml-auto inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-sm transition disabled:opacity-40 ${pendingDeleteId === selected.id ? "border-red-300/45 bg-red-500/15 text-red-100" : "border-red-300/15 text-red-200/70 hover:border-red-300/30 hover:bg-red-500/[.07]"}`}><Trash2 size={15} />{pendingDeleteId === selected.id ? "Confirm remove" : "Remove"}</button></div></> : <div className="py-16 text-center text-sm text-white/35">Select a node to edit it.</div>}</section></aside>
        </div>
      </div>
    </DndContext>
  )
}
