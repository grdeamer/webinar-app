"use client"

import React from "react"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Settings = {
  source_type: "mp4" | "m3u8" | "rtmp"
  mp4_path: string | null
  m3u8_url: string | null
  rtmp_url: string | null
}

export default function Mp4Uploader() {
  const [file, setFile] = React.useState<File | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [msg, setMsg] = React.useState<string>("")
  const [settings, setSettings] = React.useState<Settings | null>(null)

  async function load() {
    setMsg("")
    const res = await fetch("/api/admin/general-session/settings", {
      cache: "no-store",
    })
    const j = await res.json()
    if (!res.ok) throw new Error(j?.error || "Failed to load settings")
    setSettings(j.settings)
  }

  React.useEffect(() => {
    load().catch((e) => setMsg(e.message))
  }, [])

  async function uploadAndSetActive() {
    if (!file) return
    setMsg("")

    if (file.type !== "video/mp4" && !file.name.toLowerCase().endsWith(".mp4")) {
      setMsg("Please choose an .mp4 file.")
      return
    }

    setBusy(true)
    try {
      // 1) ask server for signed upload token
      const signRes = await fetch("/api/admin/general-session/mp4/sign-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name }),
      })
      const signJson = await signRes.json()
      if (!signRes.ok) throw new Error(signJson?.error || "Failed to sign upload")

      const { path, token } = signJson as { path: string; token: string }

      // 2) upload directly to Supabase Storage using signed token
      const { error: upErr } = await supabase.storage
        .from("private")
        .uploadToSignedUrl(path, token, file, {
          contentType: "video/mp4",
          upsert: true,
        })

      if (upErr) throw new Error(upErr.message)

      // 3) save as active source
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
      const saveJson = await saveRes.json()
      if (!saveRes.ok) throw new Error(saveJson?.error || "Failed to save settings")

      setSettings(saveJson.settings)
      setFile(null)
      setMsg("✅ Uploaded and set as the active General Session video.")
    } catch (e: any) {
      setMsg(`❌ ${e?.message || "Upload failed"}`)
    } finally {
      setBusy(false)
    }
  }

  async function setStream(type: "m3u8" | "rtmp") {
    setMsg("")
    const url =
      type === "m3u8"
        ? prompt("Paste your .m3u8 URL")
        : prompt("Paste your RTMP URL (rtmp://...)")

    if (!url) return

    setBusy(true)
    try {
      const saveRes = await fetch("/api/admin/general-session/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_type: type,
          mp4_path: null,
          m3u8_url: type === "m3u8" ? url : null,
          rtmp_url: type === "rtmp" ? url : null,
        }),
      })
      const saveJson = await saveRes.json()
      if (!saveRes.ok) throw new Error(saveJson?.error || "Failed to save settings")
      setSettings(saveJson.settings)
      setMsg(`✅ Set General Session source to ${type.toUpperCase()}.`)
    } catch (e: any) {
      setMsg(`❌ ${e?.message || "Failed"}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <h2 className="text-xl font-semibold">General Session Source</h2>

      <div className="mt-3 text-sm text-white/70 space-y-1">
        <div>
          <span className="text-white/50">Current:</span>{" "}
          <span className="font-medium">{settings?.source_type || "—"}</span>
        </div>
        {settings?.mp4_path ? (
          <div className="break-all">
            <span className="text-white/50">MP4 path:</span>{" "}
            <span className="font-mono text-xs">{settings.mp4_path}</span>
          </div>
        ) : null}
        {settings?.m3u8_url ? (
          <div className="break-all">
            <span className="text-white/50">M3U8:</span>{" "}
            <span className="font-mono text-xs">{settings.m3u8_url}</span>
          </div>
        ) : null}
        {settings?.rtmp_url ? (
          <div className="break-all">
            <span className="text-white/50">RTMP:</span>{" "}
            <span className="font-mono text-xs">{settings.rtmp_url}</span>
          </div>
        ) : null}
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <button
          className="rounded-xl bg-white text-black px-4 py-2 font-medium disabled:opacity-60"
          disabled={busy}
          onClick={() => setStream("m3u8")}
        >
          Set M3U8
        </button>
        <button
          className="rounded-xl bg-white text-black px-4 py-2 font-medium disabled:opacity-60"
          disabled={busy}
          onClick={() => setStream("rtmp")}
        >
          Set RTMP
        </button>
        <button
          className="rounded-xl border border-white/15 bg-white/0 px-4 py-2 font-medium disabled:opacity-60"
          disabled={busy}
          onClick={() => load().catch((e) => setMsg(e.message))}
        >
          Refresh
        </button>
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
        <div className="text-sm text-white/70">
          Upload an MP4 (stored in your private Supabase bucket)
        </div>

        <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center">
          <input
            type="file"
            accept="video/mp4"
            disabled={busy}
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="block w-full text-sm"
          />

          <button
            className="rounded-xl bg-emerald-400/90 text-black px-4 py-2 font-semibold disabled:opacity-60"
            disabled={busy || !file}
            onClick={uploadAndSetActive}
          >
            {busy ? "Uploading..." : "Upload + Set Active"}
          </button>
        </div>
      </div>

      {msg ? (
        <div className="mt-4 text-sm text-white/80">
          {msg}
        </div>
      ) : null}
    </div>
  )
}