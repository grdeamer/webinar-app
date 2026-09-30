"use client"
import TimelineControls from "./TimelineControls"
import type { EventPageSection, SectionBlock } from "@/lib/page-editor/sectionTypes"
import { LIVE_AGENDA_REGIONS, liveAgendaLabel, liveAgendaRegion } from "@/lib/page-editor/liveAgendaLayout"
const INPUT = "mt-2 w-full rounded-lg border border-white/10 bg-[#111520] px-3 py-2 text-sm text-white"
const BUTTON = "rounded-lg border border-white/10 px-3 py-2 text-xs text-white/70 hover:bg-white/5"
type Props = {
  block: SectionBlock
  section: EventPageSection
  eventTitle: string
  eventDescription: string
  saveStatus: string
  onSave: () => void
  onSelect: (id: string) => void
  onUpdate: (patch: Partial<SectionBlock["props"]>) => void
  onDelete: () => void
  onMove: (direction: "up" | "down") => void
  onDuplicate: () => void
}
export default function LiveAgendaBlockInspector({ block, section, eventTitle, eventDescription, saveStatus, onSave, onSelect, onUpdate, onDelete, onMove, onDuplicate }: Props) {
  const isText = block.type === "rich_text"
  const role = String(block.props.layoutRole)
  const bound = Boolean(block.props.bindEventTitle || block.props.bindEventDescription)
  const body = bound ? block.props.bindEventTitle ? eventTitle : eventDescription : String(block.props.body ?? "")
  return <aside aria-label="Component properties" className="w-full shrink-0 overflow-auto border-l border-white/[0.07] bg-[#080b13] p-5 text-white lg:w-[320px]">
    <p className="text-[10px] font-bold uppercase tracking-[.16em] text-white/40">Inspector</p>
    <h2 className="mt-2 text-lg font-semibold">{liveAgendaLabel(block)}</h2>
    <div className="my-5 flex justify-between border-y border-white/[0.07] py-3 text-xs"><span role="status" className="text-white/55">{saveStatus}</span><button onClick={onSave} type="button" className="text-violet-200">Save now</button></div>
    <label className="block text-xs text-white/65">{isText ? "Text" : "Label override"}{isText ? <textarea rows={4} className={INPUT} value={body} onChange={event => onUpdate({ body: event.target.value, bindEventTitle: false, bindEventDescription: false })} /> : <input className={INPUT} value={String(block.props.title ?? "")} placeholder="Use live label" onChange={event => onUpdate({ title: event.target.value })} />}</label>
    {role === "title" || role === "description" ? <label className="mt-4 flex gap-2 text-xs text-white/60"><input type="checkbox" checked={bound} onChange={event => onUpdate({ bindEventTitle: role === "title" && event.target.checked, bindEventDescription: role === "description" && event.target.checked, body })} />Follow event {role}</label> : null}
    {!isText ? <p className="mt-3 text-xs leading-5 text-white/45">Session titles, times, and status follow the live agenda. Edit those in the event’s Agenda page.</p> : null}
    {["join", "footer", "attribution"].includes(role) ? <label className="mt-5 block text-xs text-white/65">Link override<input className={INPUT} value={String(block.props.href ?? "")} placeholder={role === "join" ? "Follow the live meeting link" : "https://"} onChange={event => onUpdate({ href: event.target.value })} /></label> : null}
    {block.type === "system_component" && (role === "agenda" || block.props.componentKey === "live_timeline") ? <>
      <label className="mt-5 block text-xs text-white/65">Schedule display<select className={INPUT} value={block.props.componentKey === "live_timeline" ? "live_timeline" : "agenda"} onChange={e => onUpdate({ componentKey: e.target.value as "agenda" | "live_timeline", layoutRole: "agenda" })}><option value="agenda">Agenda list</option><option value="live_timeline">Live Timeline</option></select></label>
      {block.props.componentKey === "live_timeline" ? <TimelineControls values={block.props} onChange={onUpdate} /> : null}
    </> : null}
    <label className="mt-5 block text-xs text-white/65">Layout area<select className={INPUT} value={liveAgendaRegion(block)} onChange={event => onUpdate({ layoutRegion: event.target.value })}>{LIVE_AGENDA_REGIONS.map(region => <option key={region} value={region}>{region.charAt(0).toUpperCase()+region.slice(1)}</option>)}</select></label>
    <div className="mt-4 flex flex-wrap gap-2"><button type="button" className={BUTTON} onClick={() => onMove("up")}>Move up</button><button type="button" className={BUTTON} onClick={() => onMove("down")}>Move down</button><button type="button" className={BUTTON} onClick={onDuplicate}>Duplicate</button></div>
    <button type="button" className="mt-4 w-full rounded-lg border border-red-300/20 px-3 py-2 text-sm text-red-200 hover:bg-red-500/10" onClick={onDelete}>Delete component</button>
    <h3 className="mt-8 border-t border-white/[0.07] pt-5 text-xs font-semibold text-white/50">Components in this layout</h3>
    <div className="mt-3 space-y-1">{section.blocks?.map(item => <button type="button" key={item.id} aria-pressed={item.id === block.id} onClick={() => onSelect(item.id)} className={`block w-full rounded-md px-3 py-2 text-left text-xs ${item.id === block.id ? "bg-violet-500/15 text-violet-100" : "text-white/55 hover:bg-white/5"}`}>{liveAgendaLabel(item)}</button>)}</div>
  </aside>
}
