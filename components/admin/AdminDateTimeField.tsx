"use client"

import { useEffect, useMemo, useRef, useState } from "react"

type Props = {
  label: string
  value: string | null | undefined
  onChange: (nextIso: string | null) => void
  disabled?: boolean
  helperText?: string
  includeDuration?: boolean
  durationMinutes?: number
  onDurationChange?: (minutes: number) => void
}

const TIMEZONES = [
  { value: "America/New_York", label: "(GMT-5:00) Eastern Time (US and Canada)" },
  { value: "America/Chicago", label: "(GMT-6:00) Central Time (US and Canada)" },
  { value: "America/Denver", label: "(GMT-7:00) Mountain Time (US and Canada)" },
  { value: "America/Los_Angeles", label: "(GMT-8:00) Pacific Time (US and Canada)" },
  { value: "UTC", label: "(GMT+0:00) UTC" },
]

function pad(n: number) {
  return String(n).padStart(2, "0")
}

function toDateInputValue(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function to12HourParts(date: Date) {
  let hours = date.getHours()
  const minutes = date.getMinutes()
  const ampm = hours >= 12 ? "PM" : "AM"
  hours = hours % 12
  if (hours === 0) hours = 12
  return {
    time: `${pad(hours)}:${pad(minutes)}`,
    ampm,
  }
}

function parseIncomingValue(value: string | null | undefined) {
  if (!value) {
    return {
      date: "",
      time: "12:00",
      ampm: "PM",
      timezone: "America/New_York",
    }
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return {
      date: "",
      time: "12:00",
      ampm: "PM",
      timezone: "America/New_York",
    }
  }

  const { time, ampm } = to12HourParts(parsed)

  return {
    date: toDateInputValue(parsed),
    time,
    ampm,
    timezone: "America/New_York",
  }
}

function buildIsoString(date: string, time: string, ampm: string) {
  if (!date || !time) return null

  const [year, month, day] = date.split("-").map(Number)
  const [rawHour, minute] = time.split(":").map(Number)

  if (!year || !month || !day || Number.isNaN(rawHour) || Number.isNaN(minute)) {
    return null
  }

  let hour = rawHour % 12
  if (ampm === "PM") hour += 12

  const dt = new Date(year, month - 1, day, hour, minute, 0, 0)
  if (Number.isNaN(dt.getTime())) return null

  return dt.toISOString()
}

export default function AdminDateTimeField({
  label,
  value,
  onChange,
  disabled,
  helperText,
  includeDuration = false,
  durationMinutes = 60,
  onDurationChange,
}: Props) {
  const initial = useMemo(() => parseIncomingValue(value), [value])

  const [date, setDate] = useState(initial.date)
  const [time, setTime] = useState(initial.time)
  const [ampm, setAmpm] = useState(initial.ampm)
  const [timezone, setTimezone] = useState(initial.timezone)
  const [duration, setDuration] = useState(durationMinutes)

  const lastPropValueRef = useRef<string | null | undefined>(value)
  const suppressEmitRef = useRef(false)
  const onChangeRef = useRef(onChange)
  const onDurationChangeRef = useRef(onDurationChange)

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    onDurationChangeRef.current = onDurationChange
  }, [onDurationChange])

  useEffect(() => {
    if (lastPropValueRef.current === value) return

    const next = parseIncomingValue(value)
    suppressEmitRef.current = true
    setDate(next.date)
    setTime(next.time)
    setAmpm(next.ampm)
    setTimezone(next.timezone)
    lastPropValueRef.current = value
  }, [value])

  useEffect(() => {
    if (includeDuration) {
      setDuration(durationMinutes)
    }
  }, [includeDuration, durationMinutes])

  const nextIso = useMemo(() => buildIsoString(date, time, ampm), [date, time, ampm])

  useEffect(() => {
    if (suppressEmitRef.current) {
      suppressEmitRef.current = false
      return
    }

    const normalizedCurrent = value ?? null
    const normalizedNext = nextIso ?? null

    if (normalizedCurrent !== normalizedNext) {
      onChangeRef.current(normalizedNext)
    }
  }, [nextIso, value])

  useEffect(() => {
    if (includeDuration && onDurationChangeRef.current) {
      onDurationChangeRef.current(duration)
    }
  }, [duration, includeDuration])

  const timeOptions = Array.from({ length: 12 }, (_, i) => i + 1)
    .map((h) => pad(h))
    .flatMap((h) => [`${h}:00`, `${h}:15`, `${h}:30`, `${h}:45`])

  return (
    <div className="space-y-3">
      <label className="block text-sm text-white/80">{label}</label>

      <div className="grid gap-3 md:grid-cols-[1.4fr_1fr_140px]">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          disabled={disabled}
          className="h-12 rounded-2xl border border-white/10 bg-white/10 px-4 text-white outline-none"
        />

        <select
          value={time}
          onChange={(e) => setTime(e.target.value)}
          disabled={disabled}
          className="h-12 rounded-2xl border border-white/10 bg-white/10 px-4 text-white outline-none"
        >
          {timeOptions.map((opt) => (
            <option key={opt} value={opt} className="text-black">
              {opt}
            </option>
          ))}
        </select>

        <select
          value={ampm}
          onChange={(e) => setAmpm(e.target.value)}
          disabled={disabled}
          className="h-12 rounded-2xl border border-white/10 bg-white/10 px-4 text-white outline-none"
        >
          <option value="AM" className="text-black">
            AM
          </option>
          <option value="PM" className="text-black">
            PM
          </option>
        </select>
      </div>

      {includeDuration ? (
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_2fr]">
          <select
            value={Math.floor(duration / 60)}
            onChange={(e) => {
              const hours = Number(e.target.value) || 0
              const minutes = duration % 60
              setDuration(hours * 60 + minutes)
            }}
            disabled={disabled}
            className="h-12 rounded-2xl border border-white/10 bg-white/10 px-4 text-white outline-none"
          >
            {Array.from({ length: 13 }, (_, i) => i).map((h) => (
              <option key={h} value={h} className="text-black">
                {h} hr
              </option>
            ))}
          </select>

          <select
            value={duration % 60}
            onChange={(e) => {
              const minutes = Number(e.target.value) || 0
              const hours = Math.floor(duration / 60)
              setDuration(hours * 60 + minutes)
            }}
            disabled={disabled}
            className="h-12 rounded-2xl border border-white/10 bg-white/10 px-4 text-white outline-none"
          >
            {[0, 15, 30, 45].map((m) => (
              <option key={m} value={m} className="text-black">
                {m} min
              </option>
            ))}
          </select>

          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            disabled={disabled}
            className="h-12 rounded-2xl border border-white/10 bg-white/10 px-4 text-white outline-none"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value} className="text-black">
                {tz.label}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <select
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          disabled={disabled}
          className="h-12 w-full rounded-2xl border border-white/10 bg-white/10 px-4 text-white outline-none"
        >
          {TIMEZONES.map((tz) => (
            <option key={tz.value} value={tz.value} className="text-black">
              {tz.label}
            </option>
          ))}
        </select>
      )}

      {helperText ? <p className="text-xs text-white/50">{helperText}</p> : null}
    </div>
  )
}