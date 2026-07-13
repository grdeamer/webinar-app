

"use client"

export type RegistrationVariant = "editorial" | "minimal"

type Props = {
  value: RegistrationVariant
  onChange: (value: RegistrationVariant) => void
}

const VARIANT_OPTIONS: ReadonlyArray<{
  value: RegistrationVariant
  label: string
  description: string
}> = [
  {
    value: "editorial",
    label: "Editorial",
    description: "Full visual treatment with richer chrome and authoring context.",
  },
  {
    value: "minimal",
    label: "Minimal",
    description: "Compact presentation with reduced chrome and cleaner focus.",
  },
]

export default function RegistrationVariantCard({ value, onChange }: Props) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
      <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/34">
        Variant
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {VARIANT_OPTIONS.map((option) => {
          const active = value === option.value

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`rounded-xl border px-3 py-3 text-left transition ${
                active
                  ? "border-violet-300/30 bg-violet-400/10 text-violet-100"
                  : "border-white/10 bg-white/[0.03] text-white/55 hover:bg-white/[0.06]"
              }`}
            >
              <div className="text-[10px] font-black uppercase tracking-[0.12em]">
                {option.label}
              </div>

              <div
                className={`mt-1 text-[11px] leading-4 ${
                  active ? "text-violet-100/58" : "text-white/30"
                }`}
              >
                {option.description}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}