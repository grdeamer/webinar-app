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
    label: "Standard",
    detail: "Operate the live program with the essential controls",
    icon: <Clapperboard size={13} />,
  },
  {
    id: "prepare",
    label: "Guided",
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
    <div className="flex shrink-0 items-center justify-between gap-4 border-b border-white/[0.05] bg-[linear-gradient(180deg,rgba(8,12,28,0.98),rgba(5,8,20,0.94))] px-5 py-2.5">
      <div className="hidden min-w-0 xl:block">
        <div className="text-[9px] font-black uppercase tracking-[0.16em] text-violet-200/58">
          Operating mode
        </div>
        <div className="mt-0.5 truncate text-[11px] font-semibold text-white/42">
          {MODES.find((item) => item.id === mode)?.detail}
        </div>
      </div>

      <div className="ml-auto grid grid-cols-3 gap-1.5 rounded-[16px] border border-white/[0.07] bg-black/30 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]">
        {MODES.map((item) => {
          const active = item.id === mode

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onModeChange(item.id)}
              aria-pressed={active}
              title={item.detail}
              className={`flex items-center justify-center gap-1.5 rounded-[12px] border px-4 py-2 text-[10px] font-bold tracking-[0.02em] transition ${
                active
                  ? "border-violet-300/24 bg-[linear-gradient(180deg,rgba(112,87,255,0.34),rgba(66,61,139,0.42))] text-violet-50 shadow-[0_0_20px_rgba(112,87,255,0.13),inset_0_1px_0_rgba(255,255,255,0.08)]"
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
