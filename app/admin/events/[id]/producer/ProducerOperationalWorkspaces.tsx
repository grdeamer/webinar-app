"use client"

import {
  Activity,
  AlertTriangle,
  Check,
  Cloud,
  ListChecks,
  Monitor,
  Play,
  Radio,
  RefreshCw,
  Route,
  Server,
  ShieldCheck,
  Users,
} from "lucide-react"
import type { JSX } from "react"

import type { ProducerHealthSnapshot, ProducerTransportHealth } from "./producerHealthUtils"

type SharedProps = {
  participantCount: number
  sceneCount: number
  mediaCount: number
  healthSnapshot: ProducerHealthSnapshot
  transportHealth: ProducerTransportHealth
  recordingStatus: string
  recoveryBusy: boolean
  onRecover: () => void
  onOpenShow: () => void
}

function StatusCard({ icon, label, value, detail, tone = "brand" }: { icon: JSX.Element; label: string; value: string; detail: string; tone?: "brand" | "good" | "warn" }) {
  const toneClass = tone === "good" ? "text-emerald-300" : tone === "warn" ? "text-amber-300" : "text-[rgb(var(--producer-brand-secondary))]"
  return <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,.035)]">
    <div className={`flex h-10 w-10 items-center justify-center rounded-xl border border-current/20 bg-current/[0.08] ${toneClass}`}>{icon}</div>
    <div className="mt-4 text-sm font-semibold text-white/90">{label}</div>
    <div className={`mt-1 text-lg font-semibold ${toneClass}`}>{value}</div>
    <div className="mt-1 text-xs text-white/38">{detail}</div>
  </div>
}

export function ProducerPrepareWorkspace(props: SharedProps): JSX.Element {
  const readiness = [
    ["Presenter access", props.participantCount > 0],
    ["Camera & microphone", props.healthSnapshot.stageReady],
    ["Media preloaded", props.mediaCount > 0],
    ["Stream destination", props.transportHealth === "connected"],
    ["Cloud recording", props.recordingStatus !== "starting"],
  ] as const
  const cues = ["Holding", "Welcome", "Keynote", "Q&A", "Close"]

  return <div className="flex h-full min-h-0 flex-col overflow-y-auto p-4 lg:p-5">
    <div className="flex items-end justify-between gap-4">
      <div><h2 className="text-2xl font-semibold tracking-tight">Prepare the show</h2><p className="mt-1 text-sm text-white/48">Confirm people, cues, media and outputs before rehearsal.</p></div>
      <button type="button" onClick={props.onOpenShow} className="rounded-xl border border-white/12 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white/72 hover:bg-white/[0.08]">Open Show mode</button>
    </div>
    <div className="mt-5 grid gap-3 md:grid-cols-4">
      <StatusCard icon={<Users size={20}/>} label="People" value={`${props.participantCount} ready`} detail="Connected presenters" />
      <StatusCard icon={<ListChecks size={20}/>} label="Run of Show" value={`${Math.max(props.sceneCount, cues.length)} cues`} detail="Production moments" />
      <StatusCard icon={<Play size={20}/>} label="Media" value={`${props.mediaCount} ready`} detail="Prepared sources" tone={props.mediaCount ? "good" : "warn"} />
      <StatusCard icon={<Monitor size={20}/>} label="Outputs" value={props.transportHealth === "connected" ? "Configured" : "Needs attention"} detail="Live transport" tone={props.transportHealth === "connected" ? "good" : "warn"} />
    </div>
    <div className="mt-4 grid min-h-[360px] flex-1 gap-3 lg:grid-cols-[1.25fr_.9fr_.9fr]">
      <section className="overflow-hidden rounded-2xl border border-white/10 bg-black/20"><h3 className="border-b border-white/8 px-4 py-3 font-semibold">Run of Show</h3>{cues.map((cue,index)=><button key={cue} type="button" className={`grid w-full grid-cols-[42px_1fr_auto] items-center border-b border-white/7 px-4 py-3 text-left last:border-0 ${index===2?"border-l-4 border-l-[rgb(var(--producer-brand-primary))] bg-[rgb(var(--producer-brand-primary))]/10":"hover:bg-white/[0.035]"}`}><span className="text-white/45">{String(index+1).padStart(2,"0")}</span><span className="font-medium">{cue}</span><Check size={15} className={index===4?"text-amber-300":"text-emerald-300"}/></button>)}</section>
      <section className="rounded-2xl border border-white/10 bg-black/20 p-4"><div className="flex items-center justify-between"><h3 className="font-semibold">Cue details</h3><span className="rounded-lg border border-[rgb(var(--producer-brand-primary))]/30 bg-[rgb(var(--producer-brand-primary))]/10 px-2 py-1 text-xs text-[rgb(var(--producer-brand-secondary))]">03 Keynote</span></div><div className="mt-4 space-y-3 text-sm"><div className="flex justify-between border-b border-white/8 pb-3 text-white/55"><span>Assigned source</span><b className="text-white/82">Keynote Slides</b></div><div className="flex justify-between border-b border-white/8 pb-3 text-white/55"><span>Presenter</span><b className="text-white/82">Awaiting stage</b></div><div className="flex justify-between border-b border-white/8 pb-3 text-white/55"><span>Transition</span><b className="text-white/82">Smooth</b></div></div><button type="button" onClick={props.onOpenShow} className="mt-5 w-full rounded-xl border border-[rgb(var(--producer-brand-secondary))]/30 bg-[rgb(var(--producer-brand-primary))]/20 py-3 text-sm font-semibold text-white hover:bg-[rgb(var(--producer-brand-primary))]/30">Load to Preview</button></section>
      <section className="rounded-2xl border border-white/10 bg-black/20 p-4"><h3 className="font-semibold">Rehearsal readiness</h3><div className="mt-4 space-y-1">{readiness.map(([label,ready])=><div key={label} className="flex items-center justify-between border-b border-white/7 py-2.5 text-sm text-white/60"><span>{label}</span>{ready?<Check size={16} className="text-emerald-300"/>:<AlertTriangle size={16} className="text-amber-300"/>}</div>)}</div><div className="mt-5 rounded-xl border border-amber-300/25 bg-amber-300/[0.07] p-3"><div className="text-xs font-bold uppercase tracking-wider text-amber-200">Next action</div><div className="mt-2 text-sm text-white/74">Resolve the remaining readiness item, then begin rehearsal.</div></div></section>
    </div>
  </div>
}

export function ProducerAdvancedWorkspace(props: SharedProps): JSX.Element {
  const connected = props.transportHealth === "connected"
  const signals = [["Preview Bus", props.healthSnapshot.previewReady],["Program Bus", props.healthSnapshot.programReady],["Main Stage", props.healthSnapshot.stageReady],["Stream Outputs", connected],["Cloud Recording", props.recordingStatus !== "starting"]] as const
  return <div className="flex h-full min-h-0 flex-col overflow-y-auto p-4 lg:p-5">
    <div><h2 className="text-2xl font-semibold tracking-tight">Advanced production</h2><p className="mt-1 text-sm text-white/48">Routing, transport, encoding and recovery controls.</p></div>
    <div className="mt-5 grid flex-1 gap-3 lg:grid-cols-[1.1fr_1fr_.85fr]">
      <div className="grid gap-3"><section className="rounded-2xl border border-white/10 bg-black/20 p-4"><h3 className="font-semibold">Signal routing</h3><div className="mt-3 space-y-2">{signals.map(([label,ready],index)=><div key={label} className="grid grid-cols-[38px_1fr_auto] items-center rounded-xl border border-white/8 bg-white/[0.025] p-2.5"><span className={`flex h-8 w-8 items-center justify-center rounded-lg ${index===1?"bg-red-400/12 text-red-300":"bg-[rgb(var(--producer-brand-primary))]/12 text-[rgb(var(--producer-brand-secondary))]"}`}><Route size={16}/></span><span className="text-sm font-medium">{label}</span><span className={`rounded-md border px-2 py-1 text-[10px] font-bold uppercase ${ready?"border-emerald-300/20 bg-emerald-300/8 text-emerald-300":"border-amber-300/20 bg-amber-300/8 text-amber-300"}`}>{ready?"Ready":"Check"}</span></div>)}</div></section><section className="rounded-2xl border border-white/10 bg-black/20 p-4"><h3 className="font-semibold">Recovery controls</h3><div className="mt-3 grid grid-cols-3 gap-2"><button type="button" disabled={props.recoveryBusy} onClick={props.onRecover} className="rounded-xl border border-white/10 bg-white/[0.035] p-4 text-xs font-semibold hover:bg-white/[0.07]"><RefreshCw size={20} className={`mx-auto mb-2 ${props.recoveryBusy?"animate-spin":""}`}/>Reconnect transport</button><button type="button" onClick={props.onRecover} className="rounded-xl border border-white/10 bg-white/[0.035] p-4 text-xs font-semibold hover:bg-white/[0.07]"><Activity size={20} className="mx-auto mb-2"/>Refresh room state</button><button type="button" onClick={props.onOpenShow} className="rounded-xl border border-white/10 bg-white/[0.035] p-4 text-xs font-semibold hover:bg-white/[0.07]"><Play size={20} className="mx-auto mb-2"/>Restart preview</button></div></section></div>
      <section className="rounded-2xl border border-white/10 bg-black/20 p-4"><h3 className="font-semibold">Transport & encoding</h3><div className="mt-4 space-y-3 text-sm">{[["LiveKit",connected?"Connected":"Degraded"],["Region","US East"],["Video","720p30"],["Codec","H.264"],["Audio","48 kHz Stereo"],["Bitrate","4.5 Mbps"],["Round trip",connected?"42 ms":"—"]].map(([label,value])=><div key={label} className="flex justify-between border-b border-white/7 pb-2 text-white/48"><span>{label}</span><b className={label==="LiveKit"||label==="Round trip"?(connected?"text-emerald-300":"text-amber-300"):"text-white/82"}>{value}</b></div>)}</div><div className="mt-6 grid grid-cols-3 gap-3">{[62,48,55].map((level,index)=><div key={index} className="flex h-40 items-end rounded-xl border border-white/8 bg-black/25 p-2"><div className="w-full rounded bg-gradient-to-t from-emerald-400 via-emerald-300 to-amber-300" style={{height:`${level}%`}}/></div>)}</div></section>
      <div className="grid gap-3"><section className="rounded-2xl border border-white/10 bg-black/20 p-4"><h3 className="font-semibold">Output destinations</h3><div className="mt-3 space-y-2"><div className="flex items-center gap-3 rounded-xl border border-white/8 p-3"><Radio className="text-red-300"/><div className="flex-1"><b>YouTube</b><div className="text-xs text-emerald-300">Configured</div></div></div><div className="flex items-center gap-3 rounded-xl border border-white/8 p-3"><Cloud className="text-sky-300"/><div className="flex-1"><b>Cloud Recording</b><div className="text-xs text-emerald-300">Ready</div></div></div></div></section><section className="rounded-2xl border border-white/10 bg-black/20 p-4"><div className="flex items-center gap-2"><Server size={17}/><h3 className="font-semibold">System log</h3></div><div className="mt-3 space-y-2 font-mono text-xs text-white/50"><div className="text-emerald-300">● Transport connected</div><div>● Room state synchronized</div><div>● Preview pipeline ready</div><div>● Output status refreshed</div></div></section><div className="flex items-center gap-2 rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.05] p-4 text-sm text-emerald-200"><ShieldCheck size={18}/> Control plane healthy</div></div>
    </div>
  </div>
}
