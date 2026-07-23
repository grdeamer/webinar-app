"use client"

import type { ComponentProps } from "react"
import AgendaInspector from "@/components/page-editor/experience-studio/AgendaInspector"
import SystemComponentInspector from "@/components/page-editor/experience-studio/SystemComponentInspector"

type AgendaInspectorProps = ComponentProps<typeof AgendaInspector>

type Props = Omit<AgendaInspectorProps, "title" | "description"> & {
  componentKey: string
  title?: string
  body?: string
}

export default function AgendaInspectorPanel({
  componentKey,
  title,
  body,
  displayMode,
  showTime,
  showDescriptions,
  groupByDay,
  emptyStateText,
  onChange,
}: Props) {
  return (
    <SystemComponentInspector componentKey={componentKey} title={title} body={body}>
      <AgendaInspector
        title={title ?? "Event Agenda"}
        description={body ?? "Browse the event schedule."}
        displayMode={displayMode}
        showTime={showTime}
        showDescriptions={showDescriptions}
        groupByDay={groupByDay}
        emptyStateText={emptyStateText}
        onChange={onChange}
      />
    </SystemComponentInspector>
  )
}
