"use client"

type RegistrationCopyKey =
  | "title"
  | "body"
  | "ctaLabel"
  | "confirmationTitle"
  | "confirmationBody"

type Props = {
  values: Partial<Record<RegistrationCopyKey, string>>
  onChange: (key: RegistrationCopyKey, value: string) => void
}

const COPY_FIELDS: ReadonlyArray<{
  key: RegistrationCopyKey
  label: string
  placeholder: string
  multiline?: boolean
}> = [
  {
    key: "title",
    label: "Title",
    placeholder: "Reserve Your Place",
  },
  {
    key: "body",
    label: "Body",
    placeholder:
      "Native Jupiter registration flow with field builder, session binding, waitlist, and reservation state.",
    multiline: true,
  },
  {
    key: "ctaLabel",
    label: "CTA Label",
    placeholder: "Start Registration",
  },
  {
    key: "confirmationTitle",
    label: "Confirmation Title",
    placeholder: "Registration Confirmed",
  },
  {
    key: "confirmationBody",
    label: "Confirmation Body",
    placeholder:
      "Your registration is part of the live Jupiter event experience now.",
    multiline: true,
  },
]

export default function RegistrationCopyCard({ values, onChange }: Props) {
  return (
    <div className="rounded-2xl border border-sky-200/12 bg-sky-400/[0.045] p-3">
      <div className="text-[10px] font-black uppercase tracking-[0.16em] text-sky-50/44">
        Registration Copy
      </div>

      <div className="mt-3 space-y-3">
        {COPY_FIELDS.map((field) => (
          <label key={field.key} className="block">
            <div className="text-[10px] font-black uppercase tracking-[0.14em] text-white/32">
              {field.label}
            </div>

            {field.multiline ? (
              <textarea
                value={values[field.key] ?? ""}
                onChange={(event) => onChange(field.key, event.target.value)}
                placeholder={field.placeholder}
                className="mt-2 min-h-20 w-full resize-none rounded-xl border border-white/10 bg-black/24 px-3 py-2 text-sm text-white/72 outline-none transition placeholder:text-white/24 focus:border-sky-200/28"
              />
            ) : (
              <input
                value={values[field.key] ?? ""}
                onChange={(event) => onChange(field.key, event.target.value)}
                placeholder={field.placeholder}
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/24 px-3 py-2 text-sm text-white/72 outline-none transition placeholder:text-white/24 focus:border-sky-200/28"
              />
            )}
          </label>
        ))}
      </div>
    </div>
  )
}