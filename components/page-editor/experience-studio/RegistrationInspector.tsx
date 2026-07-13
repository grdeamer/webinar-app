

"use client"

import RegistrationCopyCard from "./RegistrationCopyCard"
import RegistrationFieldsCard, {
  type RegistrationInspectorField,
} from "./RegistrationFieldsCard"
import RegistrationPreviewStateCard, {
  type RegistrationPreviewState,
} from "./RegistrationPreviewStateCard"
import RegistrationVariantCard, {
  type RegistrationVariant,
} from "./RegistrationVariantCard"

type RegistrationCopyKey =
  | "title"
  | "body"
  | "ctaLabel"
  | "confirmationTitle"
  | "confirmationBody"

type RegistrationFieldTemplate = "jobTitle" | "phone" | "dietaryNeeds"

type Props = {
  previewState: RegistrationPreviewState
  variant: RegistrationVariant
  copyValues: Partial<Record<RegistrationCopyKey, string>>
  fields: RegistrationInspectorField[]
  onChangePreviewState: (value: RegistrationPreviewState) => void
  onChangeVariant: (value: RegistrationVariant) => void
  onChangeCopy: (key: RegistrationCopyKey, value: string) => void
  onResetFields: () => void
  onMoveField: (fieldId: string, direction: "up" | "down") => void
  onUpdateField: (
    fieldId: string,
    patch: Partial<RegistrationInspectorField>
  ) => void
  onAddFieldTemplate: (template: RegistrationFieldTemplate) => void
  onRemoveField: (fieldId: string) => void
}

export default function RegistrationInspector({
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
    <div className="space-y-4">
      <RegistrationPreviewStateCard
        value={previewState}
        onChange={onChangePreviewState}
      />

      <RegistrationVariantCard
        value={variant}
        onChange={onChangeVariant}
      />

      <RegistrationCopyCard
        values={copyValues}
        onChange={onChangeCopy}
      />

      <RegistrationFieldsCard
        fields={fields}
        onReset={onResetFields}
        onMove={onMoveField}
        onUpdate={onUpdateField}
        onAddTemplate={onAddFieldTemplate}
        onRemove={onRemoveField}
      />
    </div>
  )
}