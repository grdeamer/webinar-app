"use client"
export default function TimelineControls({ values, onChange }: { values: Record<string, unknown>; onChange: (patch: Record<string, unknown>) => void }) {
  const input = "mt-2 w-full rounded-lg border border-white/10 bg-[#111520] px-3 py-2 text-sm text-white"
  return <div className="mt-5 space-y-4 text-xs text-white/65">
    <p className="leading-5">A session is one scheduled activity. A track groups related sessions, such as Main Stage or Clinical. Each session has its own progress line; parallel sessions progress independently.</p>
    <label className="block">Track filter<input className={input} placeholder="All tracks" value={String(values.timelineTrack || "")} onChange={e => onChange({ timelineTrack: e.target.value })} /><span className="mt-1 block text-white/40">Use a track name from Agenda. Blank shows all tracks; unassigned sessions appear under General.</span></label>
    <label className="flex items-center gap-2"><input type="checkbox" checked={values.showRemaining !== false} onChange={e => onChange({ showRemaining: e.target.checked })} />Show time remaining</label>
    <label className="flex items-center justify-between">Progress color<input type="color" value={String(values.accentColor || "#eb1700")} onChange={e => onChange({ accentColor: e.target.value })} /></label>
    <p className="leading-5 text-white/40">Progress follows scheduled times. It does not start or end the live broadcast. Equal start and end times are milestones.</p>
  </div>
}
