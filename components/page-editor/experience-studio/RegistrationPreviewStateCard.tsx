"use client"

type RegistrationPreviewState =
  | "open"
  | "waitlist"
  | "closed"
  | "registered"
  | "success"

type Props = {
  value: RegistrationPreviewState
  onChange: (value: RegistrationPreviewState) => void
}

const PREVIEW_STATE_OPTIONS: ReadonlyArray<{
  value: RegistrationPreviewState
  label: string
  description: string
}> = [
  {
    value: "open",
    label: "Registration Open",
    description: "Standard attendee registration experience.",
  },
  {
    value: "waitlist",
    label: "Waitlist",
    description: "Capacity reached with waitlist handling enabled.",
  },
  {
    value: "closed",
    label: "Closed",
    description: "Registration intake is paused or unavailable.",
  },
  {
    value: "registered",
    label: "Already Registered",
    description: "Returning attendee with an existing registration.",
  },
  {
    value: "success",
    label: "Success",
    description: "Confirmation state after registration completes.",
  },
]

export default function RegistrationPreviewStateCard({ value, onChange }: Props) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
      <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/34">
        Preview State
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {PREVIEW_STATE_OPTIONS.map((option) => {
          const active = value === option.value

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`rounded-xl border px-3 py-3 text-left transition ${
                active
                  ? "border-sky-300/30 bg-sky-400/10 text-sky-100"
                  : "border-white/10 bg-white/[0.03] text-white/55 hover:bg-white/[0.06]"
              }`}
            >
              <div className="text-[10px] font-black uppercase tracking-[0.12em]">
                {option.label}
              </div>

              <div className={`mt-1 text-[11px] leading-4 ${active ? "text-sky-100/58" : "text-white/30"}`}>
                {option.description}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}