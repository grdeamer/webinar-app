

"use client"

export type RegistrationInspectorField = {
  id: string
  label: string
  placeholder?: string
  fieldType: string
  required: boolean
  visible: boolean
  locked?: boolean
  width: "half" | "full"
  systemRole?: string
}

type RegistrationFieldTemplate = "jobTitle" | "phone" | "dietaryNeeds"

type Props = {
  fields: RegistrationInspectorField[]
  onReset: () => void
  onMove: (fieldId: string, direction: "up" | "down") => void
  onUpdate: (
    fieldId: string,
    patch: Partial<RegistrationInspectorField>
  ) => void
  onAddTemplate: (template: RegistrationFieldTemplate) => void
  onRemove: (fieldId: string) => void
}

const ADD_FIELD_OPTIONS: ReadonlyArray<{
  value: RegistrationFieldTemplate
  label: string
}> = [
  { value: "jobTitle", label: "+ Job Title" },
  { value: "phone", label: "+ Phone" },
  { value: "dietaryNeeds", label: "+ Dietary" },
]

export default function RegistrationFieldsCard({
  fields,
  onReset,
  onMove,
  onUpdate,
  onAddTemplate,
  onRemove,
}: Props) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/34">
            Registration Fields
          </div>

          <div className="mt-1 text-xs leading-5 text-white/38">
            Persisted registration schema preview.
          </div>
        </div>

        <button
          type="button"
          onClick={onReset}
          className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-white/46 transition hover:bg-white/[0.06]"
        >
          Reset
        </button>
      </div>

      <div className="mt-3 space-y-3">
        {fields.map((field, index) => (
          <div
            key={field.id}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-3"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-white/72">
                  {field.label}
                </div>

                <div className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-white/28">
                  {field.systemRole ?? "custom"} · {field.fieldType} · {field.width}
                  {field.locked ? " · locked" : ""}
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onMove(field.id, "up")}
                  disabled={index === 0}
                  className="rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-xs font-black text-white/50 transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-25"
                >
                  ↑
                </button>

                <button
                  type="button"
                  onClick={() => onMove(field.id, "down")}
                  disabled={index === fields.length - 1}
                  className="rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-xs font-black text-white/50 transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-25"
                >
                  ↓
                </button>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <label className="block">
                <div className="text-[10px] font-black uppercase tracking-[0.14em] text-white/28">
                  Label
                </div>

                <input
                  value={field.label}
                  onChange={(event) =>
                    onUpdate(field.id, { label: event.target.value })
                  }
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/24 px-3 py-2 text-sm text-white/72 outline-none transition focus:border-sky-200/28"
                />
              </label>

              <label className="block">
                <div className="text-[10px] font-black uppercase tracking-[0.14em] text-white/28">
                  Placeholder
                </div>

                <input
                  value={field.placeholder ?? ""}
                  onChange={(event) =>
                    onUpdate(field.id, { placeholder: event.target.value })
                  }
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/24 px-3 py-2 text-sm text-white/72 outline-none transition focus:border-sky-200/28"
                />
              </label>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => onUpdate(field.id, { visible: !field.visible })}
                disabled={field.locked}
                className={`rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] transition ${
                  field.visible
                    ? "border-emerald-200/18 bg-emerald-400/10 text-emerald-50/60"
                    : "border-red-200/18 bg-red-400/10 text-red-50/60"
                } ${
                  field.locked
                    ? "cursor-not-allowed opacity-45"
                    : "hover:bg-white/[0.06]"
                }`}
              >
                {field.visible ? "Shown" : "Hidden"}
              </button>

              <button
                type="button"
                onClick={() => onUpdate(field.id, { required: !field.required })}
                disabled={field.locked}
                className={`rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] transition ${
                  field.required
                    ? "border-sky-200/18 bg-sky-400/10 text-sky-50/60"
                    : "border-white/10 bg-white/[0.03] text-white/36"
                } ${
                  field.locked
                    ? "cursor-not-allowed opacity-45"
                    : "hover:bg-white/[0.06]"
                }`}
              >
                {field.required ? "Req" : "Opt"}
              </button>

              <button
                type="button"
                onClick={() =>
                  onUpdate(field.id, {
                    width: field.width === "full" ? "half" : "full",
                  })
                }
                className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-white/42 transition hover:bg-white/[0.06]"
              >
                {field.width}
              </button>
            </div>

            {!field.locked ? (
              <button
                type="button"
                onClick={() => onRemove(field.id)}
                className="mt-3 w-full rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-red-100/70 transition hover:bg-red-500/20"
              >
                Remove Field
              </button>
            ) : null}
          </div>
        ))}
      </div>

      <div className="mt-4 border-t border-white/10 pt-4">
        <div className="mb-3 text-[10px] font-black uppercase tracking-[0.14em] text-white/34">
          Add Field
        </div>

        <div className="grid grid-cols-3 gap-2">
          {ADD_FIELD_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onAddTemplate(option.value)}
              className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-white/60 transition hover:bg-white/[0.06]"
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}