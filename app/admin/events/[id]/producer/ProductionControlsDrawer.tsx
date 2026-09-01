import Image from "next/image"
import { CircleDot, Volume2, X } from "lucide-react"
import type { JSX } from "react"

export type ProductionDrawerTab = "audio" | "recording"
export type ProductionRecordingStatus = "idle" | "armed" | "starting" | "recording" | "stopped"
export type ProductionAudioChannel = {
  id: string
  label: string
  level: number
  muted: boolean
  solo: boolean
}
export type ProductionRecordingItem = {
  id: string
  label: string
  status: "processing" | "ready" | "recording" | "failed"
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = seconds % 60

  return [hours, minutes, remainingSeconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":")
}

export default function ProductionControlsDrawer({
  activeTab,
  onClose,
  audioChannels,
  onToggleMute,
  onToggleSolo,
  recordingStatus,
  recordingElapsedSeconds,
  recordings,
  recordingError,
  onArmRecording,
  onStartRecording,
  onStopRecording,
}: {
  activeTab: ProductionDrawerTab
  onClose: () => void
  audioChannels: ProductionAudioChannel[]
  onToggleMute: (channel: string) => void
  onToggleSolo: (channel: string) => void
  recordingStatus: ProductionRecordingStatus
  recordingElapsedSeconds: number
  recordings: ProductionRecordingItem[]
  recordingError: string | null
  onArmRecording: () => void
  onStartRecording: () => void
  onStopRecording: () => void
}): JSX.Element {
  const isArmed = recordingStatus === "armed"
  const isStarting = recordingStatus === "starting"
  const isRecording = recordingStatus === "recording"

  return (
    <div className="fixed bottom-[108px] left-[132px] right-[324px] z-[1000] flex min-h-[330px] flex-col overflow-hidden rounded-[16px] border border-white/[0.13] bg-[#071321]/[0.99] shadow-[0_28px_90px_rgba(0,0,0,0.72)] backdrop-blur-2xl">
      <header className="flex h-[58px] shrink-0 items-center justify-between border-b border-white/[0.10] px-6">
        <div className="flex items-center gap-3">
          {activeTab === "audio" ? <Volume2 size={20} className="text-blue-300" /> : <CircleDot size={20} className="text-red-400" />}
          <div className="text-[17px] font-semibold text-white/92">{activeTab === "audio" ? "Audio Mixer" : "Recording"}</div>
          <div className={`ml-3 flex items-center gap-2 text-[13px] ${activeTab === "audio" ? "text-emerald-300" : "text-emerald-300"}`}><span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />{activeTab === "audio" ? "Program mix" : "Ready to record"}</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Close production controls"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-[9px] border border-white/[0.07] text-white/38 hover:bg-white/[0.05] hover:text-white/70"
          >
            <X size={15} />
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        {activeTab === "audio" ? (
          <div className="grid grid-cols-7 gap-3">
            {audioChannels.slice(0,6).map((channel,index) => {
              const level = Math.max(8, Math.min(100, channel.muted ? 4 : channel.level))
              return <section key={channel.id} className={`rounded-[12px] border p-4 ${index===0?"border-red-400/65 bg-red-400/[0.035]":index===2?"border-blue-400/65 bg-blue-400/[0.035]":"border-white/10 bg-white/[0.025]"}`}>
                <div className={`text-center text-[14px] font-medium ${index===0?"text-red-300":index===2?"text-blue-300":"text-white/88"}`}>{channel.label}</div>
                <div className="mt-4 grid h-36 grid-cols-[30px_1fr] items-end gap-4"><div className="flex h-full items-end rounded bg-black/30 p-1"><div className="w-full bg-[repeating-linear-gradient(to_top,#5be17f_0_5px,transparent_5px_8px)]" style={{height:`${level}%`}}/></div><input aria-label={`${channel.label} level`} type="range" min="0" max="100" defaultValue={Math.max(10,100-level)} className="h-32 w-5 appearance-none bg-transparent [writing-mode:vertical-lr]" /></div>
                <div className="mt-3 grid grid-cols-2 gap-2"><button type="button" onClick={() => onToggleMute(channel.id)} className={`rounded-lg border py-2 text-[11px] ${channel.muted?"border-red-300/35 bg-red-300/10 text-red-200":"border-white/10 text-white/70"}`}>Mute</button><button type="button" onClick={() => onToggleSolo(channel.id)} className={`rounded-lg border py-2 text-[11px] ${channel.solo?"border-amber-300/35 bg-amber-300/10 text-amber-200":"border-white/10 text-white/70"}`}>Solo</button></div>
              </section>
            })}
            <aside className="rounded-[12px] border border-violet-400/30 bg-violet-400/[0.035] p-4"><div className="text-center text-[14px] font-medium text-violet-300">Master</div><div className="mt-4 flex h-36 justify-center gap-3"><div className="w-6 rounded bg-[repeating-linear-gradient(to_top,#5be17f_0_5px,transparent_5px_8px)]"/><div className="w-6 rounded bg-[repeating-linear-gradient(to_top,#5be17f_0_5px,transparent_5px_8px)]"/></div><div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-emerald-300"><span className="h-2 w-2 rounded-full bg-emerald-300"/>Limiter</div></aside>
          </div>
        ) : (
          <div className="grid grid-cols-[310px_minmax(360px,1fr)_180px_320px] gap-5">
            <section className="grid gap-3"><div className="rounded-xl border border-white/10 bg-white/[0.025] p-4"><div className="text-[16px] font-medium">Program Recording</div><div className="mt-1 text-[14px] text-white/65">1080p · 30 fps · Stereo</div></div><div className="relative overflow-hidden rounded-xl border border-sky-300/[0.12] bg-[radial-gradient(circle_at_13%_22%,rgba(99,102,241,0.09),transparent_40%),linear-gradient(135deg,rgba(255,255,255,0.035),rgba(99,102,241,0.018))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"><div className="pointer-events-none absolute -right-7 -top-8 h-24 w-24 rounded-full bg-sky-400/[0.035] blur-2xl"/><div className="relative flex items-center gap-3"><div className="relative grid h-12 w-12 shrink-0 place-items-center"><div aria-hidden="true" className="absolute h-10 w-10 rounded-full bg-indigo-300/[0.10] blur-lg"/><div aria-hidden="true" className="absolute h-8 w-8 rounded-full border border-sky-100/[0.07] bg-white/[0.015]"/><span className="relative h-9 w-9 overflow-hidden opacity-80 saturate-[0.85] drop-shadow-[0_0_8px_rgba(129,140,248,0.30)]"><Image src="/jupiter-logo.svg" alt="" width={168} height={32} className="h-9 w-[189px] max-w-none"/></span></div><div><div className="text-[16px] font-medium tracking-[-0.01em] text-white/88">Jupiter Cloud</div><div className="mt-1 flex items-center gap-2 text-[14px] text-emerald-300"><span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,0.68)]"/>Storage ready</div></div></div></div></section>
            <section><button type="button" onClick={isRecording?onStopRecording:isArmed?onStartRecording:onArmRecording} disabled={isStarting} className="h-[76px] w-full rounded-xl border border-red-300/35 bg-[linear-gradient(135deg,#ff665d,#ff4c4c)] text-[20px] font-semibold text-white shadow-[0_10px_28px_rgba(239,68,68,0.20)]">◉ {isRecording?`Stop Recording · ${formatDuration(recordingElapsedSeconds)}`:isArmed?"Start Recording":"Arm Recording"}</button><div className="mt-5 flex items-center justify-between text-[14px] text-white/74"><span>Record isolated tracks</span><button type="button" className="h-7 w-12 rounded-full bg-white/20"><span className="block h-5 w-5 translate-x-1 rounded-full bg-white"/></button></div><div className="mt-4 flex items-center justify-between text-[14px] text-white/74"><span>Create cloud backup</span><button type="button" className="h-7 w-12 rounded-full bg-blue-500"><span className="block h-5 w-5 translate-x-6 rounded-full bg-white"/></button></div>{recordingError?<div className="mt-3 text-[12px] text-red-300">{recordingError}</div>:null}</section>
            <section className="flex flex-col items-center justify-center border-x border-white/10"><div className="text-[28px]">▱</div><div className="mt-3 text-[15px]">12.4 GB available</div><div className="mt-1 text-[12px] text-white/50">Approx. 3h 18m</div></section>
            <aside><div className="text-[15px] font-medium">Recent recordings</div><div className="mt-3 space-y-2">{recordings.length?recordings.slice(0,3).map((recording)=><div key={recording.id} className="flex items-center justify-between border-b border-white/9 py-2 text-[12px]"><span>{recording.label}</span><span className="capitalize text-emerald-300">{recording.status}</span></div>):["Rehearsal 01","Audio Check","Opening Test"].map((label,index)=><div key={label} className="flex items-center justify-between border-b border-white/9 py-2 text-[12px]"><span>{label}</span><span className={index?"text-blue-300":"text-emerald-300"}>{index?"Processed":"Ready"}</span></div>)}</div></aside>
          </div>
        )}
      </div>
    </div>
  )
}
