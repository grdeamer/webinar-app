"use client"

import type { FormEvent, ReactNode } from "react"
import { useMemo, useState } from "react"
import { formatSpeakerCardsForEditor, parseSpeakerCards } from "@/lib/eventExperience"

type Props = {
  webinarId: string
  initialSpeaker?: string | null
  initialThumbnailUrl?: string | null
  initialPlaybackType?: string | null
  initialPlaybackMp4Url?: string | null
  initialPlaybackM3u8Url?: string | null
  initialSpeakerCards?: any
}

export default function AdminWebinarExperienceEditor(props: Props) {
  const [speaker, setSpeaker] = useState(props.initialSpeaker || "")
  const [thumbnailUrl, setThumbnailUrl] = useState(props.initialThumbnailUrl || "")
  const [playbackType, setPlaybackType] = useState((props.initialPlaybackType || "").toLowerCase())
  const [playbackMp4Url, setPlaybackMp4Url] = useState(props.initialPlaybackMp4Url || "")
  const [playbackM3u8Url, setPlaybackM3u8Url] = useState(props.initialPlaybackM3u8Url || "")
  const [speakerCardLines, setSpeakerCardLines] = useState(formatSpeakerCardsForEditor(props.initialSpeakerCards))
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const effectivePlayback = useMemo(() => {
    if (playbackType === "hls" && playbackM3u8Url.trim()) return { type: "HLS", url: playbackM3u8Url.trim() }
    if (playbackType === "mp4" && playbackMp4Url.trim()) return { type: "MP4", url: playbackMp4Url.trim() }
    if (playbackM3u8Url.trim()) return { type: "HLS", url: playbackM3u8Url.trim() }
    if (playbackMp4Url.trim()) return { type: "MP4", url: playbackMp4Url.trim() }
    return null
  }, [playbackType, playbackMp4Url, playbackM3u8Url])

  const previewSpeakers = useMemo(() => parseSpeakerCards(speakerCardLines).slice(0, 2), [speakerCardLines])

  async function onSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    setError(null)

    try {
      const res = await fetch(`/api/admin/webinars/${props.webinarId}/experience`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          speaker,
          thumbnail_url: thumbnailUrl,
          playback_type: playbackType,
          playback_mp4_url: playbackMp4Url,
          playback_m3u8_url: playbackM3u8Url,
          speaker_cards: parseSpeakerCards(speakerCardLines),
        }),
      })

      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || "Save failed")
      setMessage("Attendee portal experience saved.")
    } catch (err: any) {
      setError(err?.message || "Save failed")
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Attendee portal experience</h2>
          <p className="mt-2 max-w-2xl text-sm text-white/65">
            Control poster art, embedded playback, and structured speaker cards shown on the event home page, lobby, and attendee session page.
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-xs text-white/50">
          v10 editor
        </div>
      </div>

      <form onSubmit={onSave} className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <Field label="Speaker name(s)" help="Simple line used as a fallback on cards and badges.">
            <input value={speaker} onChange={(e) => setSpeaker(e.target.value)} placeholder="Jane Doe - Keynote Speaker" className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm outline-none focus:border-sky-400/40" />
          </Field>

          <Field label="Structured speaker cards" help="One line per speaker: Name | Role | Company | Image URL | Bio">
            <textarea value={speakerCardLines} onChange={(e) => setSpeakerCardLines(e.target.value)} placeholder={"Jane Doe | Chief Medical Officer | Nova Bio | https://.../jane.jpg | Opening keynote speaker\nJohn Smith | Moderator | Streamline | https://.../john.jpg | Host"} className="min-h-[140px] w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm outline-none focus:border-sky-400/40" />
          </Field>

          <Field label="Poster / thumbnail URL" help="Used as poster art on the event home page, lobby card, and session page.">
            <input value={thumbnailUrl} onChange={(e) => setThumbnailUrl(e.target.value)} placeholder="https://.../poster.jpg" className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm outline-none focus:border-sky-400/40" />
          </Field>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Playback type" help="Choose which source should be preferred for attendee playback.">
              <select value={playbackType} onChange={(e) => setPlaybackType(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm outline-none focus:border-sky-400/40">
                <option value="">Auto-detect</option>
                <option value="mp4">MP4</option>
                <option value="hls">HLS (.m3u8)</option>
              </select>
            </Field>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-xs leading-6 text-white/50">
              HLS is better for live streams. MP4 is great for on-demand playback or a fallback asset.
            </div>
          </div>

          <Field label="Embedded MP4 URL">
            <input value={playbackMp4Url} onChange={(e) => setPlaybackMp4Url(e.target.value)} placeholder="https://.../session.mp4" className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm outline-none focus:border-sky-400/40" />
          </Field>

          <Field label="Embedded HLS .m3u8 URL">
            <input value={playbackM3u8Url} onChange={(e) => setPlaybackM3u8Url(e.target.value)} placeholder="https://.../master.m3u8" className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm outline-none focus:border-sky-400/40" />
          </Field>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button type="submit" disabled={saving} className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70">
              {saving ? "Saving..." : "Save attendee experience"}
            </button>
            {message ? <span className="text-sm text-emerald-300">{message}</span> : null}
            {error ? <span className="text-sm text-red-300">{error}</span> : null}
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-white/10 bg-black/25">
          <div className="relative aspect-[4/5] bg-slate-950">
            {thumbnailUrl.trim() ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={thumbnailUrl.trim()} alt="Poster preview" className="h-full w-full object-cover" />
            ) : (
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.25),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.20),transparent_35%),linear-gradient(180deg,rgba(15,23,42,1),rgba(2,6,23,1))]" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-5">
              <div className="text-[11px] uppercase tracking-[0.2em] text-white/45">Attendee preview</div>
              <div className="mt-2 text-xl font-semibold text-white">Poster / playback card</div>
              <div className="mt-2 text-sm text-white/70">{speaker.trim() || "Speaker names appear here"}</div>
              <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/65">
                {effectivePlayback ? `${effectivePlayback.type} playback ready` : "No embedded playback saved yet"}
              </div>
              {previewSpeakers.length ? (
                <div className="mt-4 grid gap-2">
                  {previewSpeakers.map((item) => (
                    <div key={item.name} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white/75">
                      <div className="h-8 w-8 overflow-hidden rounded-xl border border-white/10 bg-white/10">
                        {item.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center">{item.name.slice(0, 1).toUpperCase()}</div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-medium">{item.name}</div>
                        <div className="truncate text-white/55">{item.role || item.company || "Speaker"}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </form>
    </section>
  )
}

function Field({ label, help, children }: { label: string; help?: string; children: ReactNode }) {
  return (
    <label className="grid gap-2 text-sm">
      <span className="text-white/75">{label}</span>
      {children}
      {help ? <span className="text-xs text-white/45">{help}</span> : null}
    </label>
  )
}
