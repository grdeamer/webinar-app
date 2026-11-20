"use client"

import type { ComponentProps } from "react"
import AgendaInspector from "@/components/page-editor/experience-studio/AgendaInspector"
import SystemComponentInspector from "@/components/page-editor/experience-studio/SystemComponentInspector"

type AgendaInspectorProps = ComponentProps<typeof AgendaInspector>

type Props = Omit<AgendaInspectorProps, "title" | "description" | "onChange"> & {
  componentKey: string
  title?: string
  body?: string
  onChange: (patch: Omit<Parameters<AgendaInspectorProps["onChange"]>[0], "description"> & { body?: string }) => void
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
        onChange={(patch) => {
          const { description, ...settings } = patch
          onChange(description === undefined ? settings : { ...settings, body: description })
        }}
      />
    </SystemComponentInspector>
  )
}
