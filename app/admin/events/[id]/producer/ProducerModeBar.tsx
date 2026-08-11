import type { JSX } from "react"
import { Clapperboard, SlidersHorizontal, Wrench } from "lucide-react"

export type ProducerWorkspaceMode = "show" | "prepare" | "advanced"

const MODES: Array<{
  id: ProducerWorkspaceMode
  label: string
  detail: string
  icon: JSX.Element
}> = [
  {
    id: "show",
    label: "Show",
    detail: "Operate the live program",
    icon: <Clapperboard size={13} />,
  },
  {
    id: "prepare",
    label: "Prepare",
    detail: "Build scenes and media",
    icon: <SlidersHorizontal size={13} />,
  },
  {
    id: "advanced",
    label: "Advanced",
    detail: "Technical production tools",
    icon: <Wrench size={13} />,
  },
]

export default function ProducerModeBar({
  mode,
  onModeChange,
}: {
  mode: ProducerWorkspaceMode
  onModeChange: (mode: ProducerWorkspaceMode) => void
}): JSX.Element {
  return (
    <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/[0.05] bg-[linear-gradient(180deg,rgba(5,9,18,0.96),rgba(3,6,12,0.90))] px-3 py-1.5">
      <div className="hidden text-[9px] font-semibold text-white/34 xl:block">
        {MODES.find((item) => item.id === mode)?.detail}
      </div>

      <div className="ml-auto grid grid-cols-3 gap-1 rounded-[13px] border border-white/[0.06] bg-black/25 p-1">
        {MODES.map((item) => {
          const active = item.id === mode

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onModeChange(item.id)}
              aria-pressed={active}
              title={item.detail}
              className={`flex items-center justify-center gap-1.5 rounded-[9px] border px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.10em] transition ${
                active
                  ? "border-sky-300/20 bg-sky-400/[0.11] text-sky-50 shadow-[0_0_14px_rgba(56,189,248,0.08)]"
                  : "border-transparent text-white/34 hover:border-white/[0.07] hover:bg-white/[0.035] hover:text-white/64"
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
