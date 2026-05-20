import type { JSX } from "react"
import {
  AudioLines,
  FileVideo,
  LayoutPanelTop,
  Radio,
} from "lucide-react"

import type { StageState } from "./producerRoomTypes"
import type { ScreenLayoutPreset } from "./assetDockTypes"

function LeftRailAtmosphere(): JSX.Element {
  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-sky-300/[0.020] via-violet-300/[0.008] to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent,rgba(255,255,255,0.006)_42%,transparent_64%)] animate-[leftRailSignalSweep_24s_ease-in-out_infinite]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.012] bg-[repeating-linear-gradient(to_bottom,rgba(255,255,255,0.012)_0px,rgba(255,255,255,0.012)_1px,transparent_1px,transparent_18px)]" />
      <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-sky-200/10 to-transparent" />
    </>
  )
}

function ControlNavItem({
  icon,
  label,
}: {
  icon: JSX.Element
  label: string
}): JSX.Element {
  return (
    <button
      type="button"
      className="group/nav flex min-h-[64px] w-full flex-col items-center justify-center gap-2 rounded-[16px] border border-white/[0.04] bg-white/[0.014] px-1.5 py-3 text-center text-[9px] font-semibold leading-tight text-white/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.010)] transition hover:border-sky-200/12 hover:bg-sky-300/[0.035] hover:text-white/78"
    >
      <span className="text-white/36 transition group-hover/nav:text-sky-100/58">
        {icon}
      </span>
      <span className="max-w-[58px] truncate">{label}</span>
    </button>
  )
}

function SectionLabel({ children }: { children: string }): JSX.Element {
  return (
    <div className="text-[8px] font-black uppercase tracking-[0.16em] text-white/42">
      {children}
    </div>
  )
}

export default function ProducerLeftRail({
  takeBusy,
  previewProgramDifferent,
  onTake,
  onGoLive,
  onGoOffAir,
  layout,
  onSetLayout,
  autoDirectorEnabled,
  onToggleAutoDirector,
  screenLayoutPreset,
  onSetScreenLayoutPreset,
  localMicLevel,
  monitorHeight,
  onMonitorHeightChange,
  deviceAccessReady,
  videoDevices,
  audioDevices,
  selectedVideoDeviceId,
  selectedAudioDeviceId,
  onSelectVideoDevice,
  onSelectAudioDevice,
}: {
  takeBusy: boolean
  previewProgramDifferent: boolean
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
}): JSX.Element {
  return (
    <div className="group relative h-full overflow-hidden rounded-[20px] border border-white/[0.055] bg-[radial-gradient(circle_at_top_left,rgba(96,165,250,0.012),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.010),transparent_34%),linear-gradient(180deg,rgba(16,23,38,0.82),rgba(6,10,18,0.94))] p-3 shadow-[0_10px_30px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.018)] backdrop-blur-2xl transition duration-300 hover:border-white/[0.075] xl:col-start-1">
      <LeftRailAtmosphere />

      <div className="relative z-10 flex h-full min-h-0 flex-col overflow-hidden">
        <div className="shrink-0">
          <SectionLabel>Controls</SectionLabel>
        </div>

        <div className="flex min-h-0 flex-1 flex-col justify-center gap-4 py-4">
          <ControlNavItem icon={<Radio size={15} />} label="Live" />
          <ControlNavItem icon={<FileVideo size={15} />} label="Transition" />
          <ControlNavItem icon={<AudioLines size={15} />} label="Audio" />
          <ControlNavItem icon={<LayoutPanelTop size={15} />} label="Layout" />
        </div>
      </div>

      <style jsx global>{`
        @keyframes leftRailSignalSweep {
          0%,
          100% {
            opacity: 0;
            transform: translateX(-18%);
          }

          46% {
            opacity: 0.10;
          }

          100% {
            transform: translateX(18%);
          }
        }
      `}</style>
    </div>
  )
}