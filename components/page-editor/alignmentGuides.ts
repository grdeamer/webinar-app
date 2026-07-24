export type AlignableRect = {
  id: string
  x: number
  y: number
  width: number
  height: number
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

function getAxisAnchors(start: number, size: number) {
  return [start, start + size / 2, start + size] as const
}

function getAxisSnap(
  proposedStart: number,
  draggedSize: number,
  targetAxes: Array<{ start: number; size: number }>,
  threshold: number
) {
  const draggedAnchors = getAxisAnchors(proposedStart, draggedSize)
  const candidates: AlignmentCandidate[] = []

  for (const targetAxis of targetAxes) {
    const targetAnchors = getAxisAnchors(targetAxis.start, targetAxis.size)

    for (let anchorIndex = 0; anchorIndex < draggedAnchors.length; anchorIndex += 1) {
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
  targets: AlignableRect[]
  threshold?: number
}): AlignmentGuideResult {
  const availableTargets = targets.filter((target) => target.id !== dragged.id)

  const horizontalSnap = getAxisSnap(
    dragged.x,
    dragged.width,
    availableTargets.map((target) => ({
      start: target.x,
      size: target.width,
    })),
    threshold
  )

  const verticalSnap = getAxisSnap(
    dragged.y,
    dragged.height,
    availableTargets.map((target) => ({
      start: target.y,
      size: target.height,
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
