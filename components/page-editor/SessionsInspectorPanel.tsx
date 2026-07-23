"use client"

import type { ComponentProps } from "react"
import SessionsInspector from "@/components/page-editor/experience-studio/SessionsInspector"
import SystemComponentInspector from "@/components/page-editor/experience-studio/SystemComponentInspector"

type SessionsInspectorProps = ComponentProps<typeof SessionsInspector>

type Props = Omit<SessionsInspectorProps, "title" | "description"> & {
  componentKey: string
  title?: string
  body?: string
}

export default function SessionsInspectorPanel({
  componentKey,
  title,
  body,
  displayMode,
  showTime,
  showDescriptions,
  showPresenter,
  showJoinAction,
  emptyStateText,
  onChange,
}: Props) {
  return (
    <SystemComponentInspector componentKey={componentKey} title={title} body={body}>
      <SessionsInspector
        title={title ?? "My Sessions"}
        description={body ?? "Browse the sessions available for this event."}
        displayMode={displayMode}
        showTime={showTime}
        showDescriptions={showDescriptions}
        showPresenter={showPresenter}
        showJoinAction={showJoinAction}
        emptyStateText={emptyStateText}
        onChange={onChange}
      />
    </SystemComponentInspector>
  )
}
