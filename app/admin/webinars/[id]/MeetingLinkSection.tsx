import { updateMeetingLink } from "./actions"
import { defaultLabel, type MeetingProvider } from "@/lib/meetingLinks"

export default function MeetingLinkSection({
  webinar,
}: {
  webinar: {
    id: string
    provider?: MeetingProvider | null
    join_url?: string | null
    meeting_url_label?: string | null
  }
}) {
  const joinUrl = webinar.join_url ?? ""
  const provider = (webinar.provider ?? "manual") as MeetingProvider
  const label = webinar.meeting_url_label?.trim() || defaultLabel(provider)

  return (
    <section className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6">
      <h2 className="text-xl font-semibold">Meeting link</h2>
      <p className="mt-2 text-white/70">
        Paste a Zoom or Teams link provided by the host. We’ll show it as a “Join” button.
      </p>

      <form action={updateMeetingLink} className="mt-4 space-y-3">
        <input type="hidden" name="webinarId" value={webinar.id} />

        <div className="grid gap-2">
          <label className="text-sm text-white/70">Provider</label>
          <select
            name="provider"
            defaultValue={provider}
            className="rounded-xl bg-slate-950 border border-white/15 px-3 py-2"
          >
            <option value="auto">Auto-detect from URL</option>
            <option value="manual">Manual</option>
            <option value="zoom">Zoom</option>
            <option value="teams">Teams</option>
          </select>
        </div>

        <div className="grid gap-2">
          <label className="text-sm text-white/70">Join URL</label>
          <input
            name="joinUrl"
            defaultValue={joinUrl}
            placeholder="https://…"
            className="rounded-xl bg-slate-950 border border-white/15 px-3 py-2 w-full"
          />
        </div>

        <div className="grid gap-2">
          <label className="text-sm text-white/70">Button label (optional)</label>
          <input
            name="label"
            defaultValue={webinar.meeting_url_label ?? ""}
            placeholder={defaultLabel(provider)}
            className="rounded-xl bg-slate-950 border border-white/15 px-3 py-2 w-full"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="rounded-xl bg-white text-slate-950 px-4 py-2 font-semibold hover:bg-white/90"
          >
            Save link
          </button>

          {joinUrl ? (
            <a
              href={joinUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl border border-white/20 px-4 py-2 hover:bg-white/10"
            >
              {label} ↗
            </a>
          ) : (
            <span className="text-white/50 text-sm">No link saved yet</span>
          )}
        </div>
      </form>
    </section>
  )
}