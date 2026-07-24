import type {
  ElementGeometry,
  ElementPositionUpdate,
} from "./elementAlignmentCommands"

export type GroupableElement = ElementGeometry & {
  props?: Record<string, unknown>
}

export type GroupResizeSnapshot = {
  bounds: ElementGeometry
  elements: ElementGeometry[]
}

export function createElementGroupId() {
  return `group-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function getElementGroupId(element: {
  props?: Record<string, unknown>
}) {
  const groupId = element.props?.groupId
  return typeof groupId === "string" && groupId.length > 0 ? groupId : null
}

export function getElementGroupMemberIds(
  elements: Array<{ id: string; props?: Record<string, unknown> }>,
  element: { id: string; props?: Record<string, unknown> }
) {
  const groupId = getElementGroupId(element)
  if (!groupId) return [element.id]

  return elements
    .filter((candidate) => getElementGroupId(candidate) === groupId)
    .map((candidate) => candidate.id)
}

export function getGroupResizeSnapshot(
  elements: GroupableElement[]
): GroupResizeSnapshot | null {
  if (elements.length < 2) return null

  const left = Math.min(...elements.map((element) => element.x))
  const top = Math.min(...elements.map((element) => element.y))
  const right = Math.max(...elements.map((element) => element.x + element.width))
  const bottom = Math.max(...elements.map((element) => element.y + element.height))

  return {
    bounds: {
      id: "__group-bounds__",
      x: left,
      y: top,
      width: Math.max(1, right - left),
      height: Math.max(1, bottom - top),
    },
    elements: elements.map((element) => ({
      id: element.id,
      x: element.x,
      y: element.y,
      width: element.width,
      height: element.height,
    })),
  }
}

export function getGroupResizeUpdates({
  snapshot,
  width,
  height,
}: {
  snapshot: GroupResizeSnapshot
  width: number
  height: number
}): Array<ElementPositionUpdate & { width: number; height: number }> {
  const scaleX = width / snapshot.bounds.width
  const scaleY = height / snapshot.bounds.height

  return snapshot.elements.map((element) => ({
    id: element.id,
    x: snapshot.bounds.x + (element.x - snapshot.bounds.x) * scaleX,
    y: snapshot.bounds.y + (element.y - snapshot.bounds.y) * scaleY,
    width: Math.max(1, element.width * scaleX),
    height: Math.max(1, element.height * scaleY),
  }))
}
