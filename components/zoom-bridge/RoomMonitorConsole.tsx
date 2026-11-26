"use client"

import { type FormEvent, useId, useRef, useState } from "react"
import { Ellipsis } from "lucide-react"
import { type MonitorRoom, monitorMeetingNumber, monitorPageCount, monitorPageSize, monitorRoomLimit } from "@/lib/zoom-bridge/monitor-rooms"
import IoRuntimePanel from "./IoRuntimePanel"
import { activeReceiver, useRoomReceiver } from "./useRoomReceiver"
import { updateMonitorRooms, useMonitorRooms } from "./useMonitorRooms"
import { useRoomAudio } from "./useRoomAudio"
import "./room-monitor.css"

const button = "io-room-button rounded-md border px-3 py-2 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-45"
const primary = `${button} io-room-primary`
const field = "mt-1 block w-full rounded-md io-room-input border px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"

function RoomForm({ room, busy, onSave, onCancel }: {
  room?: MonitorRoom
  busy: boolean
  onSave: (name: string, meeting: string) => Promise<void>
  onCancel?: () => void
}) {
  const formId = useId()
  const [error, setError] = useState("")
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setError("")
    try {
      await onSave(String(form.get("name") ?? ""), String(form.get("meeting") ?? ""))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save the room.")
    }
  }

  return <form onSubmit={submit} aria-label={room ? "Edit room" : "Connect room"} className="space-y-3">
    <div className={room ? "space-y-3" : "flex flex-wrap items-end gap-3"}>
      <label className="block flex-[2_1_15rem] text-sm io-secondary" htmlFor={`${formId}-meeting`}>
        Zoom link or meeting ID
        <input id={`${formId}-meeting`} name="meeting" type="text" className={field} required maxLength={2048}
          placeholder="https://zoom.us/j/…" defaultValue={room?.meetingNumber} autoComplete="off" spellCheck={false} />
      </label>
      <label className="block flex-[1_1_9rem] text-sm io-secondary" htmlFor={`${formId}-name`}>
        Room name <span className="io-muted">(optional)</span>
        <input id={`${formId}-name`} name="name" className={field} maxLength={100} defaultValue={room?.name} autoComplete="off" />
      </label>
      <button type="submit" className={primary} disabled={busy}>{room ? "Save changes" : "Connect room"}</button>
      {onCancel ? <button type="button" className={button} onClick={onCancel} disabled={busy}>Cancel</button> : null}
    </div>
    {error ? <p role="alert" className="text-sm io-error">{error}</p> : null}
  </form>
}

function RoomTile({ room, number, status, picture, listening, audioAvailable, busy, onListen, onSave, onCommand }: {
  room: MonitorRoom; number: number; status: string; picture?: string; listening: boolean; audioAvailable: boolean; busy: boolean
  onListen: () => void
  onSave: (name: string, meeting: string) => Promise<void>
  onCommand: (action: "reconnect" | "disconnect") => Promise<boolean>
}) {
  const [face, setFace] = useState<"video" | "details" | "edit">("video")
  const menu = useRef<HTMLDetailsElement>(null)
  function select(next: typeof face) {
    if (menu.current) menu.current.open = false
    setFace(next)
  }
  async function command(action: "reconnect" | "disconnect") {
    select("video")
    await onCommand(action)
  }

  return <article aria-label={room.name} className={`min-w-0 io-room-card rounded-lg border ${listening ? "io-room-listening" : ""}`}>
    <header className="flex min-h-10 items-center justify-between gap-2 rounded-t-lg io-rule border-b px-3">
      <h2 className="truncate text-sm font-medium"><span className="mr-2 tabular-nums io-muted">{String(number).padStart(2, "0")}</span>{room.name}</h2>
      <details ref={menu} className="relative shrink-0" onKeyDown={event => {
        if (event.key === "Escape" && menu.current?.open) {
          menu.current.open = false
          menu.current.querySelector("summary")?.focus()
        }
      }}>
        <summary aria-label={`Options for ${room.name}`} className="grid size-8 cursor-pointer list-none place-items-center rounded-md io-room-hover [&::-webkit-details-marker]:hidden">
          <Ellipsis size={18} aria-hidden="true" />
        </summary>
        <div className="absolute right-0 top-full z-20 mt-1 w-36 rounded-lg io-room-popover border p-1 text-sm shadow-lg">
          <button type="button" className="block w-full rounded-md px-3 py-2 text-left io-room-hover" onClick={() => select("details")}>Room details</button>
          <button type="button" className="block w-full rounded-md px-3 py-2 text-left io-room-hover" onClick={() => select("edit")}>Edit room</button>
          <button type="button" className="block w-full rounded-md px-3 py-2 text-left io-room-hover disabled:opacity-45" disabled={busy} onClick={() => void command("reconnect")}>Reconnect</button>
          <button type="button" className="block w-full rounded-md px-3 py-2 text-left io-error io-room-hover disabled:opacity-45" disabled={busy || status === "Disconnected"} onClick={() => void command("disconnect")}>Disconnect</button>
        </div>
      </details>
    </header>
    {face === "edit" ? <div className="p-3">
      <RoomForm key={room.meetingNumber} room={room} busy={busy} onCancel={() => setFace("video")} onSave={async (name, meeting) => {
        await onSave(name, meeting)
        setFace("video")
      }} />
    </div> : face === "details" ? <div className="io-monitor-details min-h-32 rounded-b-lg p-3 text-sm">
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
        <dt className="io-muted">Connection</dt><dd>{status}</dd>
        <dt className="io-muted">Audio</dt><dd>{listening ? "Listening" : "Muted"}</dd>
        <dt className="io-muted">Meeting ID</dt><dd className="tabular-nums">{room.meetingNumber}</dd>
      </dl>
      <button type="button" className={`mt-3 ${button}`} onClick={() => setFace("video")}>Back to video</button>
    </div> : <div className="relative aspect-video overflow-hidden rounded-b-lg bg-[#0c0d0f]">
      {/* eslint-disable-next-line @next/next/no-img-element -- ephemeral authenticated camera return */}
      {picture ? <img src={picture} alt={`Zoom return for ${room.name}`} className="h-full w-full object-contain" />
        : <p className="absolute inset-0 grid place-items-center px-2 text-center text-sm text-zinc-400">{status}</p>}
      {picture && (audioAvailable || listening) ? <button
        type="button"
        aria-label={listening ? `Mute ${room.name}` : `Listen to ${room.name}`}
        aria-pressed={listening}
        onClick={onListen}
        className="absolute inset-0 rounded-b-lg focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white"
      /> : null}
    </div>}
  </article>
}

export default function RoomMonitorConsole({ canStartSharedServer = false }: { canStartSharedServer?: boolean }) {
  const rooms = useMonitorRooms()
  const receiver = useRoomReceiver()
  const audio = useRoomAudio()
  const [page, setPage] = useState(0)
  const [adding, setAdding] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState("")
  const activeMeeting = activeReceiver(receiver.status) ? receiver.status?.meetingId : undefined
  const start = page * monitorPageSize
  const visible = rooms.slice(start, start + monitorPageSize)

  function ensureUnique(meetingNumber: string, id?: string) {
    if (rooms.some(room => room.meetingNumber === meetingNumber && room.id !== id)) {
      throw new Error("That Zoom meeting is already in the room list.")
    }
  }

  async function connect(action: "connect" | "reconnect" | "disconnect", room: MonitorRoom) {
    setBusy(true)
    setNotice("")
    try {
      await receiver.command(action, room.meetingNumber)
      if (action === "disconnect" && audio.room?.id === room.id) audio.stop()
      setNotice(action === "disconnect" ? `${room.name} disconnected.`
        : "Join the meeting from the receiver console. Admit Jupiter Monitor in Zoom if prompted.")
      return true
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : "Unable to reach the room receiver.")
      return false
    } finally {
      setBusy(false)
    }
  }

  async function addRoom(name: string, meeting: string) {
    if (rooms.length >= monitorRoomLimit) throw new Error("All 48 room slots are in use.")
    const meetingNumber = monitorMeetingNumber(meeting)
    ensureUnique(meetingNumber)
    const room = { id: crypto.randomUUID(), name: name.trim() || `Room ${rooms.length + 1}`, meetingNumber }
    updateMonitorRooms(current => [...current, room])
    setPage(Math.floor(rooms.length / monitorPageSize))
    setAdding(false)
    await connect("connect", room)
  }

  async function editRoom(room: MonitorRoom, name: string, meeting: string) {
    const meetingNumber = monitorMeetingNumber(meeting)
    ensureUnique(meetingNumber, room.id)
    const next = { ...room, name: name.trim() || room.name, meetingNumber }
    if (meetingNumber !== room.meetingNumber && activeMeeting === room.meetingNumber) {
      setBusy(true)
      setNotice("")
      try {
        await receiver.command("reconnect", room.meetingNumber, meetingNumber)
        if (audio.room?.id === room.id) audio.stop()
        setNotice("Join the new meeting from the receiver console and admit Jupiter Monitor if prompted.")
      } finally {
        setBusy(false)
      }
    }
    updateMonitorRooms(current => current.map(item => item.id === room.id ? next : item))
  }

  return <section aria-label="Room monitoring" className={`min-h-[65vh] io-room-monitor rounded-lg border ${rooms.length === 0 ? "io-monitor-empty" : ""}`}>
    <header className="flex flex-wrap items-center justify-between gap-3 io-rule border-b px-4 py-3 sm:px-6">
      <h1 className="text-lg font-semibold tracking-tight">Monitor</h1>
      <div className="flex flex-wrap items-center gap-2">
        {canStartSharedServer ? <details className="relative">
          <summary className={`${button} cursor-pointer list-none [&::-webkit-details-marker]:hidden`}>Shared server</summary>
          <div className="absolute right-0 top-full z-30 mt-2 w-[min(24rem,calc(100vw-3rem))] rounded-lg io-room-popover border p-2 shadow-xl">
            <IoRuntimePanel purpose="monitor" />
          </div>
        </details> : null}
      {rooms.length > 0 && rooms.length < monitorRoomLimit ? <button type="button" className={adding ? button : primary} onClick={() => setAdding(value => !value)} aria-expanded={adding}>{adding ? "Close" : "Connect room"}</button> : null}
      </div>
    </header>
    <div className="space-y-4 p-4 sm:p-6">
      {rooms.length === 0 || adding ? <div className="max-w-3xl">
        <RoomForm busy={busy} onSave={addRoom} />
        {rooms.length === 0 ? <p className="mt-3 text-sm io-muted">No rooms connected</p> : null}
      </div> : null}
      {notice ? <p role="status" className="text-sm io-secondary">{notice}</p> : null}
      {rooms.length > 0 ? <>
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm io-muted">
          <span>{rooms.length} {rooms.length === 1 ? "room" : "rooms"} · {activeMeeting && rooms.some(room => room.meetingNumber === activeMeeting) ? 1 : 0} connected</span>
          {audio.room || audio.message ? <div className="flex items-center gap-2 io-secondary">
            <span role="status">{audio.message || `Listening to ${rooms.find(room => room.id === audio.room?.id)?.name ?? audio.room?.name}`}</span>
            {audio.room ? <button type="button" className={button} onClick={audio.stop}>Mute</button> : null}
          </div> : null}
        </div>
        <nav aria-label="Room pages" className="flex gap-2 io-rule border-b">
          {Array.from({ length: monitorPageCount }, (_, index) => <button type="button" key={index}
            aria-current={page === index ? "page" : undefined}
            onClick={() => setPage(index)}
            className="io-page-tab rounded-md px-3 py-2 text-sm tabular-nums">
            {String(index * monitorPageSize + 1).padStart(2, "0")}–{(index + 1) * monitorPageSize}
          </button>)}
        </nav>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {visible.map((room, index) => {
            const attached = activeMeeting === room.meetingNumber
            const picture = attached ? receiver.picture : undefined
            const roomStatus = attached ? (picture ? "Receiver active" : "Waiting for Zoom video") : "Disconnected"
            return <RoomTile key={room.id} room={room} number={start + index + 1} busy={busy}
              status={roomStatus} picture={picture} audioAvailable={Boolean(receiver.status?.audio && attached)}
              listening={audio.room?.id === room.id} onListen={() => audio.toggle(room)}
              onSave={(name, meeting) => editRoom(room, name, meeting)}
              onCommand={action => connect(action, room)} />
          })}
        </div>
        {visible.length === 0 ? <p className="text-sm io-muted">No rooms on this page.</p> : null}
      </> : null}
      {rooms.length > 0 && !canStartSharedServer ? <details className="max-w-3xl text-sm io-muted">
        <summary className="cursor-pointer rounded-md py-2">Shared server options</summary>
        <IoRuntimePanel purpose="monitor" />
      </details> : null}
    </div>
  </section>
}
