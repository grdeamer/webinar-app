import type { JSX, ReactNode } from "react"

type ProducerRoomWorkspaceProps = {
  leftRail: ReactNode
  centerColumn: ReactNode
  rightRail: ReactNode
}

export default function ProducerRoomWorkspace({
  leftRail,
  centerColumn,
  rightRail,
}: ProducerRoomWorkspaceProps): JSX.Element {
  return (
    <>
      {leftRail}
      {centerColumn}
      {rightRail}
    </>
  )
}