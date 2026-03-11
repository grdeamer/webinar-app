"use client"

import React from "react"

type DockItemRender<T> = (args: { item: T; scale: number; isHot: boolean; index: number }) => React.ReactNode

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n))
}

/**
 * Dock-style magnification:
 * - hovered item scales up
 * - neighbors scale slightly less
 * - smooth spring-ish transition via CSS
 *
 * distanceFalloff: how quickly scale drops for neighbors (higher = tighter)
 */
export default function DockMagnifyList<T>({
  items,
  render,
  maxScale = 1.18,
  neighborScale = 1.08,
  distanceFalloff = 1.35,
  className,
}: {
  items: T[]
  render: DockItemRender<T>
  maxScale?: number
  neighborScale?: number
  distanceFalloff?: number
  className?: string
}) {
  const [hotIndex, setHotIndex] = React.useState<number | null>(null)

  const scales = React.useMemo(() => {
    if (hotIndex == null) return items.map(() => 1)
    return items.map((_, i) => {
      const d = Math.abs(i - hotIndex)
      if (d === 0) return maxScale
      // Neighbor curve: 1st neighbor near neighborScale, then falls to 1
      const t = Math.exp(-d * distanceFalloff) // 0..1
      const s = 1 + (neighborScale - 1) * t
      return clamp(s, 1, neighborScale)
    })
  }, [items, hotIndex, maxScale, neighborScale, distanceFalloff])

  return (
    <div
      className={className}
      onMouseLeave={() => setHotIndex(null)}
      onPointerLeave={() => setHotIndex(null)}
    >
      {items.map((item, i) => {
        const scale = scales[i] ?? 1
        const isHot = hotIndex === i

        return (
          <div
            key={i}
            onMouseEnter={() => setHotIndex(i)}
            onPointerEnter={() => setHotIndex(i)}
            className="origin-center"
            style={{
              transform: `scale(${scale})`,
              transition: "transform 170ms cubic-bezier(.2,.8,.2,1)",
              willChange: "transform",
            }}
          >
            {render({ item, scale, isHot, index: i })}
          </div>
        )
      })}
    </div>
  )
}