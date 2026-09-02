"use client"

import { useMemo } from "react"

export type CanvasGridOverlayProps = {
  showGrid?: boolean
  showRulers?: boolean
  gridSize?: number
  majorGridSize?: number
  scale?: number
}

export function CanvasGridOverlay({
  showGrid = true,
  showRulers = false,
  gridSize = 8,
  majorGridSize = 64,
  scale = 1,
}: CanvasGridOverlayProps) {
  const dotPattern = useMemo(
    () =>
      `radial-gradient(circle, rgba(255,255,255,0.18) 1px, transparent 1px) 0 0 / ${gridSize}px ${gridSize}px`,
    [gridSize],
  )

  const majorPattern = useMemo(
    () =>
      `linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px) 0 0 / ${majorGridSize}px ${majorGridSize}px, linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px) 0 0 / ${majorGridSize}px ${majorGridSize}px`,
    [majorGridSize],
  )

  const rulerTickStep = useMemo(() => {
    const scaled = majorGridSize * scale
    if (scaled < 32) return majorGridSize * 2
    return majorGridSize
  }, [majorGridSize, scale])

  if (!showGrid && !showRulers) return null

  return (
    <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden">
      {showGrid && (
        <div
          className="absolute inset-0"
          style={{ background: `${dotPattern}, ${majorPattern}` }}
        />
      )}
      {showRulers && (
        <>
          <div className="absolute left-0 top-0 h-6 w-full border-b border-white/10 bg-[#080b14]/90 backdrop-blur-sm">
            {Array.from({ length: Math.ceil(2000 / rulerTickStep) }).map((_, i) => (
              <div
                key={`h-${i}`}
                className="absolute top-0 h-full border-l border-white/20"
                style={{ left: i * rulerTickStep }}
              >
                {i % 2 === 0 && (
                  <span className="absolute left-0.5 top-0.5 text-[8px] text-white/50">
                    {i * rulerTickStep}
                  </span>
                )}
              </div>
            ))}
          </div>
          <div className="absolute left-0 top-0 h-full w-6 border-r border-white/10 bg-[#080b14]/90 backdrop-blur-sm">
            {Array.from({ length: Math.ceil(2000 / rulerTickStep) }).map((_, i) => (
              <div
                key={`v-${i}`}
                className="absolute left-0 w-full border-t border-white/20"
                style={{ top: i * rulerTickStep }}
              >
                {i % 2 === 0 && (
                  <span className="absolute left-0.5 top-0.5 block -rotate-90 text-[8px] text-white/50">
                    {i * rulerTickStep}
                  </span>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default CanvasGridOverlay
