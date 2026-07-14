

"use client"

export type SessionsDisplayMode = "list" | "cards" | "featured"

type Props = {
  title: string
  description: string
  displayMode: SessionsDisplayMode
  showTime: boolean
  showDescriptions: boolean
  showPresenter: boolean
  showJoinAction: boolean
  emptyStateText: string
  onChange: (patch: {
    title?: string
    description?: string
    displayMode?: SessionsDisplayMode
    showTime?: boolean
    showDescriptions?: boolean
    showPresenter?: boolean
    showJoinAction?: boolean
    emptyStateText?: string
  }) => void
}

const DISPLAY_MODES: ReadonlyArray<{
  value: SessionsDisplayMode
  label: string
}> = [
  { value: "list", label: "List" },
  { value: "cards", label: "Cards" },
  { value: "featured", label: "Featured" },
]

export default function SessionsInspector({
  title,
  description,
  displayMode,
  showTime,
  showDescriptions,
  showPresenter,
  showJoinAction,
  emptyStateText,
  onChange,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
        <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/34">
          Sessions Content
        </div>

        <div className="mt-3 space-y-3">
          <label className="block">
            <div className="text-[10px] font-black uppercase tracking-[0.14em] text-white/28">
              Title
            </div>
            <input
              value={title}
              onChange={(event) => onChange({ title: event.target.value })}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/24 px-3 py-2 text-sm text-white/72 outline-none transition focus:border-sky-200/28"
            />
          </label>

          <label className="block">
            <div className="text-[10px] font-black uppercase tracking-[0.14em] text-white/28">
              Description
            </div>
            <textarea
              value={description}
              onChange={(event) => onChange({ description: event.target.value })}
              className="mt-2 min-h-[88px] w-full rounded-xl border border-white/10 bg-black/24 px-3 py-2 text-sm text-white/72 outline-none transition focus:border-sky-200/28"
            />
          </label>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
        <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/34">
          Display Mode
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          {DISPLAY_MODES.map((option) => {
            const active = displayMode === option.value

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onChange({ displayMode: option.value })}
                className={`rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] transition ${
                  active
                    ? "border-sky-300/30 bg-sky-400/10 text-sky-100"
                    : "border-white/10 bg-white/[0.03] text-white/42 hover:bg-white/[0.06]"
                }`}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
        <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/34">
          Session Options
        </div>

        <div className="mt-3 space-y-2">
          <OptionToggle
            label="Show time"
            active={showTime}
            onClick={() => onChange({ showTime: !showTime })}
          />
          <OptionToggle
            label="Show descriptions"
            active={showDescriptions}
            onClick={() => onChange({ showDescriptions: !showDescriptions })}
          />
          <OptionToggle
            label="Show presenter"
            active={showPresenter}
            onClick={() => onChange({ showPresenter: !showPresenter })}
          />
          <OptionToggle
            label="Show join action"
            active={showJoinAction}
            onClick={() => onChange({ showJoinAction: !showJoinAction })}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
        <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/34">
          Empty State
        </div>

        <textarea
          value={emptyStateText}
          onChange={(event) => onChange({ emptyStateText: event.target.value })}
          className="mt-3 min-h-[72px] w-full rounded-xl border border-white/10 bg-black/24 px-3 py-2 text-sm text-white/72 outline-none transition focus:border-sky-200/28"
        />
      </div>
    </div>
  )
}

function OptionToggle({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-left transition hover:bg-white/[0.06]"
    >
      <span className="text-xs font-semibold text-white/58">{label}</span>
      <span
        className={`rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] ${
          active
            ? "bg-emerald-400/12 text-emerald-100/70"
            : "bg-white/[0.05] text-white/28"
        }`}
      >
        {active ? "On" : "Off"}
      </span>
    </button>
  )
}