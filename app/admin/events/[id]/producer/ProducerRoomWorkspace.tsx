import { useCallback, useEffect, useRef, useState, type JSX, type ReactNode } from "react"

type ProducerRoomWorkspaceProps = {
  leftRail: ReactNode
  centerColumn: ReactNode
  rightRail: ReactNode
  bottomDock?: ReactNode
}

export default function ProducerRoomWorkspace({
  leftRail,
  centerColumn,
  rightRail,
  bottomDock,
}: ProducerRoomWorkspaceProps): JSX.Element {
  const [bottomDockHeight, setBottomDockHeight] = useState(() => {
    if (typeof window === "undefined") return 288

    const saved = window.localStorage.getItem("producer-bottom-dock-height")
    const parsed = saved ? Number(saved) : 288

    return Number.isFinite(parsed) ? Math.min(560, Math.max(220, parsed)) : 288
  })

  const dockResizeStartYRef = useRef(0)
  const dockResizeStartHeightRef = useRef(bottomDockHeight)

  useEffect(() => {
    window.localStorage.setItem("producer-bottom-dock-height", String(bottomDockHeight))
  }, [bottomDockHeight])

  const beginBottomDockResize = useCallback(
    (event: React.MouseEvent<HTMLDivElement>): void => {
      event.preventDefault()

      dockResizeStartYRef.current = event.clientY
      dockResizeStartHeightRef.current = bottomDockHeight

      function handleMouseMove(moveEvent: MouseEvent): void {
        const delta = dockResizeStartYRef.current - moveEvent.clientY
        const maxHeight = Math.min(window.innerHeight * 0.68, 560)
        const nextHeight = Math.min(
          maxHeight,
          Math.max(220, dockResizeStartHeightRef.current + delta),
        )

        setBottomDockHeight(nextHeight)
      }

      function handleMouseUp(): void {
        window.removeEventListener("mousemove", handleMouseMove)
        window.removeEventListener("mouseup", handleMouseUp)
        document.body.style.cursor = ""
        document.body.style.userSelect = ""
      }

      document.body.style.cursor = "row-resize"
      document.body.style.userSelect = "none"
      window.addEventListener("mousemove", handleMouseMove)
      window.addEventListener("mouseup", handleMouseUp)
    },
    [bottomDockHeight],
  )

  return (
    <div
      className="grid h-full min-h-0 w-full min-w-0 gap-0 overflow-hidden px-0 pb-0 pt-0"
      style={{
        gridTemplateColumns: "82px minmax(0,1fr) 272px",
        gridTemplateRows: bottomDock
          ? `minmax(0,1fr) 8px ${bottomDockHeight}px`
          : "minmax(0,1fr)",
      }}
    >
      <div className={bottomDock ? "row-span-3 min-h-0 border-r border-white/[0.055] bg-[linear-gradient(180deg,rgba(6,10,18,0.985),rgba(2,4,9,1))] shadow-[inset_-1px_0_0_rgba(255,255,255,0.028)]" : "min-h-0 border-r border-white/[0.055] bg-[linear-gradient(180deg,rgba(6,10,18,0.985),rgba(2,4,9,1))] shadow-[inset_-1px_0_0_rgba(255,255,255,0.028)]"}>
        {leftRail}
      </div>

      <div className="relative min-h-0 min-w-0 w-full overflow-hidden bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.022),transparent_36%)] px-0">
        {centerColumn}
      </div>

      <div className="min-h-0 min-w-0 overflow-hidden border-l border-white/[0.055] bg-[linear-gradient(180deg,rgba(7,11,20,0.985),rgba(2,4,9,1))] shadow-[inset_1px_0_0_rgba(255,255,255,0.026)]">
        {rightRail}
      </div>

      {bottomDock ? (
        <>
          <div
            role="separator"
            aria-orientation="horizontal"
            title="Resize lower dock"
            onMouseDown={beginBottomDockResize}
            onDoubleClick={() => setBottomDockHeight(288)}
            className="group relative z-20 col-span-2 col-start-2 min-h-0 cursor-row-resize border-y border-white/[0.035] bg-black/20 transition hover:border-sky-300/18 hover:bg-sky-400/[0.035]"
          >
            <div className="absolute left-1/2 top-1/2 h-px w-28 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/10 transition group-hover:bg-sky-200/35" />
            <div className="absolute left-1/2 top-1/2 h-[3px] w-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/[0.045] transition group-hover:bg-sky-200/20" />
          </div>

          <div
            style={{ height: `${bottomDockHeight}px` }}
            className="col-span-2 col-start-2 min-h-0 min-w-0 overflow-hidden border-t border-white/[0.06] bg-[linear-gradient(180deg,rgba(5,8,15,0.985),rgba(2,4,8,1))] px-0 py-0 shadow-[0_-12px_30px_rgba(0,0,0,0.26),inset_0_1px_0_rgba(255,255,255,0.022)]"
          >
            {bottomDock}
          </div>
        </>
      ) : null}
    </div>
  )
}