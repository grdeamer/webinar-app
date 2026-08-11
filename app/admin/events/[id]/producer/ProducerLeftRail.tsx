import type { JSX } from "react"
import { ArrowRight, Radio, ShieldCheck, Zap } from "lucide-react"

import type { StageState } from "./producerRoomTypes"
import type { ScreenLayoutPreset } from "./assetDockTypes"

type ProducerLeftRailProps = {
  takeBusy: boolean
  previewProgramDifferent: boolean
  isProgramLive: boolean
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
  onTake,
  onGoLive,
  onGoOffAir,
}: ProducerLeftRailProps): JSX.Element {
  return (
    <aside className="flex h-full min-h-0 flex-col border-r border-white/[0.055] bg-[linear-gradient(180deg,rgba(10,16,29,0.98),rgba(3,6,12,1))] p-2 text-white">
      <div className="flex items-center justify-center py-2">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-full border ${
            isProgramLive
              ? "border-red-300/30 bg-red-500/15 text-red-100 shadow-[0_0_20px_rgba(248,113,113,0.16)]"
              : "border-white/10 bg-white/[0.035] text-white/45"
          }`}
          title={isProgramLive ? "Audience is live" : "Audience is in holding"}
        >
          <Radio size={17} />
        </div>
      </div>

      <div className="mt-2 space-y-2">
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-1.5 py-2 text-center">
          <div className="text-[7px] font-black uppercase tracking-[0.14em] text-white/32">1 · Preview</div>
          <div className={`mt-1 text-[8px] font-bold ${previewProgramDifferent ? "text-amber-200/75" : "text-emerald-200/62"}`}>
            {previewProgramDifferent ? "READY" : "MATCHED"}
          </div>
        </div>

        <ArrowRight className="mx-auto text-white/20" size={13} />

        <button
          type="button"
          disabled={takeBusy || !previewProgramDifferent}
          onClick={onTake}
          className="flex w-full flex-col items-center rounded-xl border border-sky-300/18 bg-sky-400/[0.08] px-1 py-3 text-sky-50 transition hover:bg-sky-400/[0.14] disabled:cursor-not-allowed disabled:border-white/[0.05] disabled:bg-white/[0.02] disabled:text-white/25"
          title="Send Preview to Program"
        >
          <Zap size={16} />
          <span className="mt-1 text-[8px] font-black uppercase tracking-[0.12em]">
            {takeBusy ? "Taking" : "2 · Take"}
          </span>
        </button>

        <ArrowRight className="mx-auto text-white/20" size={13} />

        <button
          type="button"
          onClick={isProgramLive ? onGoOffAir : onGoLive}
          className={`flex w-full flex-col items-center rounded-xl border px-1 py-3 transition ${
            isProgramLive
              ? "border-red-300/22 bg-red-500/[0.10] text-red-100 hover:bg-red-500/[0.16]"
              : "border-emerald-300/18 bg-emerald-400/[0.08] text-emerald-100 hover:bg-emerald-400/[0.14]"
          }`}
          title={isProgramLive ? "Take the event off air" : "Send Program to attendees"}
        >
          <ShieldCheck size={16} />
          <span className="mt-1 text-[8px] font-black uppercase tracking-[0.09em]">
            {isProgramLive ? "3 · Off Air" : "3 · Go Live"}
          </span>
        </button>
      </div>

      <div className="mt-auto rounded-xl border border-white/[0.055] bg-black/20 px-1 py-2 text-center">
        <div className={`text-[8px] font-black uppercase tracking-[0.12em] ${isProgramLive ? "text-red-200/78" : "text-white/38"}`}>
          {isProgramLive ? "Audience Live" : "Holding"}
        </div>
      </div>
    </aside>
  )
}
