import type {
  AlignmentReferenceBounds,
  ElementAlignmentCommand,
  ElementGeometry,
  ElementPositionUpdate,
} from "./elementAlignmentCommands.ts"
import { getElementAlignmentUpdates } from "./elementAlignmentCommands.ts"

export type GroupMembershipElement = {
  id: string
  locked?: boolean
  props?: Record<string, unknown>
}

export type GroupableElement = ElementGeometry & GroupMembershipElement

export type CompositeSelectionItem = {
  id: string
  memberIds: string[]
  bounds: ElementGeometry
  locked: boolean
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

export function getExpandedGroupMemberIds(
  elements: GroupMembershipElement[],
  selectedIds: string[]
) {
  const selectedIdSet = new Set(selectedIds)
  const selectedGroupIds = new Set(
    elements
      .filter((element) => selectedIdSet.has(element.id))
      .map((element) => getElementGroupId(element))
      .filter((groupId): groupId is string => Boolean(groupId))
  )

  return elements
    .filter(
      (element) =>
        selectedIdSet.has(element.id) ||
        selectedGroupIds.has(getElementGroupId(element) ?? "")
    )
    .map((element) => element.id)
}

function getBounds(elements: ElementGeometry[]): ElementGeometry {
  const left = Math.min(...elements.map((element) => element.x))
  const top = Math.min(...elements.map((element) => element.y))
  const right = Math.max(...elements.map((element) => element.x + element.width))
  const bottom = Math.max(...elements.map((element) => element.y + element.height))

  return {
    id: "__composite-bounds__",
    x: left,
    y: top,
    width: Math.max(1, right - left),
    height: Math.max(1, bottom - top),
  }
}

export function getCompositeSelectionItems(
  elements: GroupableElement[],
  selectedIds: string[]
): CompositeSelectionItem[] {
  const expandedIds = new Set(getExpandedGroupMemberIds(elements, selectedIds))
  const items = new Map<string, GroupableElement[]>()

  for (const element of elements) {
    if (!expandedIds.has(element.id)) continue

    const groupId = getElementGroupId(element)
    const compositeId = groupId ? `group:${groupId}` : `element:${element.id}`
    const members = items.get(compositeId) ?? []
    members.push(element)
    items.set(compositeId, members)
  }

  return Array.from(items, ([id, members]) => ({
    id,
    memberIds: members.map((member) => member.id),
    bounds: {
      ...getBounds(members),
      id,
    },
    locked: members.some((member) => member.locked === true),
  }))
}

export function compositeSelectionHasLockedMember(
  elements: GroupMembershipElement[],
  selectedIds: string[]
) {
  const expandedIds = new Set(getExpandedGroupMemberIds(elements, selectedIds))

  return elements.some(
    (element) => expandedIds.has(element.id) && element.locked === true
  )
}

export function getCompositeMoveUpdates({
  elements,
  selectedIds,
  deltaX,
  deltaY,
  minimumX = 0,
  minimumY = 0,
}: {
  elements: GroupableElement[]
  selectedIds: string[]
  deltaX: number
  deltaY: number
  minimumX?: number
  minimumY?: number
}): ElementPositionUpdate[] {
  const expandedIds = new Set(getExpandedGroupMemberIds(elements, selectedIds))
  const selectedElements = elements.filter((element) =>
    expandedIds.has(element.id)
  )
  if (selectedElements.length === 0) return []

  const bounds = getBounds(selectedElements)
  const appliedDeltaX = Math.max(deltaX, minimumX - bounds.x)
  const appliedDeltaY = Math.max(deltaY, minimumY - bounds.y)

  return selectedElements.map((element) => ({
    id: element.id,
    x: element.x + appliedDeltaX,
    y: element.y + appliedDeltaY,
  }))
}

export function getCompositeAlignmentUpdates({
  elements,
  selectedIds,
  command,
  referenceBounds,
}: {
  elements: GroupableElement[]
  selectedIds: string[]
  command: ElementAlignmentCommand
  referenceBounds?: AlignmentReferenceBounds | null
}): ElementPositionUpdate[] {
  const composites = getCompositeSelectionItems(elements, selectedIds)
  const compositeUpdates = getElementAlignmentUpdates({
    elements: composites.map((composite) => composite.bounds),
    selectedIds: composites.map((composite) => composite.id),
    command,
    referenceBounds,
  })
  const updatesByCompositeId = new Map(
    compositeUpdates.map((update) => [update.id, update])
  )
  const elementsById = new Map(elements.map((element) => [element.id, element]))

  return composites.flatMap((composite) => {
    const update = updatesByCompositeId.get(composite.id)
    if (!update) return []

    const deltaX =
      typeof update.x === "number" ? update.x - composite.bounds.x : 0
    const deltaY =
      typeof update.y === "number" ? update.y - composite.bounds.y : 0

    return composite.memberIds.flatMap((memberId) => {
      const member = elementsById.get(memberId)
      if (!member) return []

      return [
        {
          id: member.id,
          ...(typeof update.x === "number" ? { x: member.x + deltaX } : {}),
          ...(typeof update.y === "number" ? { y: member.y + deltaY } : {}),
        },
      ]
    })
  })
}

export function getGroupResizeSnapshot(
  elements: GroupableElement[]
): GroupResizeSnapshot | null {
  if (elements.length < 2) return null

  const bounds = getBounds(elements)

  return {
    bounds: {
      ...bounds,
      id: "__group-bounds__",
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

export function getMinimumGroupResizeDimensions(
  snapshot: GroupResizeSnapshot,
  minimumElementWidth: number,
  minimumElementHeight: number
) {
  const minimumScaleX = Math.max(
    ...snapshot.elements.map((element) =>
      element.width >= minimumElementWidth && element.width > 0
        ? minimumElementWidth / element.width
        : 1
    )
  )
  const minimumScaleY = Math.max(
    ...snapshot.elements.map((element) =>
      element.height >= minimumElementHeight && element.height > 0
        ? minimumElementHeight / element.height
        : 1
    )
  )

  return {
    width: snapshot.bounds.width * minimumScaleX,
    height: snapshot.bounds.height * minimumScaleY,
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
