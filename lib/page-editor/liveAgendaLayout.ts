import type { EventPageSection, SectionBlock } from "./sectionTypes"

export type LiveAgendaRegion = "welcome" | "actions" | "sidebar" | "agenda" | "footer"
export const LIVE_AGENDA_REGIONS: LiveAgendaRegion[] = ["welcome", "actions", "sidebar", "agenda", "footer"]
export type LiveAgendaRole = "eyebrow" | "title" | "description" | "current" | "join" | "next" | "status" | "clock" | "countdown" | "notice" | "agenda-date" | "agenda-title" | "agenda" | "footer" | "attribution"

export function createLiveAgendaBlocks(prefix: string, copy: { title?: string; body?: string | null; joinHref?: unknown } = {}): SectionBlock[] {
  function text(role: LiveAgendaRole, region: LiveAgendaRegion, body: string): SectionBlock {
    return { id: `${prefix}:${role}`, type: "rich_text", props: { body, layoutRole: role, layoutRegion: region } }
  }
  function component(role: LiveAgendaRole, region: LiveAgendaRegion, componentKey: "live_state" | "next_up" | "join_button" | "countdown" | "agenda", title?: string): SectionBlock {
    return { id: `${prefix}:${role}`, type: "system_component", props: { componentKey, layoutRole: role, layoutRegion: region, containerStyle: "none", ...(title ? { title } : {}) } }
  }
  return [
    text("eyebrow", "welcome", "Welcome"),
    { ...text("title", "welcome", copy.title ?? ""), props: { body: copy.title ?? "", layoutRole: "title", layoutRegion: "welcome", bindEventTitle: !copy.title } } as SectionBlock,
    { ...text("description", "welcome", copy.body ?? ""), props: { body: copy.body ?? "", layoutRole: "description", layoutRegion: "welcome", bindEventDescription: copy.body == null } } as SectionBlock,
    component("current", "welcome", "live_state"),
    { ...component("join", "actions", "join_button"), props: { componentKey: "join_button", layoutRole: "join", layoutRegion: "actions", containerStyle: "none", href: typeof copy.joinHref === "string" ? copy.joinHref : "" } } as SectionBlock,
    component("next", "actions", "next_up"),
    component("status", "sidebar", "live_state"),
    component("clock", "sidebar", "countdown", "Current time"),
    component("countdown", "sidebar", "countdown", "Next session begins in"),
    text("notice", "sidebar", "This page updates automatically. No refresh is required."),
    component("agenda-date", "agenda", "agenda"),
    text("agenda-title", "agenda", "Today’s agenda"),
    component("agenda", "agenda", "agenda"),
    { ...text("footer", "footer", "Leading Edge Training Solutions, LLC"), props: { body: "Leading Edge Training Solutions, LLC", href: "https://letstrainonline.com", layoutRole: "footer", layoutRegion: "footer" } } as SectionBlock,
    { ...text("attribution", "footer", "Powered by Jupiter"), props: { body: "Powered by Jupiter", href: "https://jupiter.events", layoutRole: "attribution", layoutRegion: "footer" } } as SectionBlock,
  ]
}

export function isLiveAgendaSection(section: EventPageSection): boolean {
  return section.config.liveAgendaLayout === true || Boolean(section.blocks?.some(block => block.type === "system_component" && block.props.componentKey === "lets_live_agenda"))
}

// Deterministic IDs let selection materialize a legacy page without losing the clicked item.
export function materializeLiveAgendaSection(section: EventPageSection): EventPageSection {
  if (section.config.liveAgendaLayout) return section
  if (!isLiveAgendaSection(section)) return section
  return {
    ...section,
    config: { ...section.config, liveAgendaLayout: true },
    blocks: (section.blocks ?? []).flatMap(block => block.type === "system_component" && block.props.componentKey === "lets_live_agenda"
      ? createLiveAgendaBlocks(block.id, block.props)
      : [block]),
  }
}

export function liveAgendaRegion(block: SectionBlock): LiveAgendaRegion {
  const region = block.props.layoutRegion
  return LIVE_AGENDA_REGIONS.includes(region as LiveAgendaRegion) ? region as LiveAgendaRegion : "welcome"
}

export function moveLiveAgendaBlock(section: EventPageSection, source: string, target: string): EventPageSection {
  const blocks = [...(section.blocks ?? [])]
  const from = blocks.findIndex(block => block.id === source)
  const to = blocks.findIndex(block => block.id === target)
  if (from < 0 || to < 0 || from === to) return section
  const region = liveAgendaRegion(blocks[to])
  const [moved] = blocks.splice(from, 1)
  blocks.splice(to, 0, { ...moved, props: { ...moved.props, layoutRegion: region } } as SectionBlock)
  return { ...section, blocks }
}

export function liveAgendaLabel(block: SectionBlock): string {
  const labels: Record<string, string> = { eyebrow: "Welcome label", title: "Event title", description: "Description", current: "Current session", join: "Join button", next: "Next session", status: "Event status", clock: "Clock", countdown: "Countdown", notice: "Update notice", "agenda-date": "Agenda date", "agenda-title": "Agenda heading", agenda: "Agenda", footer: "Company link", attribution: "Attribution" }
  return labels[String(block.props.layoutRole)] || String(block.props.title || "Content")
}
