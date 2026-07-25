import type { EventPageElement } from "@/lib/page-editor/sectionTypes"

export type LayerCommand =
  | "bring-forward"
  | "send-backward"
  | "bring-to-front"
  | "send-to-back"
  | "toggle-visibility"
  | "toggle-lock"

function normalizeLayerZIndexes(elements: EventPageElement[]) {
  return [...elements]
    .sort((a, b) => (a.z_index ?? 0) - (b.z_index ?? 0))
    .map((element, index) => ({
      ...element,
      z_index: index + 1,
    }))
}

export function applyLayerCommand(
  elements: EventPageElement[],
  targetId: string,
  command: LayerCommand
): EventPageElement[] {
  const target = elements.find((element) => element.id === targetId)
  if (!target) return elements

  if (command === "toggle-visibility") {
    return elements.map((element) =>
      element.id === targetId
        ? { ...element, visible: element.visible === false }
        : element
    )
  }

  if (command === "toggle-lock") {
    return elements.map((element) =>
      element.id === targetId
        ? { ...element, locked: element.locked !== true }
        : element
    )
  }

  const normalized = normalizeLayerZIndexes(elements)
  const currentIndex = normalized.findIndex((element) => element.id === targetId)
  if (currentIndex === -1) return elements

  const targetIndex =
    command === "bring-forward"
      ? Math.min(normalized.length - 1, currentIndex + 1)
      : command === "send-backward"
        ? Math.max(0, currentIndex - 1)
        : command === "bring-to-front"
          ? normalized.length - 1
          : 0

  if (targetIndex === currentIndex) return elements

  const reordered = [...normalized]
  const [moved] = reordered.splice(currentIndex, 1)
  if (!moved) return elements

  reordered.splice(targetIndex, 0, moved)

  return reordered.map((element, index) => ({
    ...element,
    z_index: index + 1,
  }))
}
