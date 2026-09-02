"use client"

type ResizeHandle = "nw" | "n" | "ne" | "w" | "e" | "sw" | "s" | "se"

type Props = {
  disabled?: boolean
  onResizeStart: (
    e: React.PointerEvent<HTMLDivElement>,
    handle: ResizeHandle
  ) => void
  handles?: ResizeHandle[]
}

const HANDLE_DEFINITIONS: Array<{
  key: ResizeHandle
  position: string
  cursor: string
}> = [
  { key: "nw", position: "left-0 top-0 -translate-x-1/2 -translate-y-1/2", cursor: "cursor-nw-resize" },
  { key: "n", position: "left-1/2 top-0 -translate-x-1/2 -translate-y-1/2", cursor: "cursor-n-resize" },
  { key: "ne", position: "right-0 top-0 translate-x-1/2 -translate-y-1/2", cursor: "cursor-ne-resize" },
  { key: "w", position: "left-0 top-1/2 -translate-x-1/2 -translate-y-1/2", cursor: "cursor-w-resize" },
  { key: "e", position: "right-0 top-1/2 translate-x-1/2 -translate-y-1/2", cursor: "cursor-e-resize" },
  { key: "sw", position: "left-0 bottom-0 -translate-x-1/2 translate-y-1/2", cursor: "cursor-sw-resize" },
  { key: "s", position: "left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2", cursor: "cursor-s-resize" },
  { key: "se", position: "right-0 bottom-0 translate-x-1/2 translate-y-1/2", cursor: "cursor-se-resize" },
]

export default function ResizeHandles({
  disabled = false,
  onResizeStart,
  handles = ["nw", "n", "ne", "w", "e", "sw", "s", "se"],
}: Props) {
  const allowed = new Set(handles)

  return (
    <>
      {HANDLE_DEFINITIONS.filter((handle) => allowed.has(handle.key)).map((handle) => (
        <div
          key={handle.key}
          data-resize-handle="true"
          onPointerDown={(e) => {
            if (disabled) return
            onResizeStart(e, handle.key)
          }}
          className={`absolute ${handle.position} z-10 h-2.5 w-2.5 rounded-full border border-white bg-sky-400 shadow-[0_0_0_1px_rgba(0,0,0,0.5)] ${
            disabled ? "cursor-not-allowed opacity-30" : handle.cursor
          }`}
        />
      ))}
    </>
  )
}

export type { ResizeHandle }
