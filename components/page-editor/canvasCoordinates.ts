export type CanvasPoint = {
  x: number
  y: number
}

function getSafeScale(scale: number) {
  return Number.isFinite(scale) && scale > 0 ? scale : 1
}

function getCanvasContentOrigin(
  canvas: HTMLElement,
  scale: number
): CanvasPoint {
  const safeScale = getSafeScale(scale)
  const rect = canvas.getBoundingClientRect()

  return {
    x: rect.left + canvas.clientLeft * safeScale,
    y: rect.top + canvas.clientTop * safeScale,
  }
}

export function screenPointToCanvasPoint(
  clientX: number,
  clientY: number,
  canvas: HTMLElement,
  scale: number
): CanvasPoint {
  const safeScale = getSafeScale(scale)
  const origin = getCanvasContentOrigin(canvas, safeScale)

  return {
    x: (clientX - origin.x) / safeScale,
    y: (clientY - origin.y) / safeScale,
  }
}

export function screenRectToCanvasRect(
  rect: DOMRect,
  canvas: HTMLElement,
  scale: number
) {
  const safeScale = getSafeScale(scale)
  const origin = getCanvasContentOrigin(canvas, safeScale)

  return {
    x: (rect.left - origin.x) / safeScale,
    y: (rect.top - origin.y) / safeScale,
    width: rect.width / safeScale,
    height: rect.height / safeScale,
  }
}

export function screenDistanceToCanvasDistance(
  distance: number,
  scale: number
) {
  return distance / getSafeScale(scale)
}
