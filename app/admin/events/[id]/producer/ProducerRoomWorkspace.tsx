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
    <div className="grid h-full min-h-0 w-full min-w-0 grid-cols-[92px_minmax(0,1fr)_300px] grid-rows-[minmax(0,1fr)_clamp(340px,34vh,430px)] gap-0 overflow-hidden px-0 pb-0 pt-0">
      <div className="row-span-2 min-h-0 border-r border-white/[0.04] bg-[linear-gradient(180deg,rgba(8,12,22,0.96),rgba(3,5,11,0.985))]">
        {leftRail}
      </div>

      <div className="min-h-0 min-w-0 w-full overflow-hidden px-0">
        {centerColumn}
      </div>

      <div className="min-h-0 min-w-0 overflow-hidden border-l border-white/[0.04] bg-[linear-gradient(180deg,rgba(8,12,22,0.96),rgba(3,5,11,0.985))]">
        {rightRail}
      </div>

      {bottomDock ? (
        <div className="col-span-2 col-start-2 min-h-0 min-w-0 border-t border-white/[0.045] bg-[linear-gradient(180deg,rgba(8,12,22,0.96),rgba(3,5,11,0.985))] px-0 py-0">
          {bottomDock}
        </div>
      ) : null}
    </div>
  )
}