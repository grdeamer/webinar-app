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
    detail: "Operate the live program with the essential controls",
    icon: <Clapperboard size={13} />,
  },
  {
    id: "prepare",
    label: "Prepare",
    detail: "Prepare scenes and media with more guidance",
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
    <div className="flex shrink-0 items-center justify-between gap-4 border-b border-white/[0.06] bg-[#070b14] px-3 py-1.5 xl:px-4">
      <div className="hidden min-w-0 xl:block">
        <div className="text-[9px] font-black uppercase tracking-[0.16em] text-violet-200/58">
          Operating mode
        </div>
        <div className="mt-0.5 truncate text-[11px] font-semibold text-white/42">
          {MODES.find((item) => item.id === mode)?.detail}
        </div>
      </div>

      <div className="ml-auto grid grid-cols-3 gap-1 rounded-[10px] border border-white/[0.08] bg-black/30 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]">
        {MODES.map((item) => {
          const active = item.id === mode

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onModeChange(item.id)}
              aria-pressed={active}
              title={item.detail}
              className={`flex items-center justify-center gap-1.5 rounded-[7px] border px-3 py-1.5 text-[10px] font-bold tracking-[0.02em] transition ${
                active
                  ? "border-sky-300/28 bg-[#10213a] text-sky-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
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
