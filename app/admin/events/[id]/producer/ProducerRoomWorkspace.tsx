import { useCallback, useEffect, useRef, useState, type JSX, type ReactNode } from "react"

const PRODUCER_BOTTOM_DOCK_STORAGE_KEY = "producer-bottom-dock-height-v3"
const DEFAULT_BOTTOM_DOCK_HEIGHT = 360
const MIN_BOTTOM_DOCK_HEIGHT = 300
const MAX_BOTTOM_DOCK_HEIGHT = 520
const MAX_BOTTOM_DOCK_VIEWPORT_RATIO = 0.58

function clampBottomDockHeight(height: number, viewportHeight?: number): number {
  const responsiveMaximum = viewportHeight
    ? Math.min(MAX_BOTTOM_DOCK_HEIGHT, viewportHeight * MAX_BOTTOM_DOCK_VIEWPORT_RATIO)
    : MAX_BOTTOM_DOCK_HEIGHT

  return Math.min(responsiveMaximum, Math.max(MIN_BOTTOM_DOCK_HEIGHT, height))
}

type ProducerRoomWorkspaceProps = {
  leftRail: ReactNode
  centerColumn: ReactNode
  rightRail: ReactNode
  bottomDock?: ReactNode
  bottomDockExpanded?: boolean
}

export default function ProducerRoomWorkspace({
  leftRail,
  centerColumn,
  rightRail,
  bottomDock,
  bottomDockExpanded = true,
}: ProducerRoomWorkspaceProps): JSX.Element {
  const [bottomDockHeight, setBottomDockHeight] = useState(() => {
    if (typeof window === "undefined") return DEFAULT_BOTTOM_DOCK_HEIGHT

    const saved = window.localStorage.getItem(PRODUCER_BOTTOM_DOCK_STORAGE_KEY)
    const responsiveDefault = Math.min(DEFAULT_BOTTOM_DOCK_HEIGHT, window.innerHeight * 0.46)
    const parsed = saved ? Number(saved) : responsiveDefault

    return Number.isFinite(parsed)
      ? clampBottomDockHeight(parsed, window.innerHeight)
      : responsiveDefault
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

  const resolvedBottomDockHeight = bottomDockExpanded ? bottomDockHeight : 92
  const gridTemplateRows = bottomDock
    ? `minmax(0,1fr) 8px ${resolvedBottomDockHeight}px`
    : "minmax(0,1fr)"

  const railChromeClassName =
    "min-h-0 overflow-hidden border-white/[0.06] bg-[linear-gradient(180deg,rgba(17,23,44,0.96),rgba(8,11,25,0.99))]"

  return (
    <div
      className="grid h-full min-h-0 w-full min-w-0 grid-cols-[104px_minmax(0,1fr)_300px] gap-3 overflow-hidden p-4 pt-3"
      style={{ gridTemplateRows }}
    >
      <div
        className={`producer-rail producer-rail--navigation ${bottomDock ? "row-span-3" : ""} ${railChromeClassName} rounded-[10px] border shadow-[inset_-1px_0_0_rgba(255,255,255,0.028)]`}
      >
        {leftRail}
      </div>

      <div className="producer-center-surface relative min-h-0 min-w-0 w-full overflow-hidden rounded-[10px] border border-white/[0.07] bg-[linear-gradient(180deg,rgba(10,15,28,0.97),rgba(4,7,15,0.99))] px-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]">
        {centerColumn}
      </div>

      <div className="producer-rail producer-rail--stage row-span-3 col-start-3 row-start-1 min-h-0 min-w-0 overflow-hidden rounded-[10px] border border-white/[0.07] bg-[linear-gradient(180deg,rgba(15,20,34,0.98),rgba(7,10,20,0.99))] shadow-[inset_1px_0_0_rgba(255,255,255,0.026)]">
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
            style={{ height: `${resolvedBottomDockHeight}px` }}
            className="producer-bottom-dock col-start-2 min-h-0 min-w-0 overflow-hidden border-t border-white/[0.06] bg-[linear-gradient(180deg,rgba(5,8,15,0.985),rgba(2,4,8,1))] px-0 py-0 shadow-[0_-12px_30px_rgba(0,0,0,0.26),inset_0_1px_0_rgba(255,255,255,0.022)]"
          >
            {bottomDock}
          </div>
        </>
      ) : null}
    </div>
  )
}
