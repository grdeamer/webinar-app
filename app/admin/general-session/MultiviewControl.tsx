"use client"

import React from "react"
import { createClient } from "@supabase/supabase-js"

type SourceKind = "video" | "slides" | "audio" | "doc" | "rtmp" | "hls"
export type SourceItem = {
  id: string
  kind: SourceKind
  label: string
  preview_url?: string | null
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function draggablePayload(source: SourceItem) {
  return JSON.stringify({ t: "gs_source", source })
}

function isSourcePayload(raw: string | null) {
  if (!raw) return null
  try {
    const obj = JSON.parse(raw)
    if (obj?.t === "gs_source" && obj?.source?.id) return obj.source as SourceItem
  } catch {}
  return null
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n))
}

function SourcePreview({ source }: { source: SourceItem | null }) {
  if (!source) {
    return (
      <div className="aspect-video rounded-xl border border-dashed border-white/15 bg-black/10 flex items-center justify-center text-xs text-white/40">
        No source
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="text-sm font-semibold">{source.label}</div>
      <div className="text-xs text-white/60">{source.kind}</div>

      {source.preview_url ? (
        source.kind === "audio" ? (
          <audio className="w-full" controls src={source.preview_url} />
        ) : source.kind === "slides" || source.kind === "doc" ? (
          <div className="text-xs text-white/50">Slides/Docs render in Program output</div>
        ) : (
          <video className="w-full rounded-xl" controls muted playsInline src={source.preview_url} />
        )
      ) : (
        <div className="text-xs text-white/50">No preview URL</div>
      )}
    </div>
  )
}

export default function MultiviewControl() {
  const [sources, setSources] = React.useState<SourceItem[]>([])
  const [slots, setSlots] = React.useState<Record<number, SourceItem | null>>({
    1: null,
    2: null,
    3: null,
    4: null,
    5: null,
    6: null,
    7: null,
  })

  const [programSlot, setProgramSlot] = React.useState<number | null>(null)
  const [previewSlot, setPreviewSlot] = React.useState<number | null>(null)
  const [transitionMs, setTransitionMs] = React.useState<number>(350)

  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const mp4PickerRef = React.useRef<HTMLInputElement | null>(null)
  const slidePickerRef = React.useRef<HTMLInputElement | null>(null)

  async function uploadMp4File(file: File) {
    // Upload MP4 to private bucket via signed upload URL and set it as active settings video.
    const signRes = await fetch("/api/admin/general-session/mp4/sign-upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileName: file.name, fileSize: file.size }),
    })
    const signJson = await signRes.json().catch(() => ({}))
    if (!signRes.ok) throw new Error(signJson?.error || "Failed to sign MP4 upload")

    const { path, token } = signJson as { path: string; token: string }

    const { error: upErr } = await supabase.storage
      .from("private")
      .uploadToSignedUrl(path, token, file, {
        contentType: "video/mp4",
        upsert: true,
      })

    if (upErr) throw new Error(upErr.message)

    const saveRes = await fetch("/api/admin/general-session/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source_type: "mp4",
        mp4_path: path,
        m3u8_url: null,
        rtmp_url: null,
      }),
    })
    const saveJson = await saveRes.json().catch(() => ({}))
    if (!saveRes.ok) throw new Error(saveJson?.error || "Failed to save settings")

    return { path }
  }

  async function uploadSlideFile(file: File) {
    const fd = new FormData()
    fd.append("file", file)
    const res = await fetch("/api/admin/general-session/slides/upload", {
      method: "POST",
      body: fd,
    })
    const j = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(j?.error || "Failed to upload slide")
    return j?.slide as { id: string; name: string; slide_path: string }
  }

  function openMp4Picker() {
    mp4PickerRef.current?.click()
  }

  function openSlidesPicker() {
    slidePickerRef.current?.click()
  }

  const programSource = programSlot ? slots[programSlot] || null : null
  const previewSource = previewSlot ? slots[previewSlot] || null : null

  async function refresh() {
    setError(null)

    const [srcRes, mvRes, progRes] = await Promise.all([
      fetch("/api/admin/general-session/sources", { cache: "no-store" }),
      fetch("/api/admin/general-session/multiview", { cache: "no-store" }),
      fetch("/api/admin/general-session/program", {
        method: "POST",
        body: JSON.stringify({ action: "get" }),
      }),
    ])

    const srcJson = await srcRes.json().catch(() => ({}))
    const mvJson = await mvRes.json().catch(() => ({}))
    const progJson = await progRes.json().catch(() => ({}))

    if (srcJson?.error) setError(srcJson.error)
    if (mvJson?.error) setError(mvJson.error)
    if (progJson?.error) setError(progJson.error)

    setSources(Array.isArray(srcJson?.sources) ? srcJson.sources : [])

    const nextSlots: any = { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null, 7: null }
    const slotObj = mvJson?.state?.slots || {}
    for (const k of Object.keys(nextSlots)) {
      nextSlots[Number(k)] = slotObj[k] || null
    }
    setSlots(nextSlots)

    const row = progJson?.program || null
    setProgramSlot(row?.program_slot ?? null)
    setPreviewSlot(row?.preview_slot ?? null)
    if (typeof row?.transition_ms === "number") setTransitionMs(row.transition_ms)
  }

  React.useEffect(() => {
    refresh()
    const ch = supabase
      .channel("gs-mv-switcher")
      .on("postgres_changes", { event: "*", schema: "public", table: "general_session_multiview" }, () => refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "general_session_program" }, () => refresh())
      .subscribe()

    return () => {
      supabase.removeChannel(ch)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Broadcast UX: hotkeys
  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // avoid triggering while typing
      const t = e.target as HTMLElement | null
      const tag = t?.tagName?.toLowerCase()
      if (tag === "input" || tag === "textarea" || (t as any)?.isContentEditable) return

      if (e.code === "Space") {
        e.preventDefault()
        if (previewSlot) cut()
        return
      }
      if (e.code === "Enter") {
        e.preventDefault()
        if (previewSlot) auto()
        return
      }

      // digits 1-7 set preview
      const key = e.key
      if (/^[1-7]$/.test(key)) {
        const slot = Number(key)
        if (!slots[slot]) return
        e.preventDefault()
        pickPreview(slot)
        return
      }

      // Shift+digit = instant cut to that slot (preview + cut)
      if (e.shiftKey && /^[1-7]$/.test(e.key)) {
        const slot = Number(e.key)
        if (!slots[slot]) return
        e.preventDefault()
        ;(async () => {
          await pickPreview(slot)
          await cut()
        })()
        return
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewSlot, slots])

  async function setSlot(slot: number, source: SourceItem | null) {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/general-session/multiview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slot, source }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.error || "Failed to set slot")
      setSlots((s) => ({ ...s, [slot]: source }))
    } catch (e: any) {
      setError(e?.message || String(e))
    } finally {
      setBusy(false)
    }
  }

  async function pickPreview(slot: number) {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/general-session/program", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "set_preview_slot", slot }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.error || "Failed to set preview")
      setPreviewSlot(slot)
    } catch (e: any) {
      setError(e?.message || String(e))
    } finally {
      setBusy(false)
    }
  }

  async function saveTransitionMs(ms: number) {
    const safe = clamp(ms, 0, 5000)
    setBusy(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/general-session/program", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "set_transition_ms", ms: safe }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.error || "Failed to save transition")
      setTransitionMs(safe)
    } catch (e: any) {
      setError(e?.message || String(e))
    } finally {
      setBusy(false)
    }
  }

  async function cut() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/general-session/program", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "cut_to_preview" }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.error || "CUT failed")
      setProgramSlot(j?.program?.program_slot ?? previewSlot ?? null)
    } catch (e: any) {
      setError(e?.message || String(e))
    } finally {
      setBusy(false)
    }
  }

  async function auto() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/general-session/program", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "auto_to_preview" }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.error || "AUTO failed")
      setProgramSlot(j?.program?.program_slot ?? previewSlot ?? null)
    } catch (e: any) {
      setError(e?.message || String(e))
    } finally {
      setBusy(false)
    }
  }

  function Tile({ slot }: { slot: number }) {
    const source = slots[slot] || null
    const isProgram = programSlot === slot
    const isPreview = previewSlot === slot

    return (
      <div
        className={[
          "relative w-full text-left rounded-2xl border bg-white/5 p-3 select-none",
          isProgram ? "border-red-500/80" : isPreview ? "border-amber-400/80" : "border-white/10",
          busy ? "opacity-80" : "",
          "cursor-pointer hover:bg-white/10 transition-colors",
        ].join(" ")}
        role="button"
        tabIndex={0}
        onClick={() => (source ? pickPreview(slot) : null)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && source) pickPreview(slot)
        }}
        onDragOver={(e) => {
          e.preventDefault()
          try {
            e.dataTransfer.dropEffect = "copy"
          } catch {}
        }}
        onDrop={(e) => {
          e.preventDefault()
          const payload =
            isSourcePayload(e.dataTransfer.getData("application/json")) ||
            isSourcePayload(e.dataTransfer.getData("text/plain"))
          if (payload) {
            setSlot(slot, payload)
            return
          }

          // Also support dropping files from your desktop directly onto a tile.
          const f = e.dataTransfer.files?.[0]
          if (!f) return

          ;(async () => {
            setBusy(true)
            setError(null)
            try {
              const nameLower = (f.name || "").toLowerCase()

              if (f.type === "video/mp4" || nameLower.endsWith(".mp4")) {
                await uploadMp4File(f)
                await refresh()
                // After refresh, assign the "Main Video" source to this slot if present
                const s = (sources.find((x) => x.id === "settings_video") ||
                  sources.find((x) => x.id === "settings_hls") ||
                  sources.find((x) => x.id === "settings_rtmp")) as any
                if (s) await setSlot(slot, s)
                return
              }

              const allowedSlide = [
                "application/pdf",
                "image/png",
                "image/jpeg",
                "image/webp",
              ]
              if (allowedSlide.includes(f.type)) {
                const slide = await uploadSlideFile(f)
                // Assign immediately (preview URL will populate after refresh)
                await setSlot(slot, {
                  id: String(slide.id),
                  kind: "slides",
                  label: `Slides: ${slide.name}`,
                  preview_url: null,
                })
                await refresh()
                return
              }

              throw new Error("Unsupported file type. Drop an MP4, PDF, or image.")
            } catch (err: any) {
              setError(err?.message || "Drop upload failed")
            } finally {
              setBusy(false)
            }
          })()
        }}
        title={source ? "Click to set PREVIEW" : "Drag a source here"}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs text-white/70">Slot {slot}</div>
          <div className="flex items-center gap-2">
            {isPreview ? (
              <span className="text-[10px] rounded-full bg-amber-500/90 px-2 py-0.5 font-semibold">PREVIEW</span>
            ) : null}
            {isProgram ? (
              <span className="text-[10px] rounded-full bg-red-600/90 px-2 py-0.5 font-semibold">PROGRAM</span>
            ) : null}

            <button
              type="button"
              className="text-xs rounded-xl border border-white/10 bg-white/5 px-2 py-1 hover:bg-white/10"
              onClick={(e) => {
                e.stopPropagation()
                setSlot(slot, null)
              }}
              disabled={busy}
              title="Clear slot"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="mt-2">
          {!source ? (
            <div className="aspect-video rounded-xl border border-dashed border-white/15 bg-black/10 flex items-center justify-center text-xs text-white/40">
              Drag a source here
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-sm font-semibold">{source.label}</div>
              <div className="text-xs text-white/60">{source.kind}</div>

              {source.kind === "audio" ? (
                <div className="space-y-2">
                  <div className="aspect-video rounded-xl border border-white/10 bg-black/10 flex items-center justify-center text-xs text-white/40">
                    Audio source
                  </div>
                  {source.preview_url ? <audio className="w-full" controls src={source.preview_url} /> : null}
                </div>
              ) : source.kind === "slides" || source.kind === "doc" ? (
                <div className="aspect-video rounded-xl border border-white/10 bg-black/10 flex items-center justify-center text-xs text-white/40">
                  Slides / Doc
                </div>
              ) : (
                <div className="aspect-video overflow-hidden rounded-xl border border-white/10 bg-black/10">
                  {source.preview_url ? (
                    <video className="h-full w-full object-cover" controls muted playsInline src={source.preview_url} />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-xs text-white/40">No preview URL</div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <section className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-6" id="multiview">
      <input
        ref={mp4PickerRef}
        type="file"
        accept="video/mp4"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0]
          if (!f) return
          setBusy(true)
          setError(null)
          try {
            await uploadMp4File(f)
            await refresh()
          } catch (err: any) {
            setError(err?.message || 'Upload failed')
          } finally {
            setBusy(false)
            if (e.target) e.target.value = ''
          }
        }}
      />
      <input
        ref={slidePickerRef}
        type="file"
        accept="application/pdf,image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0]
          if (!f) return
          setBusy(true)
          setError(null)
          try {
            await uploadSlideFile(f)
            await refresh()
          } catch (err: any) {
            setError(err?.message || 'Upload failed')
          } finally {
            setBusy(false)
            if (e.target) e.target.value = ''
          }
        }}
      />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold">Multiview Switcher</h3>
          <p className="mt-1 text-sm text-white/60">
            Click a tile to set <span className="font-semibold">PREVIEW</span>. Then use{" "}
            <span className="font-semibold">CUT</span> (spacebar) or <span className="font-semibold">AUTO</span> (enter) to send it live.
            Numbers 1–7 pick Preview.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/10 px-3 py-2">
            <span className="text-xs text-white/60">AUTO</span>
            <input
              className="w-20 rounded-xl border border-white/10 bg-white/10 px-2 py-1 text-sm"
              value={transitionMs}
              onChange={(e) => setTransitionMs(Number(e.target.value || 0))}
              onBlur={() => saveTransitionMs(Number(transitionMs) || 0)}
              type="number"
              min={0}
              max={5000}
              step={50}
              title="Transition duration (ms)"
            />
            <span className="text-xs text-white/60">ms</span>
          </div>

          <button
            type="button"
            className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm hover:bg-white/15"
            onClick={refresh}
            disabled={busy}
          >
            Refresh
          </button>

          <button
            type="button"
            className="rounded-xl border border-red-500/30 bg-red-600/20 px-4 py-2 text-sm font-semibold hover:bg-red-600/30"
            onClick={cut}
            disabled={busy || !previewSlot}
            title={!previewSlot ? "Pick a Preview slot" : "Instant switch"}
          >
            CUT
          </button>

          <button
            type="button"
            className="rounded-xl border border-amber-400/30 bg-amber-500/20 px-4 py-2 text-sm font-semibold hover:bg-amber-500/30"
            onClick={auto}
            disabled={busy || !previewSlot}
            title={!previewSlot ? "Pick a Preview slot" : "Dip-to-black transition"}
          >
            AUTO
          </button>
        </div>
      </div>

      {error ? (
        <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>
      ) : null}

      {/* Program / Preview monitors */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-red-500/30 bg-black/20 p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">PROGRAM</div>
            <div className="text-xs text-white/60">Slot {programSlot ?? "—"}</div>
          </div>
          <div className="mt-3">
            <SourcePreview source={programSource} />
          </div>
        </div>

        <div className="rounded-2xl border border-amber-400/30 bg-black/20 p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">PREVIEW</div>
            <div className="text-xs text-white/60">Slot {previewSlot ?? "—"}</div>
          </div>
          <div className="mt-3">
            <SourcePreview source={previewSource} />
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-4">
        <div className="xl:col-span-3">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {/* LEFT: 1–5 */}
            <div>
              <div className="grid grid-cols-2 gap-3">
                <Tile slot={1} />
                <Tile slot={3} />
                <Tile slot={2} />
                <Tile slot={4} />
              </div>
              <div className="mt-3">
                <Tile slot={5} />
              </div>
            </div>

            {/* RIGHT: 6–7 */}
            <div className="grid grid-rows-2 gap-3">
              <Tile slot={6} />
              <Tile slot={7} />
            </div>
          </div>
        </div>

        <div className="xl:col-span-1">
          <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm font-semibold">Sources</h4>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={openSlidesPicker}
                  disabled={busy}
                  className="text-xs rounded-xl border border-white/10 bg-white/5 px-2 py-1 hover:bg-white/10 disabled:opacity-60"
                  title="Upload PDF/image"
                >
                  Upload Slides
                </button>
                <button
                  type="button"
                  onClick={openMp4Picker}
                  disabled={busy}
                  className="text-xs rounded-xl border border-white/10 bg-white/5 px-2 py-1 hover:bg-white/10 disabled:opacity-60"
                  title="Upload MP4 and set active"
                >
                  Upload MP4
                </button>
                <span className="text-xs text-white/50">drag → drop</span>
              </div>
            </div>
            <div className="mt-3 space-y-2">
              {sources.length === 0 ? (
                <div className="text-sm text-white/50">No sources yet. Upload MP4/Slides above.</div>
              ) : (
                sources.map((s) => (
                  <div
                    key={s.id}
                    draggable
                    onClick={() => {
                      // Clicking a source opens the appropriate uploader
                      if (s.kind === 'video' || s.kind === 'hls' || s.kind === 'rtmp') openMp4Picker()
                      else if (s.kind === 'slides' || s.kind === 'doc') openSlidesPicker()
                    }}
                    onDragStart={(e) => {
                      e.dataTransfer.setData("application/json", draggablePayload(s))
                      e.dataTransfer.setData("text/plain", draggablePayload(s))
                      e.dataTransfer.effectAllowed = "copy"
                    }}
                    className="cursor-grab active:cursor-grabbing rounded-2xl border border-white/10 bg-white/5 p-3 hover:bg-white/10"
                    title="Drag to a slot"
                  >
                    <div className="text-sm font-semibold">{s.label}</div>
                    <div className="text-xs text-white/60">{s.kind}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 text-xs text-white/50 space-y-1">
            <div>
              Tip: Put your holding slide in slot 6, main video in slot 7, then PREVIEW on 6 → AUTO, PREVIEW on 7 → CUT.
            </div>
            <div>Hotkeys: <span className="text-white/70">Space</span>=CUT, <span className="text-white/70">Enter</span>=AUTO, <span className="text-white/70">1–7</span>=Preview.</div>
          </div>
        </div>
      </div>
    </section>
  )
}