export type AlignableRect = {
  id: string
  x: number
  y: number
  width: number
  height: number
}

export type AlignmentAnchor = "start" | "center" | "end"

export type AlignmentTarget = AlignableRect & {
  xAnchors?: readonly AlignmentAnchor[]
  yAnchors?: readonly AlignmentAnchor[]
  measureDistance?: boolean
}

export type DistanceGuide = {
  orientation: "horizontal" | "vertical"
  start: number
  end: number
  crossPosition: number
  distance: number
  equal: boolean
}

export type AlignmentGuides = {
  vertical: number[]
  horizontal: number[]
  distances: DistanceGuide[]
}

export type AlignmentGuideResult = {
  x: number
  y: number
  guides: AlignmentGuides
}

type AlignmentCandidate = {
  delta: number
  guidePosition: number
}

type DistanceNeighbor = {
  target: AlignmentTarget
  gap: number
}

const DEFAULT_ALIGNMENT_THRESHOLD = 8
const DEFAULT_DISTANCE_GUIDE_RANGE = 160
const ALIGNMENT_EPSILON = 0.001
const AXIS_ANCHORS = ["start", "center", "end"] as const

export function getCanvasAndSectionAlignmentTargets(
  canvas: HTMLDivElement
): AlignmentTarget[] {
  const canvasRect = canvas.getBoundingClientRect()
  const scaleX = canvas.offsetWidth > 0 ? canvasRect.width / canvas.offsetWidth : 1
  const scaleY = canvas.offsetHeight > 0 ? canvasRect.height / canvas.offsetHeight : 1
  const canvasContentLeft = canvasRect.left + canvas.clientLeft * scaleX
  const canvasContentTop = canvasRect.top + canvas.clientTop * scaleY

  const sectionTargets = Array.from(
    canvas.querySelectorAll<HTMLElement>('[data-editor-section="true"]')
  ).map((section, index): AlignmentTarget => {
    const sectionRect = section.getBoundingClientRect()

    return {
      id: `__alignment-section-target-${index}__`,
      x: (sectionRect.left - canvasContentLeft) / scaleX,
      y: (sectionRect.top - canvasContentTop) / scaleY,
      width: sectionRect.width / scaleX,
      height: sectionRect.height / scaleY,
      xAnchors: ["start", "end"],
      yAnchors: ["start", "end"],
      measureDistance: false,
    }
  })

  return [
    {
      id: "__alignment-canvas-target__",
      x: 0,
      y: 0,
      width: canvas.clientWidth,
      height: canvas.clientHeight,
      xAnchors: ["center"],
      yAnchors: ["center"],
      measureDistance: false,
    },
    ...sectionTargets,
  ]
}

function getAxisAnchors(start: number, size: number) {
  return [start, start + size / 2, start + size] as const
}

function getAxisSnap(
  proposedStart: number,
  draggedSize: number,
  targetAxes: Array<{
    start: number
    size: number
    anchors?: readonly AlignmentAnchor[]
  }>,
  threshold: number
) {
  const draggedAnchors = getAxisAnchors(proposedStart, draggedSize)
  const candidates: AlignmentCandidate[] = []

  for (const targetAxis of targetAxes) {
    const targetAnchors = getAxisAnchors(targetAxis.start, targetAxis.size)

    for (let anchorIndex = 0; anchorIndex < draggedAnchors.length; anchorIndex += 1) {
      if (
        targetAxis.anchors &&
        !targetAxis.anchors.includes(AXIS_ANCHORS[anchorIndex])
      ) {
        continue
      }

      const delta = targetAnchors[anchorIndex] - draggedAnchors[anchorIndex]

      if (Math.abs(delta) > threshold || proposedStart + delta < 0) continue

      candidates.push({
        delta,
        guidePosition: targetAnchors[anchorIndex],
      })
    }
  }

  const closestCandidate = candidates.reduce<AlignmentCandidate | null>(
    (closest, candidate) =>
      !closest || Math.abs(candidate.delta) < Math.abs(closest.delta)
        ? candidate
        : closest,
    null
  )

  if (!closestCandidate) {
    return {
      start: proposedStart,
      guidePositions: [] as number[],
    }
  }

  const guidePositions = Array.from(
    new Set(
      candidates
        .filter(
          (candidate) =>
            Math.abs(candidate.delta - closestCandidate.delta) < ALIGNMENT_EPSILON
        )
        .map((candidate) => candidate.guidePosition)
    )
  )

  return {
    start: proposedStart + closestCandidate.delta,
    guidePositions,
  }
}

function rangesOverlap(
  firstStart: number,
  firstEnd: number,
  secondStart: number,
  secondEnd: number
) {
  return Math.min(firstEnd, secondEnd) > Math.max(firstStart, secondStart)
}

function getNearestHorizontalNeighbors(
  dragged: AlignableRect,
  targets: AlignmentTarget[],
  guideRange: number
) {
  let left: DistanceNeighbor | null = null
  let right: DistanceNeighbor | null = null
  const draggedBottom = dragged.y + dragged.height
  const draggedRight = dragged.x + dragged.width

  for (const target of targets) {
    if (
      !rangesOverlap(
        dragged.y,
        draggedBottom,
        target.y,
        target.y + target.height
      )
    ) {
      continue
    }

    const leftGap = dragged.x - (target.x + target.width)
    if (
      leftGap >= 0 &&
      leftGap <= guideRange &&
      (!left || leftGap < left.gap)
    ) {
      left = { target, gap: leftGap }
    }

    const rightGap = target.x - draggedRight
    if (
      rightGap >= 0 &&
      rightGap <= guideRange &&
      (!right || rightGap < right.gap)
    ) {
      right = { target, gap: rightGap }
    }
  }

  return { left, right }
}

function getNearestVerticalNeighbors(
  dragged: AlignableRect,
  targets: AlignmentTarget[],
  guideRange: number
) {
  let top: DistanceNeighbor | null = null
  let bottom: DistanceNeighbor | null = null
  const draggedRight = dragged.x + dragged.width
  const draggedBottom = dragged.y + dragged.height

  for (const target of targets) {
    if (
      !rangesOverlap(
        dragged.x,
        draggedRight,
        target.x,
        target.x + target.width
      )
    ) {
      continue
    }

    const topGap = dragged.y - (target.y + target.height)
    if (
      topGap >= 0 &&
      topGap <= guideRange &&
      (!top || topGap < top.gap)
    ) {
      top = { target, gap: topGap }
    }

    const bottomGap = target.y - draggedBottom
    if (
      bottomGap >= 0 &&
      bottomGap <= guideRange &&
      (!bottom || bottomGap < bottom.gap)
    ) {
      bottom = { target, gap: bottomGap }
    }
  }

  return { top, bottom }
}

function getOverlapCenter(
  firstStart: number,
  firstEnd: number,
  secondStart: number,
  secondEnd: number
) {
  const overlapStart = Math.max(firstStart, secondStart)
  const overlapEnd = Math.min(firstEnd, secondEnd)
  return overlapStart + (overlapEnd - overlapStart) / 2
}

function getDistanceGuides(
  dragged: AlignableRect,
  targets: AlignmentTarget[],
  guideRange: number
) {
  const horizontalNeighbors = getNearestHorizontalNeighbors(
    dragged,
    targets,
    guideRange
  )
  const verticalNeighbors = getNearestVerticalNeighbors(
    dragged,
    targets,
    guideRange
  )
  const horizontalEqual =
    horizontalNeighbors.left &&
    horizontalNeighbors.right &&
    Math.abs(horizontalNeighbors.left.gap - horizontalNeighbors.right.gap) <
      ALIGNMENT_EPSILON
  const verticalEqual =
    verticalNeighbors.top &&
    verticalNeighbors.bottom &&
    Math.abs(verticalNeighbors.top.gap - verticalNeighbors.bottom.gap) <
      ALIGNMENT_EPSILON
  const guides: DistanceGuide[] = []

  if (horizontalNeighbors.left) {
    const target = horizontalNeighbors.left.target
    guides.push({
      orientation: "horizontal",
      start: target.x + target.width,
      end: dragged.x,
      crossPosition: getOverlapCenter(
        dragged.y,
        dragged.y + dragged.height,
        target.y,
        target.y + target.height
      ),
      distance: horizontalNeighbors.left.gap,
      equal: Boolean(horizontalEqual),
    })
  }

  if (horizontalNeighbors.right) {
    const target = horizontalNeighbors.right.target
    guides.push({
      orientation: "horizontal",
      start: dragged.x + dragged.width,
      end: target.x,
      crossPosition: getOverlapCenter(
        dragged.y,
        dragged.y + dragged.height,
        target.y,
        target.y + target.height
      ),
      distance: horizontalNeighbors.right.gap,
      equal: Boolean(horizontalEqual),
    })
  }

  if (verticalNeighbors.top) {
    const target = verticalNeighbors.top.target
    guides.push({
      orientation: "vertical",
      start: target.y + target.height,
      end: dragged.y,
      crossPosition: getOverlapCenter(
        dragged.x,
        dragged.x + dragged.width,
        target.x,
        target.x + target.width
      ),
      distance: verticalNeighbors.top.gap,
      equal: Boolean(verticalEqual),
    })
  }

  if (verticalNeighbors.bottom) {
    const target = verticalNeighbors.bottom.target
    guides.push({
      orientation: "vertical",
      start: dragged.y + dragged.height,
      end: target.y,
      crossPosition: getOverlapCenter(
        dragged.x,
        dragged.x + dragged.width,
        target.x,
        target.x + target.width
      ),
      distance: verticalNeighbors.bottom.gap,
      equal: Boolean(verticalEqual),
    })
  }

  return guides
}

export function calculateAlignmentGuides({
  dragged,
  targets,
  threshold = DEFAULT_ALIGNMENT_THRESHOLD,
}: {
  dragged: AlignableRect
  targets: AlignmentTarget[]
  threshold?: number
}): AlignmentGuideResult {
  const availableTargets = targets.filter((target) => target.id !== dragged.id)

  const horizontalSnap = getAxisSnap(
    dragged.x,
    dragged.width,
    availableTargets.map((target) => ({
      start: target.x,
      size: target.width,
      anchors: target.xAnchors,
    })),
    threshold
  )

  const verticalSnap = getAxisSnap(
    dragged.y,
    dragged.height,
    availableTargets.map((target) => ({
      start: target.y,
      size: target.height,
      anchors: target.yAnchors,
    })),
    threshold
  )
  const distanceTargets = availableTargets.filter(
    (target) => target.measureDistance !== false
  )
  const alignedRect: AlignableRect = {
    ...dragged,
    x: horizontalSnap.start,
    y: verticalSnap.start,
  }
  const horizontalNeighbors = getNearestHorizontalNeighbors(
    alignedRect,
    distanceTargets,
    DEFAULT_DISTANCE_GUIDE_RANGE
  )
  const horizontalDistanceAdjustment =
    horizontalSnap.guidePositions.length === 0 &&
    horizontalNeighbors.left &&
    horizontalNeighbors.right
      ? (horizontalNeighbors.right.gap - horizontalNeighbors.left.gap) / 2
      : 0
  const distanceSnappedX =
    Math.abs(horizontalDistanceAdjustment) <= threshold &&
    alignedRect.x + horizontalDistanceAdjustment >= 0
      ? alignedRect.x + horizontalDistanceAdjustment
      : alignedRect.x
  const horizontallySnappedRect = {
    ...alignedRect,
    x: distanceSnappedX,
  }
  const verticalNeighbors = getNearestVerticalNeighbors(
    horizontallySnappedRect,
    distanceTargets,
    DEFAULT_DISTANCE_GUIDE_RANGE
  )
  const verticalDistanceAdjustment =
    verticalSnap.guidePositions.length === 0 &&
    verticalNeighbors.top &&
    verticalNeighbors.bottom
      ? (verticalNeighbors.bottom.gap - verticalNeighbors.top.gap) / 2
      : 0
  const distanceSnappedY =
    Math.abs(verticalDistanceAdjustment) <= threshold &&
    horizontallySnappedRect.y + verticalDistanceAdjustment >= 0
      ? horizontallySnappedRect.y + verticalDistanceAdjustment
      : horizontallySnappedRect.y
  const snappedRect = {
    ...horizontallySnappedRect,
    y: distanceSnappedY,
  }

  return {
    x: snappedRect.x,
    y: snappedRect.y,
    guides: {
      vertical: horizontalSnap.guidePositions,
      horizontal: verticalSnap.guidePositions,
      distances: getDistanceGuides(
        snappedRect,
        distanceTargets,
        DEFAULT_DISTANCE_GUIDE_RANGE
      ),
    },
  }
}
