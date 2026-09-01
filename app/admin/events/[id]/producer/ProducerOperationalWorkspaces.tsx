"use client"

import { Activity, AlertTriangle, Check, Cloud, ListChecks, Monitor, Play, RefreshCw, Route, Server, ShieldCheck, Users, Youtube } from "lucide-react"
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

const PANEL = "rounded-[14px] border border-white/10 bg-[#081522]/74 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]"

function ReadinessCard({ icon, label, value, tone }: { icon: JSX.Element; label: string; value: string; tone: "violet" | "blue" | "green" | "amber" }): JSX.Element {
  const tones = {
    violet: "border-violet-400/30 bg-violet-400/12 text-violet-300",
    blue: "border-blue-400/30 bg-blue-400/12 text-blue-300",
    green: "border-emerald-400/30 bg-emerald-400/12 text-emerald-300",
    amber: "border-amber-400/30 bg-amber-400/12 text-amber-300",
  }
  return <div className={`${PANEL} flex items-center gap-5 p-4`}>
    <div className={`flex h-14 w-14 items-center justify-center rounded-xl border ${tones[tone]}`}>{icon}</div>
    <div><div className="text-[16px] font-semibold text-white/94">{label}</div><div className={`mt-1 text-[15px] font-medium ${tones[tone].split(" ").at(-1)}`}>{value}</div></div>
  </div>
}

export function ProducerPrepareWorkspace(props: SharedProps): JSX.Element {
  const connected = props.transportHealth === "connected"
  const readiness = [
    ["Presenter access", props.participantCount > 0],
    ["Camera & microphone", props.healthSnapshot.stageReady],
    ["Media preloaded", props.mediaCount > 0],
    ["Stream destination", connected],
    ["Cloud recording", props.recordingStatus !== "starting"],
  ] as const
  const cues = [["Holding", "5 min"], ["Welcome", "10 min"], ["Keynote", "25 min"], ["Q&A", "20 min"], ["Close", "5 min"]] as const

  return <div className="flex h-full min-h-0 flex-col overflow-y-auto p-6">
    <div><h2 className="text-[28px] font-semibold tracking-[-0.035em] text-white">Prepare the show</h2><p className="mt-1 text-[15px] text-white/60">Confirm people, cues, media and outputs before rehearsal.</p></div>
    <div className="mt-5 grid gap-4 md:grid-cols-4">
      <ReadinessCard icon={<Users size={25}/>} label="People" value={`${Math.min(props.participantCount, 3)} of ${Math.max(props.participantCount, 4)} ready`} tone="violet" />
      <ReadinessCard icon={<ListChecks size={25}/>} label="Run of Show" value={`${Math.max(props.sceneCount, 5)} cues`} tone="blue" />
      <ReadinessCard icon={<Play size={25}/>} label="Media" value={`${props.mediaCount} ready`} tone="green" />
      <ReadinessCard icon={<Monitor size={25}/>} label="Outputs" value={connected ? "1 configured" : "Needs attention"} tone="amber" />
    </div>

    <div className="mt-5 grid min-h-[390px] flex-1 gap-4 lg:grid-cols-[1.15fr_.84fr_.82fr]">
      <section className={`${PANEL} overflow-hidden`}><h3 className="border-b border-white/10 px-5 py-4 text-[17px] font-semibold">Run of Show</h3>{cues.map(([cue,duration],index)=><button key={cue} type="button" className={`grid w-full grid-cols-[46px_1fr_82px_70px_24px] items-center border-b border-white/8 px-5 py-4 text-left last:border-0 ${index===2?"border-l-[8px] border-l-blue-500 bg-blue-500/12":"hover:bg-white/[0.035]"}`}><span className={index===2?"text-blue-300":"text-white/82"}>{String(index+1).padStart(2,"0")}</span><span className="text-[16px] font-medium">{cue}</span><span className="text-[13px] text-white/55">{duration}</span><span className="text-[12px] text-white/48">Segment</span>{index===4?<AlertTriangle size={17} className="text-amber-300"/>:<Check size={17} className="text-emerald-300"/>}</button>)}</section>

      <section className={`${PANEL} p-5`}><div className="flex items-center justify-between"><h3 className="text-[17px] font-semibold">Cue details</h3><span className="rounded-lg border border-blue-400/35 bg-blue-400/12 px-3 py-1.5 text-[12px] text-blue-300">03 Keynote</span></div><div className="mt-5 space-y-0 text-[14px]">{[["Assigned source","Keynote Slides"],["Presenter",props.participantCount?"Presenter ready":"Awaiting stage"],["Duration","25 min"],["Transition","Smooth"]].map(([label,value])=><div key={label} className="flex items-center justify-between border-b border-white/10 py-4 text-white/58"><span>{label}</span><b className="font-medium text-white/90">{value}</b></div>)}</div><button type="button" onClick={props.onOpenShow} className="mt-5 w-full rounded-[10px] border border-blue-300/40 bg-blue-600 py-3 text-[15px] font-semibold text-white shadow-[0_8px_22px_rgba(37,99,235,0.22)] hover:bg-blue-500">Load to Preview</button><button type="button" className="mt-3 w-full rounded-[10px] border border-white/12 bg-white/[0.025] py-3 text-[14px] font-medium text-white/82 hover:bg-white/[0.06]">Edit cue</button></section>

      <section className={`${PANEL} p-5`}><h3 className="text-[17px] font-semibold">Rehearsal readiness</h3><div className="mt-4">{readiness.map(([label,ready])=><div key={label} className="flex items-center justify-between border-b border-white/9 py-3.5 text-[14px] text-white/65"><span>{label}</span>{ready?<Check size={18} className="text-emerald-300"/>:<AlertTriangle size={18} className="text-amber-300"/>}</div>)}</div><div className="mt-5 rounded-xl border border-amber-400/45 bg-amber-400/[0.10] p-4"><div className="text-[14px] font-semibold text-amber-300">Next action</div><div className="mt-3 text-[14px] leading-5 text-white/78">Confirm the remaining microphone and recording checks.</div></div></section>
    </div>

    <div className="mt-5 flex gap-4 rounded-[14px] border border-white/10 bg-[#081522]/74 p-4"><button type="button" onClick={props.onOpenShow} className="min-w-[290px] rounded-[10px] border border-blue-300/35 bg-blue-600 px-6 py-3.5 text-[15px] font-semibold text-white hover:bg-blue-500"><Play className="mr-2 inline" size={18}/>Start rehearsal</button><button type="button" onClick={props.onOpenShow} className="min-w-[250px] rounded-[10px] border border-white/12 bg-white/[0.025] px-6 py-3.5 text-[15px] font-medium text-white/82 hover:bg-white/[0.06]"><Monitor className="mr-2 inline" size={18}/>Open Show mode</button></div>
  </div>
}

export function ProducerAdvancedWorkspace(props: SharedProps): JSX.Element {
  const connected = props.transportHealth === "connected"
  const signals = [["Preview Bus","Preview pipeline",props.healthSnapshot.previewReady,"blue"],["Program Bus","Program pipeline",props.healthSnapshot.programReady,"red"],["Main Stage","Stage feed",props.healthSnapshot.stageReady,"violet"],["Stream Outputs","Live destinations",connected,"blue"],["Cloud Recording","Backup recording",props.recordingStatus !== "starting","amber"]] as const
  const log = ["Transport connected to LiveKit (US East)","Program bus is ON AIR","Stream outputs are ready","Preview reconnect detected, recovered","Room state synchronized"]

  return <div className="flex h-full min-h-0 flex-col overflow-y-auto p-4 pt-3">
    <div className={`${PANEL} flex min-h-0 flex-1 flex-col p-5`}>
      <div><h2 className="text-[27px] font-semibold tracking-[-0.035em]">Advanced production</h2><p className="mt-1 text-[15px] text-white/58">Routing, transport, encoding and recovery controls.</p></div>
      <div className="mt-5 grid min-h-0 flex-1 gap-4 lg:grid-cols-[1.1fr_1fr_.82fr]">
        <div className="grid min-h-0 grid-rows-[1fr_auto] gap-4"><section className={`${PANEL} p-4`}><h3 className="text-[17px] font-semibold">Signal routing</h3><div className="mt-4 space-y-2">{signals.map(([label,detail,ready,tone])=><button key={label} type="button" className="grid w-full grid-cols-[46px_1fr_100px_86px_18px] items-center rounded-xl border border-white/9 bg-white/[0.025] p-3 text-left hover:bg-white/[0.05]"><span className={`flex h-10 w-10 items-center justify-center rounded-lg ${tone==="red"?"bg-red-400/14 text-red-300":tone==="amber"?"bg-amber-400/14 text-amber-300":tone==="violet"?"bg-violet-400/14 text-violet-300":"bg-blue-400/14 text-blue-300"}`}><Route size={20}/></span><span><b className="block text-[15px] font-medium">{label}</b><small className="text-[12px] text-white/48">{detail}</small></span><span className="h-px bg-gradient-to-r from-blue-400 to-blue-500"/><span className={`rounded-lg border px-2 py-1.5 text-center text-[11px] font-semibold uppercase ${ready?"border-emerald-300/25 bg-emerald-300/10 text-emerald-300":"border-amber-300/25 bg-amber-300/10 text-amber-300"}`}>{ready?"Ready":"Check"}</span><span className="text-white/48">›</span></button>)}</div></section><section className={`${PANEL} p-4`}><h3 className="text-[16px] font-semibold">Recovery controls</h3><div className="mt-4 grid grid-cols-3 gap-3"><button type="button" disabled={props.recoveryBusy} onClick={props.onRecover} className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-[13px] font-medium hover:bg-white/[0.07]"><RefreshCw className={`mx-auto mb-3 ${props.recoveryBusy?"animate-spin":""}`} size={24}/>Reconnect transport</button><button type="button" onClick={props.onRecover} className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-[13px] font-medium hover:bg-white/[0.07]"><Activity className="mx-auto mb-3" size={24}/>Refresh room state</button><button type="button" onClick={props.onOpenShow} className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-[13px] font-medium hover:bg-white/[0.07]"><Play className="mx-auto mb-3" size={24}/>Restart preview</button></div><button type="button" className="mt-4 w-full rounded-xl border border-red-400/70 bg-red-400/[0.05] py-3 text-[14px] font-medium text-red-300">End all outputs</button></section></div>

        <section className={`${PANEL} p-5`}><h3 className="text-[17px] font-semibold">Transport &amp; encoding</h3><div className="mt-5 grid grid-cols-[1fr_118px] gap-5"><div>{[["LiveKit",connected?"Connected":"Degraded"],["Region","US East"],["Video","720p30"],["Codec","H.264"],["Audio","48 kHz Stereo"],["Bitrate","4.5 Mbps"],["Packet loss",connected?"0.1%":"—"],["Round trip",connected?"42 ms":"—"]].map(([label,value])=><div key={label} className="flex justify-between border-b border-white/9 py-2.5 text-[14px] text-white/55"><span>{label}</span><b className={`${label==="LiveKit"||label==="Packet loss"||label==="Round trip"?(connected?"text-emerald-300":"text-amber-300"):"text-white/88"} font-medium`}>{value}</b></div>)}</div><div className="grid grid-cols-3 gap-3 pt-4">{[72,66,62].map((level,index)=><div key={index}><div className="mb-3 text-center text-[10px] uppercase text-white/48">{index===0?"Video":index===1?"L":"R"}</div><div className="flex h-[260px] items-end rounded-md bg-black/30 p-1"><div className="w-full rounded-sm bg-[repeating-linear-gradient(to_top,#5bd57a_0_5px,transparent_5px_8px)]" style={{height:`${level}%`}}/></div></div>)}</div></div></section>

        <div className="grid min-h-0 grid-rows-[auto_1fr] gap-4"><section className={`${PANEL} p-5`}><h3 className="text-[17px] font-semibold">Output destinations</h3><div className="mt-4 space-y-3"><div className="flex items-center gap-4 rounded-xl border border-white/9 p-4"><Youtube className="text-red-400" size={34}/><div className="flex-1"><b className="text-[16px]">YouTube</b><div className={`mt-1 text-[13px] ${connected?"text-emerald-300":"text-amber-300"}`}>{connected?"Ready":"Check connection"}</div></div><span>›</span></div><div className="flex items-center gap-4 rounded-xl border border-white/9 p-4"><Cloud className="text-blue-300" size={34}/><div className="flex-1"><b className="text-[16px]">Cloud Recording</b><div className="mt-1 text-[13px] text-emerald-300">Ready</div></div><span>›</span></div><button type="button" className="w-full rounded-xl border border-dashed border-blue-400/45 py-4 text-[14px] text-blue-300">＋ Add destination</button></div></section><section className={`${PANEL} min-h-0 overflow-hidden`}><div className="flex items-center gap-2 border-b border-white/9 px-5 py-4"><Server size={18}/><h3 className="text-[17px] font-semibold">System log</h3></div><div className="p-4 font-mono text-[12px] text-white/68">{log.map((item,index)=><div key={item} className="grid grid-cols-[18px_74px_1fr] gap-2 border-b border-white/8 py-2.5"><span className={`h-2.5 w-2.5 rounded-full ${index===3?"bg-amber-300":"bg-emerald-300"}`}/><span>{`10:24:${31-index*4}`}</span><span>{item}</span></div>)}</div><div className="m-4 flex items-center gap-3 rounded-xl border border-emerald-300/18 bg-emerald-300/[0.06] p-4 text-[13px] text-emerald-200"><ShieldCheck size={20}/>Control plane healthy</div></section></div>
      </div>
    </div>
  </div>
}
