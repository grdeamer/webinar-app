import { useCallback, useEffect, useRef, useState, type JSX, type ReactNode } from "react"

const PRODUCER_BOTTOM_DOCK_STORAGE_KEY = "producer-bottom-dock-height"
const DEFAULT_BOTTOM_DOCK_HEIGHT = 288
const MIN_BOTTOM_DOCK_HEIGHT = 220
const MAX_BOTTOM_DOCK_HEIGHT = 560
const MAX_BOTTOM_DOCK_VIEWPORT_RATIO = 0.68

const PRODUCER_WORKSPACE_GRID_COLUMNS = "82px minmax(0,1fr) 272px"

function clampBottomDockHeight(height: number): number {
  return Math.min(MAX_BOTTOM_DOCK_HEIGHT, Math.max(MIN_BOTTOM_DOCK_HEIGHT, height))
}

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
    if (typeof window === "undefined") return DEFAULT_BOTTOM_DOCK_HEIGHT

    const saved = window.localStorage.getItem(PRODUCER_BOTTOM_DOCK_STORAGE_KEY)
    const parsed = saved ? Number(saved) : DEFAULT_BOTTOM_DOCK_HEIGHT

    return Number.isFinite(parsed)
      ? clampBottomDockHeight(parsed)
      : DEFAULT_BOTTOM_DOCK_HEIGHT
  })

  const dockResizeStartYRef = useRef(0)
  const dockResizeStartHeightRef = useRef(bottomDockHeight)

  useEffect(() => {
    window.localStorage.setItem(
      PRODUCER_BOTTOM_DOCK_STORAGE_KEY,
      String(bottomDockHeight),
    )
  }, [bottomDockHeight])

  const beginBottomDockResize = useCallback(
    (event: React.MouseEvent<HTMLDivElement>): void => {
      event.preventDefault()

      dockResizeStartYRef.current = event.clientY
      dockResizeStartHeightRef.current = bottomDockHeight

      function handleMouseMove(moveEvent: MouseEvent): void {
        const delta = dockResizeStartYRef.current - moveEvent.clientY
        const viewportConstrainedMaxHeight = Math.min(
          window.innerHeight * MAX_BOTTOM_DOCK_VIEWPORT_RATIO,
          MAX_BOTTOM_DOCK_HEIGHT,
        )
        const nextHeight = Math.min(
          viewportConstrainedMaxHeight,
          Math.max(MIN_BOTTOM_DOCK_HEIGHT, dockResizeStartHeightRef.current + delta),
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

  const resetBottomDockHeight = useCallback((): void => {
    setBottomDockHeight(DEFAULT_BOTTOM_DOCK_HEIGHT)
  }, [])

  const gridTemplateRows = bottomDock
    ? `minmax(0,1fr) 8px ${bottomDockHeight}px`
    : "minmax(0,1fr)"

  const railChromeClassName =
    "min-h-0 overflow-hidden border-white/[0.06] bg-[linear-gradient(180deg,rgba(17,23,44,0.96),rgba(8,11,25,0.99))]"

  return (
    <div
      className="grid h-full min-h-0 w-full min-w-0 gap-2 overflow-hidden p-2"
      style={{
        gridTemplateColumns: PRODUCER_WORKSPACE_GRID_COLUMNS,
        gridTemplateRows,
      }}
    >
      <div
        className={`${bottomDock ? "row-span-3" : ""} ${railChromeClassName} rounded-[18px] border shadow-[inset_-1px_0_0_rgba(255,255,255,0.028)]`}
      >
        {leftRail}
      </div>

      <div className="relative min-h-0 min-w-0 w-full overflow-hidden rounded-[20px] border border-white/[0.055] bg-[radial-gradient(circle_at_top,rgba(112,87,255,0.055),transparent_38%),linear-gradient(180deg,rgba(11,16,36,0.94),rgba(5,8,20,0.98))] px-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]">
        {centerColumn}
      </div>

      <div className="row-span-3 col-start-3 row-start-1 min-h-0 min-w-0 overflow-hidden rounded-[18px] border border-white/[0.06] bg-[linear-gradient(180deg,rgba(17,23,44,0.96),rgba(8,11,25,0.99))] shadow-[inset_1px_0_0_rgba(255,255,255,0.026)]">
        {rightRail}
      </div>

      {bottomDock ? (
        <>
          <div
            role="separator"
            aria-orientation="horizontal"
            title="Resize lower dock"
            onMouseDown={beginBottomDockResize}
            onDoubleClick={resetBottomDockHeight}
            className="group relative z-20 col-start-2 min-h-0 cursor-row-resize border-y border-white/[0.035] bg-black/20 transition hover:border-sky-300/18 hover:bg-sky-400/[0.035]"
          >
            <div className="absolute left-1/2 top-1/2 h-px w-28 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/10 transition group-hover:bg-sky-200/35" />
            <div className="absolute left-1/2 top-1/2 h-[3px] w-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/[0.045] transition group-hover:bg-sky-200/20" />
          </div>

          <div
            style={{ height: `${bottomDockHeight}px` }}
            className="col-start-2 min-h-0 min-w-0 overflow-hidden border-t border-white/[0.06] bg-[linear-gradient(180deg,rgba(5,8,15,0.985),rgba(2,4,8,1))] px-0 py-0 shadow-[0_-12px_30px_rgba(0,0,0,0.26),inset_0_1px_0_rgba(255,255,255,0.022)]"
          >
            {bottomDock}
          </div>
        </>
      ) : null}
    </div>
  )
}
