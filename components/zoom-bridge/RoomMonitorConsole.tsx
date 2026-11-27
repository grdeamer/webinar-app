"use client"

import { useRef, useState } from "react"
import { Ellipsis } from "lucide-react"
import { type MonitorRoom, monitorMeetingNumber, monitorPageCount, monitorPageSize, monitorRoomLimit, planMonitorRoomImport } from "@/lib/zoom-bridge/monitor-rooms"
import { planMonitorRoomCsv } from "@/lib/zoom-bridge/monitor-room-csv"
import RoomForm, { roomButton as button, primaryRoomButton as primary } from "./RoomForm"
import IoRuntimePanel from "./IoRuntimePanel"
import { activeReceiver, useRoomReceiver } from "./useRoomReceiver"
import { updateMonitorRooms, useMonitorRooms } from "./useMonitorRooms"
import { useRoomAudio } from "./useRoomAudio"
import "./room-monitor.css"

type RoomAccess = { passcode?: string; joinLink?: string }
type ImportedRoom = Pick<MonitorRoom, "name" | "meetingNumber"> & { access?: RoomAccess }

function RoomTile({ room, access, number, status, picture, listening, audioAvailable, busy, onListen, onSave, onCommand }: {
  room: MonitorRoom; access?: RoomAccess; number: number; status: string; picture?: string; listening: boolean; audioAvailable: boolean; busy: boolean
  onListen: () => void
  onSave: (name: string, meeting: string) => Promise<void>
  onCommand: (action: "reconnect" | "disconnect") => Promise<boolean>
}) {
  const [face, setFace] = useState<"video" | "details" | "edit">("video")
  const menu = useRef<HTMLDetailsElement>(null)
  const [copyStatus, setCopyStatus] = useState("")
  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value)
      setCopyStatus(`${label} copied.`)
    } catch {
      setCopyStatus(`Couldn’t copy the ${label.toLowerCase()}.`)
    }
  }
  function select(next: typeof face) {
    if (menu.current) menu.current.open = false
    setCopyStatus("")
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
      <div className="mt-3 flex flex-wrap gap-2">
        {access?.passcode ? <button type="button" className={button}
          onClick={() => { if (access.passcode) void copy(access.passcode, "Passcode") }}>Copy passcode</button> : null}
        {access?.joinLink ? <button type="button" className={button}
          onClick={() => { if (access.joinLink) void copy(access.joinLink, "Zoom link") }}>Copy Zoom link</button> : null}
        <button type="button" className={button} onClick={() => select("video")}>Back to video</button>
      </div>
      {copyStatus ? <p role="status" className="mt-2 io-muted">{copyStatus}</p> : null}
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
  const [roomAccess, setRoomAccess] = useState<Record<string, RoomAccess & { meetingNumber: string }>>({})
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

  function importRooms(planImport: (savedMeetingNumbers: string[]) => {
    rooms: ImportedRoom[]
    duplicates: number
  }) {
    let firstIndex = 0
    let added = 0
    let duplicates = 0
    const importedAccess: typeof roomAccess = {}
    updateMonitorRooms(current => {
      const plan = planImport(current.map(room => room.meetingNumber))
      firstIndex = current.length
      added = plan.rooms.length
      duplicates = plan.duplicates
      return [...current, ...plan.rooms.map((room, index) => {
        const id = crypto.randomUUID()
        if (room.access) importedAccess[id] = { ...room.access, meetingNumber: room.meetingNumber }
        return { id, name: room.name || `Room ${firstIndex + index + 1}`, meetingNumber: room.meetingNumber }
      })]
    })
    if (Object.keys(importedAccess).length) setRoomAccess(current => ({ ...current, ...importedAccess }))
    setPage(Math.floor(firstIndex / monitorPageSize))
    setAdding(false)
    setNotice(`Added ${added} ${added === 1 ? "room" : "rooms"}.${duplicates ? ` Skipped ${duplicates} ${duplicates === 1 ? "duplicate" : "duplicates"}.` : ""}`)
  }

  function addRooms(input: string) {
    importRooms(savedMeetingNumbers => {
      const { meetingNumbers, duplicates } = planMonitorRoomImport(input, savedMeetingNumbers)
      return { rooms: meetingNumbers.map(meetingNumber => ({ name: "", meetingNumber })), duplicates }
    })
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
    if (meetingNumber !== room.meetingNumber && roomAccess[room.id]) {
      setRoomAccess(current => {
        const nextAccess = { ...current }
        delete nextAccess[room.id]
        return nextAccess
      })
    }
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
        <RoomForm busy={busy} onSave={addRoom} onBulkSave={addRooms}
          onCsvSave={csv => importRooms(saved => planMonitorRoomCsv(csv, saved))} />
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
            const access = roomAccess[room.id]
            return <RoomTile key={room.id} room={room} access={access?.meetingNumber === room.meetingNumber ? access : undefined}
              number={start + index + 1} busy={busy}
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
