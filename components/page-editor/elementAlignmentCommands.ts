export type ElementGeometry = {
  id: string
  x: number
  y: number
  width: number
  height: number
}

export type AlignmentReferenceBounds = {
  x: number
  y: number
  width: number
  height: number
}

export type ElementAlignmentCommand =
  | "align-left"
  | "align-horizontal-center"
  | "align-right"
  | "align-top"
  | "align-vertical-center"
  | "align-bottom"
  | "center-in-section"
  | "center-on-page"
  | "distribute-horizontally"
  | "distribute-vertically"

export type ElementPositionUpdate = {
  id: string
  x?: number
  y?: number
}

function getSelectionBounds(elements: ElementGeometry[]): AlignmentReferenceBounds {
  const left = Math.min(...elements.map((element) => element.x))
  const top = Math.min(...elements.map((element) => element.y))
  const right = Math.max(...elements.map((element) => element.x + element.width))
  const bottom = Math.max(...elements.map((element) => element.y + element.height))

  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  }
}

export function findClosestReferenceBounds(
  element: ElementGeometry,
  references: AlignmentReferenceBounds[]
) {
  const elementCenterX = element.x + element.width / 2
  const elementCenterY = element.y + element.height / 2
  const containingReference = references.find(
    (reference) =>
      elementCenterX >= reference.x &&
      elementCenterX <= reference.x + reference.width &&
      elementCenterY >= reference.y &&
      elementCenterY <= reference.y + reference.height
  )

  if (containingReference) return containingReference

  return references.reduce<AlignmentReferenceBounds | null>((closest, reference) => {
    if (!closest) return reference

    const referenceCenterX = reference.x + reference.width / 2
    const referenceCenterY = reference.y + reference.height / 2
    const closestCenterX = closest.x + closest.width / 2
    const closestCenterY = closest.y + closest.height / 2
    const referenceDistance = Math.hypot(
      elementCenterX - referenceCenterX,
      elementCenterY - referenceCenterY
    )
    const closestDistance = Math.hypot(
      elementCenterX - closestCenterX,
      elementCenterY - closestCenterY
    )

    return referenceDistance < closestDistance ? reference : closest
  }, null)
}

export function getElementAlignmentUpdates({
  elements,
  selectedIds,
  command,
  referenceBounds,
}: {
  elements: ElementGeometry[]
  selectedIds: string[]
  command: ElementAlignmentCommand
  referenceBounds?: AlignmentReferenceBounds | null
}): ElementPositionUpdate[] {
  const selectedElements = elements.filter((element) => selectedIds.includes(element.id))
  if (selectedElements.length === 0) return []

  if (command === "distribute-horizontally") {
    if (selectedElements.length < 3) return []

    const ordered = [...selectedElements].sort((a, b) => a.x - b.x)
    const first = ordered[0]
    const last = ordered[ordered.length - 1]
    const totalWidth = ordered.reduce((sum, element) => sum + element.width, 0)
    const availableWidth = last.x + last.width - first.x
    const gap = (availableWidth - totalWidth) / (ordered.length - 1)
    let nextX = first.x

    return ordered.map((element, index) => {
      if (index === 0) {
        nextX += element.width + gap
        return { id: element.id, x: element.x }
      }

      if (index === ordered.length - 1) {
        return { id: element.id, x: element.x }
      }

      const update = { id: element.id, x: nextX }
      nextX += element.width + gap
      return update
    })
  }

  if (command === "distribute-vertically") {
    if (selectedElements.length < 3) return []

    const ordered = [...selectedElements].sort((a, b) => a.y - b.y)
    const first = ordered[0]
    const last = ordered[ordered.length - 1]
    const totalHeight = ordered.reduce((sum, element) => sum + element.height, 0)
    const availableHeight = last.y + last.height - first.y
    const gap = (availableHeight - totalHeight) / (ordered.length - 1)
    let nextY = first.y

    return ordered.map((element, index) => {
      if (index === 0) {
        nextY += element.height + gap
        return { id: element.id, y: element.y }
      }

      if (index === ordered.length - 1) {
        return { id: element.id, y: element.y }
      }

      const update = { id: element.id, y: nextY }
      nextY += element.height + gap
      return update
    })
  }

  const targetBounds = referenceBounds ?? getSelectionBounds(selectedElements)

  return selectedElements.map((element) => {
    switch (command) {
      case "align-left":
        return { id: element.id, x: targetBounds.x }
      case "align-horizontal-center":
        return {
          id: element.id,
          x: targetBounds.x + (targetBounds.width - element.width) / 2,
        }
      case "align-right":
        return {
          id: element.id,
          x: targetBounds.x + targetBounds.width - element.width,
        }
      case "align-top":
        return { id: element.id, y: targetBounds.y }
      case "align-vertical-center":
        return {
          id: element.id,
          y: targetBounds.y + (targetBounds.height - element.height) / 2,
        }
      case "align-bottom":
        return {
          id: element.id,
          y: targetBounds.y + targetBounds.height - element.height,
        }
      case "center-in-section":
      case "center-on-page":
        return {
          id: element.id,
          x: targetBounds.x + (targetBounds.width - element.width) / 2,
          y: targetBounds.y + (targetBounds.height - element.height) / 2,
        }
      default:
        return { id: element.id }
    }
  })
}
