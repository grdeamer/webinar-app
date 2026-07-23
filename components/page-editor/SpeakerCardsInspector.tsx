type SpeakerCardsDisplayMode = "grid" | "list" | "spotlight"

type SpeakerCardsPatch = Partial<{
  title: string
  body: string
  displayMode: SpeakerCardsDisplayMode
  showRole: boolean
  showCompany: boolean
  showBio: boolean
}>

type Props = {
  title: string
  description: string
  displayMode: SpeakerCardsDisplayMode
  showRole: boolean
  showCompany: boolean
  showBio: boolean
  onChange: (patch: SpeakerCardsPatch) => void
}

const EXPERIENCE_EDITOR_RAIL_CARD_CLASS =
  "rounded-[18px] border border-white/[0.075] bg-[linear-gradient(180deg,rgba(255,255,255,0.034),rgba(255,255,255,0.012))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.024)]"

export default function SpeakerCardsInspector({
  title,
  description,
  displayMode,
  showRole,
  showCompany,
  showBio,
  onChange,
}: Props) {
  const inputClass =
    "w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm text-white outline-none transition focus:border-violet-300/35"

  const toggleClass =
    "flex w-full items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-left text-sm text-white/72"

  return (
    <div className="space-y-3">
      <div className={EXPERIENCE_EDITOR_RAIL_CARD_CLASS}>
        <div className="text-xs font-black uppercase tracking-[0.15em] text-white/42">
          Speaker Copy
        </div>

        <div className="mt-3 space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-white/48">Title</span>
            <input
              value={title}
              onChange={(event) => onChange({ title: event.target.value })}
              className={inputClass}
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-white/48">
              Description
            </span>
            <textarea
              value={description}
              onChange={(event) => onChange({ body: event.target.value })}
              rows={3}
              className={inputClass}
            />
          </label>
        </div>
      </div>

      <div className={EXPERIENCE_EDITOR_RAIL_CARD_CLASS}>
        <div className="text-xs font-black uppercase tracking-[0.15em] text-white/42">
          Speaker Layout
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          {(["grid", "list", "spotlight"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => onChange({ displayMode: mode })}
              className={`rounded-xl border px-2 py-2 text-xs font-semibold capitalize transition ${
                displayMode === mode
                  ? "border-violet-300/30 bg-violet-400/15 text-violet-50"
                  : "border-white/10 bg-black/20 text-white/48 hover:bg-white/[0.06]"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      <div className={EXPERIENCE_EDITOR_RAIL_CARD_CLASS}>
        <div className="text-xs font-black uppercase tracking-[0.15em] text-white/42">
          Speaker Details
        </div>

        <div className="mt-3 space-y-2">
          {([
            ["showRole", "Show role", showRole],
            ["showCompany", "Show company", showCompany],
            ["showBio", "Show bio", showBio],
          ] as const).map(([key, label, enabled]) => (
            <button
              key={String(key)}
              type="button"
              onClick={() => onChange({ [key]: !enabled } as SpeakerCardsPatch)}
              className={toggleClass}
            >
              <span>{String(label)}</span>
              <span
                className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${
                  enabled
                    ? "bg-emerald-400/15 text-emerald-100/75"
                    : "bg-white/[0.05] text-white/32"
                }`}
              >
                {enabled ? "On" : "Off"}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
