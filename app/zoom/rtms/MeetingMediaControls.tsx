"use client"
import Script from "next/script"
import { useState } from "react"

type ZoomMediaSdk = {
  config(options: { version: string; capabilities: string[] }): Promise<{ runningContext: string }>
  startRTMS(): Promise<unknown>
  stopRTMS(): Promise<unknown>
}

export default function MeetingMediaControls() {
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState("Open Jupiter IO Monitor from Apps inside your Zoom meeting.")
  function sdk() { return (window as Window & { zoomSdk?: ZoomMediaSdk }).zoomSdk }
  async function configure() {
    try {
      const result = await sdk()?.config({ version: "0.16", capabilities: ["startRTMS", "stopRTMS"] })
      const inMeeting = result?.runningContext === "inMeeting"
      setReady(inMeeting)
      setStatus(inMeeting ? "Ready. Arm this meeting’s first tile in Jupiter IO, then start sharing here." : "Join your test meeting and open this app from its Apps panel.")
    } catch { setStatus("Open Jupiter IO Monitor inside the Zoom desktop meeting to use these controls.") }
  }
  async function control(action: "start" | "stop") {
    setBusy(true)
    try {
      const client = sdk()
      if (!client) throw new Error("SDK unavailable")
      if (action === "start") await client.startRTMS()
      else await client.stopRTMS()
      setStatus(action === "start" ? "Sharing requested. Host approval may be required; check your Jupiter IO tile for live media." : "Meeting-media sharing stopped.")
    } catch { setStatus("Zoom did not confirm the request. Check host permissions and trial availability.") }
    finally { setBusy(false) }
  }
  return <main className="min-h-screen space-y-5 bg-[#07111b] p-6 text-white">
    <Script src="https://appssdk.zoom.us/sdk.min.js" strategy="afterInteractive" onReady={() => void configure()} onError={() => setStatus("Zoom’s app controls could not load. Reopen the app in Zoom.")} />
    <h1 className="text-xl font-semibold">Jupiter IO Monitor</h1>
    <p className="text-sm text-slate-300">Share the meeting’s presentation and active-speaker video with your authorized Jupiter IO monitor. No window capture is needed.</p>
    <div className="flex flex-wrap gap-3">
      <button disabled={!ready || busy} onClick={() => void control("start")} className="rounded-xl bg-blue-600 px-4 py-3 text-sm disabled:opacity-40">Start sharing to Jupiter</button>
      <button disabled={!ready || busy} onClick={() => void control("stop")} className="rounded-xl border border-white/20 px-4 py-3 text-sm disabled:opacity-40">Stop sharing</button>
    </div>
    <p role="status" className="text-sm text-slate-300">{status}</p>
    <p className="text-xs leading-5 text-slate-400">Qualification: one meeting, 15-minute receiver limit. Jupiter does not request audio, transcription, chat, or recording. Additional participant thumbnails are not enabled in this test.</p>
  </main>
}
