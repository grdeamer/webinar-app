import type { EventPageElement, EventPageSection } from "./sectionTypes"

type Frame = Pick<EventPageElement, "x" | "y" | "width" | "height">

export function findInsertionY(frame: Frame, elements: readonly Frame[], headerBottom: number) {
  const gap = 16
  let y = Math.max(frame.y, Math.ceil(headerBottom) + gap)
  const sameColumn = elements
    .filter(element => element.x < frame.x + (frame.width ?? 0) + gap &&
      element.x + (element.width ?? 0) + gap > frame.x)
    .sort((a, b) => a.y - b.y)

  for (const element of sameColumn) {
    const bottom = element.y + (element.height ?? 0)
    if (y < bottom + gap && y + (frame.height ?? 0) + gap > element.y) y = bottom + gap
  }
  return y
}

export function getSectionIntro(section: EventPageSection) {
  const { title, body } = section.config ?? {}
  const registration = section.blocks?.find(block =>
    block.type === "system_component" && block.props.componentKey === "registration_form",
  )
  const duplicate = (outer: unknown, inner: unknown) =>
    typeof outer === "string" && typeof inner === "string" &&
      outer.trim().toLocaleLowerCase() === inner.trim().toLocaleLowerCase()

  return {
    title: duplicate(title, registration?.props.title) ? undefined : title,
    body: duplicate(body, registration?.props.body) ? undefined : body,
  }
}

function sortJsonKeys(_key: string, value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value
  return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)))
}

export function samePageSnapshot(left: unknown, right: unknown) {
  return JSON.stringify(left, sortJsonKeys) === JSON.stringify(right, sortJsonKeys)
}

export function getPreviewButtonHref(value: unknown) {
  if (typeof value !== "string" || !value.trim() || value.trim() === "#") return null
  try {
    const destination = new URL(value, "https://app.jupiter.events")
    return ["http:", "https:", "mailto:", "tel:"].includes(destination.protocol) ? value.trim() : null
  } catch {
    return null
  }
}

export function sameStarterSections(left: readonly EventPageSection[], right: readonly EventPageSection[]) {
  const withoutGeneratedIds = (sections: readonly EventPageSection[]) => sections.map(section => ({
    type: section.type,
    config: section.config,
    blocks: section.blocks?.map(block => ({ type: block.type, props: block.props })) ?? [],
  }))
  return samePageSnapshot(withoutGeneratedIds(left), withoutGeneratedIds(right))
}
