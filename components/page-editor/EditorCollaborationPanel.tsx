"use client"

import { useEffect, useRef, useState } from "react"
import type { RealtimeChannel } from "@supabase/supabase-js"
import { createClient as createBrowserSupabaseClient } from "@/lib/supabase/client"

type Comment = { id: string; element_id: string | null; author_id: string; body: string; resolved_at: string | null; created_at: string }
type Presence = { user_id: string; display_name: string; color: string; cursor_x: number | null; cursor_y: number | null; selected_element_id: string | null }
type CanvasRect = { left: number; top: number; width: number; height: number }

export default function EditorCollaborationPanel({ slug, pageKey, selectedElementId, publicUrl, teamHref, onClose }: { slug: string; pageKey: string; selectedElementId: string | null; publicUrl: string; teamHref: string | null; onClose: () => void }) {
  const [comments, setComments] = useState<Comment[]>([])
  const [presence, setPresence] = useState<Presence[]>([])
  const [authors, setAuthors] = useState<Record<string, string>>({})
  const [currentUserId, setCurrentUserId] = useState("")
  const [body, setBody] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [copied, setCopied] = useState(false)
  const [canvasRect, setCanvasRect] = useState<CanvasRect | null>(null)
  const cursorRef = useRef({ x: 0.5, y: 0.5 })
  const channelRef = useRef<RealtimeChannel | null>(null)
  const identityRef = useRef<Presence | null>(null)
  const lastCursorBroadcastRef = useRef(0)
  const endpoint = `/api/admin/page-editor/event/${slug}/collaboration`

  useEffect(() => {
    const measure = () => { const canvas = document.querySelector<HTMLElement>("[data-editor-canvas]"); if (!canvas) return; const rect = canvas.getBoundingClientRect(); setCanvasRect({ left: rect.left, top: rect.top, width: rect.width, height: rect.height }) }
    const pointer = (event: PointerEvent) => { const canvas = document.querySelector<HTMLElement>("[data-editor-canvas]"); if (!canvas) return; const rect = canvas.getBoundingClientRect(); cursorRef.current = { x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)), y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)) }; const now = performance.now(); if (now - lastCursorBroadcastRef.current >= 50 && channelRef.current && identityRef.current) { lastCursorBroadcastRef.current = now; void channelRef.current.send({ type: "broadcast", event: "cursor", payload: { ...identityRef.current, cursor_x: cursorRef.current.x, cursor_y: cursorRef.current.y, selected_element_id: selectedElementId } }) } }
    measure()
    window.addEventListener("pointermove", pointer, { passive: true })
    window.addEventListener("resize", measure, { passive: true })
    window.addEventListener("scroll", measure, { passive: true, capture: true })
    return () => { window.removeEventListener("pointermove", pointer); window.removeEventListener("resize", measure); window.removeEventListener("scroll", measure, true) }
  }, [selectedElementId])

  useEffect(() => {
    identityRef.current = presence.find((person) => person.user_id === currentUserId) ?? null
  }, [currentUserId, presence])

  useEffect(() => {
    const supabase = createBrowserSupabaseClient()
    const channel = supabase.channel(`page-editor:${slug}:${pageKey}`, { config: { broadcast: { self: false } } })
      .on("broadcast", { event: "cursor" }, ({ payload }) => { const person = payload as Presence; if (!person?.user_id || person.user_id === currentUserId) return; setPresence((current) => [...current.filter((item) => item.user_id !== person.user_id), person]) })
      .on("broadcast", { event: "comment" }, ({ payload }) => { const comment = payload as Comment; if (!comment?.id) return; setComments((current) => [comment, ...current.filter((item) => item.id !== comment.id)]) })
      .on("broadcast", { event: "comment-state" }, ({ payload }) => { const update = payload as Pick<Comment, "id" | "resolved_at">; setComments((current) => current.map((item) => item.id === update.id ? { ...item, resolved_at: update.resolved_at } : item)) })
      .subscribe()
    channelRef.current = channel
    return () => { channelRef.current = null; void supabase.removeChannel(channel) }
  }, [currentUserId, pageKey, slug])

  useEffect(() => {
    let active = true
    async function refresh() {
      const response = await fetch(`${endpoint}?pageKey=${encodeURIComponent(pageKey)}`)
      const data = await response.json().catch((): null => null)
      if (!active) return
      if (!response.ok || !data) { setError(String(data?.error ?? "Collaboration could not be refreshed")); return }
      setError("")
      setComments(Array.isArray(data.comments) ? data.comments : [])
      setPresence(Array.isArray(data.presence) ? data.presence : [])
      setAuthors(data.authors && typeof data.authors === "object" ? data.authors : {})
      setCurrentUserId(String(data.currentUserId ?? ""))
    }
    async function heartbeat() {
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "heartbeat", pageKey, cursorX: cursorRef.current.x, cursorY: cursorRef.current.y, selectedElementId }) })
      const data = await response.json().catch((): null => null)
      if (!response.ok && active) setError(String(data?.error ?? "Presence is temporarily unavailable"))
      else if (active && data?.person) {
        const person = data.person as Presence
        identityRef.current = person
        setPresence((current) => [...current.filter((item) => item.user_id !== person.user_id), person])
      }
    }
    void refresh(); void heartbeat()
    const refreshTimer = window.setInterval(() => { void refresh() }, 5_000)
    const heartbeatTimer = window.setInterval(() => { void heartbeat() }, 8_000)
    return () => { active = false; window.clearInterval(refreshTimer); window.clearInterval(heartbeatTimer) }
  }, [endpoint, pageKey, selectedElementId])

  async function addComment() {
    const text = body.trim()
    if (!text || busy) return
    setBusy(true)
    try {
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "comment", pageKey, elementId: selectedElementId, body: text }) })
      const data = await response.json().catch((): null => null)
      if (response.ok && data?.comment) { setComments((current) => [data.comment, ...current]); setBody(""); setError(""); void channelRef.current?.send({ type: "broadcast", event: "comment", payload: data.comment }) }
      else setError(String(data?.error ?? "Comment could not be posted"))
    } finally { setBusy(false) }
  }

  async function toggleResolved(comment: Comment) {
    const resolved = !comment.resolved_at
    const response = await fetch(endpoint, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: comment.id, resolved }) })
    if (response.ok) { const resolvedAt = resolved ? new Date().toISOString() : null; setComments((current) => current.map((item) => item.id === comment.id ? { ...item, resolved_at: resolvedAt } : item)); setError(""); void channelRef.current?.send({ type: "broadcast", event: "comment-state", payload: { id: comment.id, resolved_at: resolvedAt } }) }
    else setError("Comment could not be updated")
  }

  return <>
    {canvasRect ? presence.filter((person) => person.user_id !== currentUserId && person.cursor_x != null && person.cursor_y != null).map((person) => <div key={person.user_id} className="pointer-events-none fixed z-[100]" style={{ left: canvasRect.left + person.cursor_x! * canvasRect.width, top: canvasRect.top + person.cursor_y! * canvasRect.height, color: person.color }}><span className="text-xl">◆</span><span className="ml-1 rounded px-1.5 py-1 text-[9px] font-bold text-black" style={{ backgroundColor: person.color }}>{person.display_name}</span></div>) : null}
    <aside aria-label="Collaboration" className="fixed bottom-4 right-4 top-24 z-[90] flex w-[340px] flex-col rounded-2xl border border-white/10 bg-[#090d16]/98 p-4 shadow-2xl backdrop-blur-xl">
      <div className="flex items-center justify-between"><div><h2 className="font-semibold text-white">Collaboration</h2><p className="text-[10px] text-white/40">{presence.length} editing this page</p></div><button type="button" aria-label="Close collaboration" onClick={onClose} className="rounded-lg px-2 py-1 text-white/45 hover:bg-white/10">×</button></div>
      <div className="mt-3 flex -space-x-2">{presence.map((person) => <div key={person.user_id} title={person.display_name} className="grid h-8 w-8 place-items-center rounded-full border-2 border-[#090d16] text-[9px] font-bold text-black" style={{ backgroundColor: person.color }}>{person.display_name.slice(0, 2).toUpperCase()}</div>)}</div>
      <div className="mt-3 grid grid-cols-2 gap-2"><button type="button" onClick={async () => { await navigator.clipboard.writeText(new URL(publicUrl, window.location.origin).toString()); setCopied(true); window.setTimeout(() => setCopied(false), 1800) }} className="rounded-xl border border-white/10 bg-white/[0.04] px-2 py-2 text-[10px] font-semibold text-white/65 hover:bg-white/10">{copied ? "Link copied" : "Copy public link"}</button>{teamHref ? <a href={teamHref} className="rounded-xl border border-violet-300/15 bg-violet-400/10 px-2 py-2 text-center text-[10px] font-semibold text-violet-100 hover:bg-violet-400/20">Manage access</a> : null}</div>
      {error ? <p role="alert" className="mt-3 rounded-lg border border-red-300/15 bg-red-400/10 px-2 py-1.5 text-[10px] text-red-100">{error}</p> : null}
      <textarea aria-label="Comment" value={body} onChange={(event) => setBody(event.target.value)} onKeyDown={(event) => { if ((event.metaKey || event.ctrlKey) && event.key === "Enter") { event.preventDefault(); void addComment() } }} placeholder={selectedElementId ? "Comment on selected element" : "Comment on this page"} className="mt-4 min-h-24 rounded-xl border border-white/10 bg-black/25 p-3 text-sm text-white outline-none focus:border-violet-300/40" />
      <button type="button" disabled={!body.trim() || busy} onClick={() => { void addComment() }} className="mt-2 rounded-xl bg-violet-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-35">{busy ? "Posting…" : "Post comment"}</button>
      <div className="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto">{comments.map((comment) => <article key={comment.id} className={`rounded-xl border p-3 ${comment.resolved_at ? "border-white/5 bg-white/[0.02] opacity-55" : "border-white/10 bg-white/[0.04]"}`}><div className="mb-1 flex items-center justify-between text-[9px] text-white/35"><span>{authors[comment.author_id] ?? "Collaborator"}</span><time>{new Date(comment.created_at).toLocaleString()}</time></div><p className="text-xs leading-5 text-white/75">{comment.body}</p><div className="mt-2 flex items-center justify-between text-[9px] text-white/35"><span>{comment.element_id ? "Element comment" : "Page comment"}</span><button type="button" onClick={() => { void toggleResolved(comment) }} className="rounded px-1.5 py-1 hover:bg-white/10">{comment.resolved_at ? "Reopen" : "Resolve"}</button></div></article>)}</div>
    </aside>
  </>
}
