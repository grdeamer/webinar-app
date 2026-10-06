"use client"
import { Camera, CameraOff, Mic, MicOff, Play, Square, MonitorUp, MonitorOff, Pencil, Trash2, AudioLines } from "lucide-react"
import { outputLabel, type ZoomRoom, type ZoomAction } from "@/lib/zoom-bridge/types"
export const ioButton = "inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-300 disabled:cursor-not-allowed disabled:opacity-40"
export const ioField = "mt-2 w-full rounded-xl border border-white/15 bg-black/25 px-3 py-2.5 text-white outline-none focus:border-blue-400"
export function reporting(room: ZoomRoom) { return Boolean(room.lastSeen && Date.now() - new Date(room.lastSeen).getTime() < 15000) }
export default function SatelliteCard({ room, busy, command, edit, remove }: {
  room: ZoomRoom; busy: boolean; command: (id: string, action: ZoomAction) => void; edit: (room: ZoomRoom) => void; remove: (room: ZoomRoom) => void;
}) {
  const fresh = reporting(room)
  const joined = fresh && room.observed.status === "joined"
  const state = fresh ? room.observed.status || "starting" : room.running ? "Controller offline" : "Disconnected"
  const outputOn = joined && room.observed.camera === true
  const audioOn = joined && room.observed.microphone === true
  const applied = fresh && room.observed.revision === room.revision
  const pending = !applied && room.running
  const sharing = room.publishMode === "share"
  const OutputIcon = sharing ? outputOn ? MonitorUp : MonitorOff : outputOn ? Camera : CameraOff
  const AudioIcon = audioOn ? Mic : MicOff
  const outputTarget = applied && joined ? outputOn : room.camera
  const audioTarget = applied && joined ? audioOn : room.microphone
  return <article className="rounded-2xl border border-white/10 bg-[#0b1222] p-5">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0"><h2 className="break-words text-lg font-semibold">{room.name}</h2><p className="mt-1 font-mono text-xs text-white/45">Meeting {room.meetingId}</p></div>
      <span className={`shrink-0 rounded-full px-2 py-1 text-xs ${joined ? "bg-emerald-300/10 text-emerald-200" : "bg-white/5 text-white/55"}`}>{state}</span>
    </div>
    <div className="mt-4 flex items-center gap-2 text-xs text-blue-200"><MonitorUp size={14} />{outputLabel(room.publishMode)}<span className="ml-auto text-white/40">{pending ? "Applying controls…" : joined ? "Connected" : room.running ? "Connecting…" : "Ready to connect"}</span></div>
    <div className="mt-4 flex flex-wrap gap-2">
      <button type="button" className={`${ioButton} ${outputOn ? "border-emerald-300/35 bg-emerald-300/10 text-emerald-200" : "text-white/55"}`} disabled={busy} aria-pressed={outputOn} aria-label={`${outputTarget ? "Stop" : "Start"} ${outputLabel(room.publishMode).toLowerCase()} for ${room.name}`} title={`${outputTarget ? "Stop" : "Start"} ${outputLabel(room.publishMode).toLowerCase()}`} onClick={() => command(room.id, outputTarget ? "camera_off" : "camera_on")}><OutputIcon size={19} />{sharing ? "Share" : "Camera"}{pending && room.camera !== room.observed.camera ? <span className="text-[10px]">Pending</span> : null}</button>
      <button type="button" className={`${ioButton} ${audioOn ? "border-emerald-300/35 bg-emerald-300/10 text-emerald-200" : "text-white/55"}`} disabled={busy} aria-pressed={audioOn} aria-label={`${audioTarget ? "Mute" : "Unmute"} ${room.name}`} title={audioTarget ? "Mute program audio" : "Unmute program audio"} onClick={() => command(room.id, audioTarget ? "microphone_off" : "microphone_on")}><AudioIcon size={19} />{pending && room.microphone !== room.observed.microphone ? <span className="text-[10px]">Pending</span> : null}</button>
      <button type="button" className={`${ioButton} ml-auto`} disabled={busy} onClick={() => command(room.id, room.running ? "stop" : "start")}>{room.running ? <Square size={16} /> : <Play size={16} />}{room.running ? "Disconnect" : "Connect"}</button>
    </div>
    {!joined ? <p className="mt-3 text-xs text-white/45">On connection: picture {room.camera ? "on" : "off"} · audio {room.microphone ? "on" : "muted"}</p> : null}
    <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-black/20 p-3 text-xs">
      <div><span className="block text-white/35">Submitted to Zoom</span><span className="mt-1 block font-mono text-white/75">{joined && room.observed.sourceVideo ? room.observed.videoResolution || "Negotiating" : "—"}</span></div>
      <div><span className="block text-white/35">Program input</span><span className="mt-1 block text-white/75">{joined ? `${room.observed.sourceVideo ? "Picture" : "No picture"} · ${room.observed.sourceAudio ? "Audio" : "No audio"}` : "Waiting"}</span></div>
    </div>
    <p className={`mt-3 flex items-center gap-2 text-xs ${joined && room.observed.originalSound ? "text-emerald-200/80" : "text-white/40"}`}><AudioLines size={14} />Original Sound {joined ? room.observed.originalSound ? "on" : "unconfirmed" : "enabled on connection"}<span className="ml-auto text-white/30">Mono</span></p>
    {room.observed.error ? <p role="alert" className="mt-3 break-words text-xs text-amber-200">{!fresh ? "Last report: " : ""}{room.observed.error}</p> : null}
    <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
      <button type="button" className="flex items-center gap-1.5 text-xs text-blue-300" disabled={busy} onClick={() => edit(room)}><Pencil size={13} />Edit / Rename</button>
      <button type="button" className="text-white/35 hover:text-red-200 disabled:opacity-30" aria-label={`Delete ${room.name}`} disabled={busy || room.running || (fresh && !["stopped", "failed", "capacity"].includes(room.observed.status || ""))} onClick={() => remove(room)}><Trash2 size={15} /></button>
    </div>
  </article>
}
