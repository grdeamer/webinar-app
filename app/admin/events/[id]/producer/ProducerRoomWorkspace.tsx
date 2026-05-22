import type { JSX, ReactNode } from "react"

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
  return (
    <div className="grid h-full min-h-0 w-full min-w-0 grid-cols-[82px_minmax(0,1fr)_272px] grid-rows-[minmax(0,1fr)_clamp(248px,24vh,320px)] gap-0 overflow-hidden px-0 pb-0 pt-0">
      <div className="row-span-2 min-h-0 border-r border-white/[0.055] bg-[linear-gradient(180deg,rgba(6,10,18,0.985),rgba(2,4,9,1))] shadow-[inset_-1px_0_0_rgba(255,255,255,0.028)]">
        {leftRail}
      </div>

      <div className="relative min-h-0 min-w-0 w-full overflow-hidden bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.022),transparent_36%)] px-0">
        {centerColumn}
      </div>

      <div className="min-h-0 min-w-0 overflow-hidden border-l border-white/[0.055] bg-[linear-gradient(180deg,rgba(7,11,20,0.985),rgba(2,4,9,1))] shadow-[inset_1px_0_0_rgba(255,255,255,0.026)]">
        {rightRail}
      </div>

      {bottomDock ? (
        <div className="col-span-2 col-start-2 min-h-0 min-w-0 border-t border-white/[0.06] bg-[linear-gradient(180deg,rgba(5,8,15,0.985),rgba(2,4,8,1))] shadow-[0_-12px_30px_rgba(0,0,0,0.26),inset_0_1px_0_rgba(255,255,255,0.022)] px-0 py-0">
          {bottomDock}
        </div>
      ) : null}
    </div>
  )
}