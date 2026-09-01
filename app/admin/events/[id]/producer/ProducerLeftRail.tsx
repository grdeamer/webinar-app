import type { JSX } from "react"
import { Radio } from "lucide-react"

import type { StageState } from "./producerRoomTypes"
import type { ScreenLayoutPreset } from "./assetDockTypes"

type ProducerLeftRailProps = {
  takeBusy: boolean
  previewProgramDifferent: boolean
  isProgramLive: boolean
  liveActionBusy: boolean
  onTake: () => void
  onGoLive: () => void
  onGoOffAir: () => void
  layout: StageState["layout"] | null | undefined
  onSetLayout: (layout: StageState["layout"]) => void
  autoDirectorEnabled: boolean
  onToggleAutoDirector: () => void
  screenLayoutPreset: ScreenLayoutPreset
  onSetScreenLayoutPreset: (preset: ScreenLayoutPreset) => void
  localMicLevel: number
  monitorHeight: number
  onMonitorHeightChange: (value: number) => void
  deviceAccessReady: boolean
  videoDevices: MediaDeviceInfo[]
  audioDevices: MediaDeviceInfo[]
  selectedVideoDeviceId: string
  selectedAudioDeviceId: string
  onSelectVideoDevice: (value: string) => void
  onSelectAudioDevice: (value: string) => void
}

export default function ProducerLeftRail({
  takeBusy,
  previewProgramDifferent,
  isProgramLive,
  liveActionBusy,
  onTake,
  onGoLive,
  onGoOffAir,
}: ProducerLeftRailProps): JSX.Element {
  return (
    <aside className="flex h-full min-h-0 flex-col rounded-2xl border border-white/10 bg-[#07111d]/82 p-4 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
      <div className="flex items-center justify-center py-1">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-full border ${
            isProgramLive
              ? "border-red-300/30 bg-red-500/15 text-red-100 shadow-[0_0_20px_rgba(248,113,113,0.16)]"
              : "border-white/10 bg-white/[0.035] text-white/45"
          }`}
          title={isProgramLive ? "Audience is live" : "Audience is in holding"}
        >
          <Radio size={20} />
        </div>
      </div>

      <div className="mt-4 flex flex-1 flex-col items-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-sky-400 text-[24px] font-medium text-white shadow-[0_0_18px_rgba(59,130,246,0.18)]">1</div>
        <div className="mt-3 text-[13px] font-semibold uppercase tracking-[0.08em] text-sky-400">Preview</div>
        <div className="my-4 h-16 border-l border-dashed border-sky-400/50" />

        <button
          type="button"
          disabled={takeBusy || !previewProgramDifferent}
          onClick={onTake}
          className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-white/30 text-[24px] font-medium text-white/72 transition hover:border-sky-300/60 hover:text-white disabled:opacity-45"
          title="Send Preview to Program"
        >
          2
        </button>
        <div className="mt-3 text-[13px] font-semibold uppercase tracking-[0.08em] text-white/62">Take</div>
        <div className="my-4 h-16 border-l border-dashed border-emerald-400/45" />

        <button
          type="button"
          disabled={liveActionBusy}
          onClick={isProgramLive ? onGoOffAir : onGoLive}
          className={`flex h-14 w-14 items-center justify-center rounded-full border-2 text-[24px] font-medium transition ${isProgramLive ? "border-red-300/70 text-red-200" : "border-emerald-400/70 text-white"}`}
          title={isProgramLive ? "Take the event off air" : "Send Program to attendees"}
        >
          3
        </button>
        <div className={`mt-3 text-center text-[13px] font-semibold uppercase tracking-[0.07em] ${isProgramLive ? "text-red-300" : "text-emerald-300"}`}>
          {isProgramLive ? "Off Air" : "Go Live"}
        </div>
      </div>
    </aside>
  )
}
