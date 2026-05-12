import type { JSX, ReactNode } from "react"

type ProducerRoomWorkspaceProps = {
  children: ReactNode
}

export default function ProducerRoomWorkspace({
  children,
}: ProducerRoomWorkspaceProps): JSX.Element {
  return <>{children}</>
}