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
}

export type AlignmentGuides = {
  vertical: number[]
  horizontal: number[]
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

const DEFAULT_ALIGNMENT_THRESHOLD = 8
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

  return {
    x: horizontalSnap.start,
    y: verticalSnap.start,
    guides: {
      vertical: horizontalSnap.guidePositions,
      horizontal: verticalSnap.guidePositions,
    },
  }
}
