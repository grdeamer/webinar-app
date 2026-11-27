"use client"

import { type FormEvent, useId, useRef, useState } from "react"
import { type MonitorRoom } from "@/lib/zoom-bridge/monitor-rooms"
import { monitorRoomCsvTemplate } from "@/lib/zoom-bridge/monitor-room-csv"

export const roomButton = "io-room-button rounded-md border px-3 py-2 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-45"
export const primaryRoomButton = `${roomButton} io-room-primary`
const field = "mt-1 block w-full rounded-md io-room-input border px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"

export default function RoomForm({ room, busy, onSave, onBulkSave, onCsvSave, onCancel }: {
  room?: MonitorRoom
  busy: boolean
  onSave: (name: string, meeting: string) => Promise<void>
  onBulkSave?: (meetings: string) => void
  onCsvSave?: (csv: string) => void
  onCancel?: () => void
}) {
  const formId = useId()
  const [mode, setMode] = useState<"single" | "paste" | "csv">("single")
  const [readingCsv, setReadingCsv] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const disabled = busy || readingCsv
  const [error, setError] = useState("")
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setError("")
    try {
      if (mode === "csv" && onCsvSave) {
        const input = fileInput.current
        const file = input?.files?.[0]
        if (!file || !/\.csv$/i.test(file.name) || file.size === 0) throw new Error("Choose a CSV file with room information.")
        if (file.size > 512 * 1024) throw new Error("Choose a room CSV smaller than 512 KB.")
        setReadingCsv(true)
        const csv = await file.text()
        if (fileInput.current === input) onCsvSave(csv)
      } else {
        const meetings = String(form.get("meeting") ?? "")
        if (mode === "paste" && onBulkSave) onBulkSave(meetings)
        else await onSave(String(form.get("name") ?? ""), meetings)
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save the room.")
    } finally {
      setReadingCsv(false)
    }
  }

  function switchMode(next: typeof mode) {
    setError("")
    setMode(next)
  }

  return <form onSubmit={submit} aria-label={room ? "Edit room" : mode === "single" ? "Connect room" : "Add rooms"} className="space-y-3">
    {mode === "csv" ? <div>
      <label htmlFor={`${formId}-csv`} className="block text-sm io-secondary">Room list CSV</label>
      <input id={`${formId}-csv`} ref={fileInput} type="file" accept=".csv,text/csv" required disabled={disabled}
        className={field} aria-describedby={`${formId}-csv-help`} onChange={() => setError("")} />
      <p id={`${formId}-csv-help`} className="mt-1.5 text-sm io-muted">
        Enter a room name and either a Zoom join link or meeting ID. An optional passcode is available in Room details until you reload or leave Monitor.
      </p>
      <button className={`mt-3 ${primaryRoomButton}`} type="submit" disabled={disabled}>{readingCsv ? "Reading CSV…" : "Add rooms"}</button>
    </div> : mode === "paste" ? <div>
      <label htmlFor={`${formId}-meeting`} className="block text-sm io-secondary">Zoom links or meeting IDs</label>
      <textarea id={`${formId}-meeting`} name="meeting" rows={5} required
        aria-describedby={`${formId}-bulk-help`} className={`${field} resize-y`}
        autoComplete="off" spellCheck={false} />
      <p id={`${formId}-bulk-help`} className="mt-1.5 text-sm io-muted">
        One link or ID per line. Rooms are saved to this browser for connecting later.
      </p>
      <button className={`mt-3 ${primaryRoomButton}`} type="submit" disabled={busy}>Add rooms</button>
    </div> : <div className={room ? "space-y-3" : "flex flex-wrap items-end gap-3"}>
      <label className="block flex-[2_1_15rem] text-sm io-secondary" htmlFor={`${formId}-meeting`}>
        Zoom link or meeting ID
        <input id={`${formId}-meeting`} name="meeting" type="text" className={field} required maxLength={2048}
          placeholder="https://zoom.us/j/…" defaultValue={room?.meetingNumber} autoComplete="off" spellCheck={false} />
      </label>
      <label className="block flex-[1_1_9rem] text-sm io-secondary" htmlFor={`${formId}-name`}>
        Room name <span className="io-muted">(optional)</span>
        <input id={`${formId}-name`} name="name" className={field} maxLength={100} defaultValue={room?.name} autoComplete="off" />
      </label>
      <button type="submit" className={primaryRoomButton} disabled={busy}>{room ? "Save changes" : "Connect room"}</button>
      {onCancel ? <button type="button" className={roomButton} onClick={onCancel} disabled={busy}>Cancel</button> : null}
    </div>}
    {onBulkSave || onCsvSave ? <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm io-secondary">
      {onBulkSave && mode !== "paste" ? <button type="button" className="rounded-sm underline underline-offset-4 hover:no-underline"
        disabled={disabled} onClick={() => switchMode("paste")}>Add multiple rooms</button> : null}
      {onCsvSave && mode !== "csv" ? <button type="button" className="rounded-sm underline underline-offset-4 hover:no-underline"
        disabled={disabled} onClick={() => switchMode("csv")}>Upload CSV</button> : null}
      {mode !== "single" ? <button type="button" className="rounded-sm underline underline-offset-4 hover:no-underline"
        disabled={disabled} onClick={() => switchMode("single")}>Back to one room</button> : null}
      {onCsvSave ? <a className="rounded-sm underline underline-offset-4 hover:no-underline"
        href={`data:text/csv;charset=utf-8,${encodeURIComponent(monitorRoomCsvTemplate)}`}
        download="jupiter-io-room-template.csv">Download template</a> : null}
    </div> : null}
    {error ? <p role="alert" className="text-sm io-error">{error}</p> : null}
  </form>
}
