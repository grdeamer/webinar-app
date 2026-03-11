"use client"

import { useState } from "react"
import AdminDateTimeField from "@/components/admin/AdminDateTimeField"

const DURATION_OPTIONS = [15, 30, 45, 60, 75, 90, 120]
const TZ_OPTIONS = [
  { value: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC", label: `Local (${Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"})` },
  { value: "America/New_York", label: "(GMT-5:00) Eastern Time (US and Canada)" },
  { value: "America/Chicago", label: "(GMT-6:00) Central Time (US and Canada)" },
  { value: "America/Denver", label: "(GMT-7:00) Mountain Time (US and Canada)" },
  { value: "America/Los_Angeles", label: "(GMT-8:00) Pacific Time (US and Canada)" },
  { value: "UTC", label: "UTC" },
].filter((opt, index, arr) => arr.findIndex((x) => x.value === opt.value) === index)

export default function AdminWebinarScheduleEditor(props: {
  webinarId: string
  initialWebinarDate: string | null
  initialDurationMinutes?: number | null
  initialTimezone?: string | null
}) {
  const [webinarDate, setWebinarDate] = useState<string | null>(props.initialWebinarDate)
  const [durationMinutes, setDurationMinutes] = useState<number>(props.initialDurationMinutes || 60)
  const [timezone, setTimezone] = useState<string>(props.initialTimezone || TZ_OPTIONS[0]?.value || "UTC")
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    setBusy(true)
    setMessage(null)
    setError(null)
    try {
      const res = await fetch(`/api/admin/webinars/${props.webinarId}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webinar_date: webinarDate, duration_minutes: durationMinutes, timezone }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || "Failed to save schedule")
      setMessage("Schedule saved")
    } catch (e: any) {
      setError(e.message || "Failed to save schedule")
    } finally {
      setBusy(false)
      setTimeout(() => setMessage(null), 2000)
    }
  }

  return (
    <section className="mt-8 rounded-[30px] border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-white/45">Scheduling</div>
          <h2 className="mt-2 text-2xl font-semibold">Webinar date and time</h2>
          <p className="mt-2 text-sm text-white/60">Use the same polished date and time controls used across the admin portal.</p>
        </div>
        <button
          onClick={save}
          disabled={busy}
          className="rounded-xl bg-emerald-600 px-4 py-2 font-semibold hover:bg-emerald-500 disabled:opacity-60"
        >
          Save schedule
        </button>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_280px]">
        <div>
          <AdminDateTimeField
            label="When"
            value={webinarDate}
            onChange={setWebinarDate}
            disabled={busy}
            helperText="This updates webinar_date for attendee scheduling and countdown displays."
          />
        </div>

        <div className="space-y-4 rounded-2xl border border-white/10 bg-black/20 p-4">
          <div>
            <div className="text-sm font-medium text-white/90">Duration</div>
            <div className="mt-2 grid grid-cols-[1fr_auto] items-center gap-3">
              <select
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                disabled={busy}
                className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-base text-white outline-none disabled:opacity-60"
              >
                {DURATION_OPTIONS.map((minutes) => (
                  <option key={minutes} value={minutes} className="text-black">
                    {minutes}
                  </option>
                ))}
              </select>
              <div className="text-sm text-white/75">min</div>
            </div>
          </div>

          <div>
            <div className="text-sm font-medium text-white/90">Time Zone</div>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              disabled={busy}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-base text-white outline-none disabled:opacity-60"
            >
              {TZ_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} className="text-black">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/65">
            This keeps webinar scheduling aligned with the look you wanted for events and session scheduling.
          </div>
        </div>
      </div>

      {error ? <div className="mt-4 text-sm text-red-400">{error}</div> : null}
      {message ? <div className="mt-4 text-sm text-emerald-400">{message}</div> : null}
    </section>
  )
}
