export default function EventScheduleRail({
  items,
  eventSlug,
}: {
  items: Array<{ id: string; title: string; start_at: string | null; end_at: string | null; track?: string | null; speaker?: string | null }>
  eventSlug: string
}) {
  return (
    <aside className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl shadow-black/20">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Schedule rail</h2>
          <p className="mt-1 text-sm text-white/55">A fast scan of key session times from the event home page.</p>
        </div>
        <a href={`/events/${eventSlug}/agenda`} className="text-sm text-sky-200 hover:text-sky-100">Full agenda →</a>
      </div>

      <div className="mt-5 space-y-3">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-4 text-sm text-white/60">
            Add agenda items and they will appear here automatically.
          </div>
        ) : (
          items.map((item, index) => (
            <div key={item.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-start gap-3">
                <div className="w-16 shrink-0 rounded-xl border border-white/10 bg-white/5 px-2 py-2 text-center text-xs text-white/60">
                  <div>{formatTime(item.start_at)}</div>
                  <div className="mt-1 text-white/35">#{index + 1}</div>
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-white">{item.title}</div>
                  <div className="mt-1 text-xs text-white/50">{formatRange(item.start_at, item.end_at)}</div>
                  {item.track ? <div className="mt-1 text-xs text-sky-200">{item.track}</div> : null}
                  {item.speaker ? <div className="mt-1 text-xs text-white/55">{item.speaker}</div> : null}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  )
}

function formatTime(value: string | null) {
  if (!value) return "TBD"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return "TBD"
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function formatRange(start: string | null, end: string | null) {
  if (!start) return "Time TBD"
  const startLabel = new Date(start).toLocaleString()
  if (!end) return startLabel
  return `${startLabel} – ${new Date(end).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
}
