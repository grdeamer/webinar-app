"use client"

import type { ComponentProps } from "react"
import RegistrationInspector from "@/components/page-editor/experience-studio/RegistrationInspector"
import SystemComponentInspector from "@/components/page-editor/experience-studio/SystemComponentInspector"

type Props = ComponentProps<typeof RegistrationInspector> & {
  componentKey: string
  title?: string
  body?: string
}

export default function RegistrationInspectorPanel({
  componentKey,
  title,
  body,
  previewState,
  variant,
  copyValues,
  fields,
  onChangePreviewState,
  onChangeVariant,
  onChangeCopy,
  onResetFields,
  onMoveField,
  onUpdateField,
  onAddFieldTemplate,
  onRemoveField,
}: Props) {
  return (
    <SystemComponentInspector componentKey={componentKey} title={title} body={body}>
      <RegistrationInspector
        previewState={previewState}
        variant={variant}
        copyValues={copyValues}
        fields={fields}
        onChangePreviewState={onChangePreviewState}
        onChangeVariant={onChangeVariant}
        onChangeCopy={onChangeCopy}
        onResetFields={onResetFields}
        onMoveField={onMoveField}
        onUpdateField={onUpdateField}
        onAddFieldTemplate={onAddFieldTemplate}
        onRemoveField={onRemoveField}
      />
    </SystemComponentInspector>
  )
}
