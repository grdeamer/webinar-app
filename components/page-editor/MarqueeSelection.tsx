"use client"

type Props = {
  startX: number
  startY: number
  currentX: number
  currentY: number
}

export default function MarqueeSelection({
  startX,
  startY,
  currentX,
  currentY,
}: Props) {
  const left = Math.min(startX, currentX)
  const top = Math.min(startY, currentY)
  const width = Math.abs(currentX - startX)
  const height = Math.abs(currentY - startY)

  return (
    <div
      className="pointer-events-none absolute border border-sky-400 bg-sky-400/15"
      style={{
        left,
        top,
        width,
        height,
        zIndex: 9999,
      }}
    />
  )
}
