import type { EventPageElement } from "@/lib/page-editor/sectionTypes"

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function getFiniteNumber(value: unknown, fallback: number) {
  if (
    typeof value !== "number" &&
    !(typeof value === "string" && value.trim().length > 0)
  ) {
    return fallback
  }

  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function getNullableFiniteNumber(value: unknown) {
  if (value == null) return null

  if (
    typeof value !== "number" &&
    !(typeof value === "string" && value.trim().length > 0)
  ) {
    return null
  }

  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

export function normalizeEventPageElements(input: unknown): EventPageElement[] {
  if (!Array.isArray(input)) return []

  return input.map((value, index) => {
    const element = isRecord(value) ? value : {}
    const rawId = typeof element.id === "string" ? element.id.trim() : ""
    const rawElementType =
      typeof element.element_type === "string"
        ? element.element_type.trim()
        : ""

    return {
      id: rawId || `element-${index + 1}`,
      element_type: rawElementType || "text",
      content:
        typeof element.content === "string"
          ? element.content
          : String(element.content ?? ""),
      x: getFiniteNumber(element.x, 0),
      y: getFiniteNumber(element.y, 0),
      width: getNullableFiniteNumber(element.width),
      height: getNullableFiniteNumber(element.height),
      z_index: getFiniteNumber(element.z_index, index + 1),
      visible: element.visible !== false,
      locked: element.locked === true,
      props: isRecord(element.props) ? element.props : {},
    }
  })
}
