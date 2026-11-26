"use client"

import { useMemo, useSyncExternalStore } from "react"
import { type MonitorRoom, readMonitorRooms } from "@/lib/zoom-bridge/monitor-rooms"

const key = "jupiter-io.monitor-rooms.v1"
const localChange = "jupiter-io.monitor-rooms.changed"
const empty = "[]"
let fallback: string | undefined

function read() {
  try { return fallback ?? localStorage.getItem(key) ?? empty }
  catch { return fallback ?? empty }
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback)
  window.addEventListener(localChange, callback)
  return () => {
    window.removeEventListener("storage", callback)
    window.removeEventListener(localChange, callback)
  }
}

export function useMonitorRooms() {
  const raw = useSyncExternalStore(subscribe, read, () => empty)
  return useMemo(() => readMonitorRooms(raw), [raw])
}

export function updateMonitorRooms(update: (rooms: MonitorRoom[]) => MonitorRoom[]) {
  const next = JSON.stringify(update(readMonitorRooms(read())))
  try {
    localStorage.setItem(key, next)
    fallback = undefined
  } catch {
    fallback = next
  }
  window.dispatchEvent(new Event(localChange))
}
