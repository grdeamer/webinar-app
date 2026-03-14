"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useEffect, useRef, useState } from "react"

type EditorElement = {
  id: string
  element_type?: string
  content: string
  x: number
  y: number
  width?: number | null
  height?: number | null
  z_index?: number
  props?: Record<string, unknown>
}

export default function AdminEventPageEditorPreview() {
  const params = useParams()
  const slug = String(params.slug ?? "")
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const [elements, setElements] = useState<EditorElement[]>([])

  const dragRef = useRef<{
    id: string
    offsetX: number
    offsetY: number
  } | null>(null)

  const resizeRef = useRef<{
    id: string
    startX: number
    startY: number
    startWidth: number
    startHeight: number
  } | null>(null)

  useEffect(() => {
    async function loadElements() {
      setLoading(true)
      setSaveMessage(null)

      const res = await fetch(`/api/admin/page-editor/event/${slug}/elements`, {
        cache: "no-store",
      })

      const data = await res.json().catch((): null => null)

      if (!res.ok) {
        setElements([{ id: "1", content: "Sample Text Block", x: 96, y: 96, width: 180, height: 56 }])
        setLoading(false)
        return
      }

      const rows = Array.isArray(data?.elements) ? data.elements : []

      if (rows.length === 0) {
        setElements([{ id: "1", content: "Sample Text Block", x: 96, y: 96, width: 180, height: 56 }])
      } else {
        setElements(
          rows.map((el: any) => ({
            id: String(el.id),
            element_type: String(el.element_type ?? "text"),
            content: String(el.content ?? "Untitled Block"),
            x: Number(el.x ?? 0),
            y: Number(el.y ?? 0),
            width: el.width == null ? 180 : Number(el.width),
            height: el.height == null ? 56 : Number(el.height),
            z_index: Number(el.z_index ?? 1),
            props: el.props && typeof el.props === "object" ? el.props : {},
          }))
        )
      }

      setLoading(false)
    }

    void loadElements()
  }, [slug])

  function addTextBlock() {
    const newId = String(Date.now())

    setElements((prev) => [
      ...prev,
      {
        id: newId,
        element_type: "text",
        x: 140,
        y: 140,
        content: `New Block ${prev.length + 1}`,
        width: 180,
        height: 56,
        z_index: prev.length + 1,
        props: {},
      },
    ])

    setSelectedId(newId)
  }

  function updateSelectedContent(value: string) {
    if (!selectedId) return

    setElements((prev) =>
      prev.map((el) =>
        el.id === selectedId
          ? {
              ...el,
              content: value,
            }
          : el
      )
    )
  }

  function startDrag(
    e: React.PointerEvent<HTMLDivElement>,
    id: string,
    x: number,
    y: number
  ) {
    if (!isEditing) return
    if ((e.target as HTMLElement).dataset.resizeHandle === "true") return

    dragRef.current = {
      id,
      offsetX: e.clientX - x,
      offsetY: e.clientY - y,
    }
    setSelectedId(id)
  }

  function startResize(
    e: React.PointerEvent<HTMLDivElement>,
    id: string,
    width: number | null | undefined,
    height: number | null | undefined
  ) {
    if (!isEditing) return
    e.stopPropagation()

    resizeRef.current = {
      id,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: width ?? 180,
      startHeight: height ?? 56,
    }
    setSelectedId(id)
  }

  function onCanvasMove(e: React.PointerEvent<HTMLDivElement>) {
    if (resizeRef.current) {
      const { id, startX, startY, startWidth, startHeight } = resizeRef.current
      const nextWidth = Math.max(100, startWidth + (e.clientX - startX))
      const nextHeight = Math.max(44, startHeight + (e.clientY - startY))

      setElements((prev) =>
        prev.map((el) =>
          el.id === id
            ? {
                ...el,
                width: nextWidth,
                height: nextHeight,
              }
            : el
        )
      )
      return
    }

    if (!dragRef.current) return

    const { id, offsetX, offsetY } = dragRef.current
    const nextX = e.clientX - offsetX
    const nextY = e.clientY - offsetY

    setElements((prev) =>
      prev.map((el) =>
        el.id === id
          ? {
              ...el,
              x: Math.max(0, nextX),
              y: Math.max(0, nextY),
            }
          : el
      )
    )
  }

  function stopInteractions() {
    dragRef.current = null
    resizeRef.current = null
  }

  async function saveLayout() {
    setSaveMessage("Saving...")

    const payload = elements.map((el, idx) => ({
      element_type: el.element_type ?? "text",
      content: el.content,
      x: el.x,
      y: el.y,
      width: el.width ?? null,
      height: el.height ?? null,
      z_index: el.z_index ?? idx + 1,
      props: el.props ?? {},
    }))

    const res = await fetch(`/api/admin/page-editor/event/${slug}/elements`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ elements: payload }),
    })

    const data = await res.json().catch((): null => null)

    if (!res.ok) {
      setSaveMessage(data?.error || "Failed to save")
      return
    }

    setSaveMessage("Saved")
  }

  const selectedElement = elements.find((el) => el.id === selectedId) ?? null

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="border-b border-white/10 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <div className="text-xs uppercase tracking-[0.22em] text-white/40">
              Page Editor Preview
            </div>
            <h1 className="mt-1 text-2xl font-bold">Event Page</h1>
            <div className="mt-1 text-xs text-white/50">
              /admin/page-editor/event/{slug}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/page-editor/event"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10"
            >
              Back
            </Link>

            <button
              onClick={() => setIsEditing((v) => !v)}
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950"
            >
              {isEditing ? "Close Editor" : "Edit Page"}
            </button>
          </div>
        </div>
      </div>

      <div className="relative flex min-h-[calc(100vh-81px)]">
        <div className="flex-1 overflow-auto">
          <div className="mx-auto max-w-6xl px-6 py-10">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-10">
              <div className="text-sm uppercase tracking-[0.22em] text-white/40">
                Event Preview Canvas
              </div>

              <h2 className="mt-3 text-4xl font-bold">Current Event Page</h2>

              <p className="mt-4 max-w-2xl text-white/70">
                This is the real event page loaded inside the editor canvas.
              </p>

              {loading ? (
                <div className="mt-8 rounded-2xl border border-white/10 bg-black/30 p-8 text-white/60">
                  Loading editor elements...
                </div>
              ) : (
                <div
                  className="mt-8 relative h-[800px] w-full overflow-hidden rounded-2xl border border-white/10 bg-black"
                  onPointerMove={onCanvasMove}
                  onPointerUp={stopInteractions}
                  onPointerLeave={stopInteractions}
                >
                  <iframe
                    src={`/events/${slug}`}
                    title="Event preview"
                    className={`absolute inset-0 h-full w-full ${isEditing ? "pointer-events-none" : ""}`}
                  />

                  {elements.map((el) => (
                    <div
                      key={el.id}
                      onPointerDown={(e) => startDrag(e, el.id, el.x, el.y)}
                      onClick={() => setSelectedId(el.id)}
                      className={`absolute rounded-xl px-4 py-2 text-sm font-medium shadow-lg ${
                        isEditing ? "cursor-move" : "cursor-default"
                      } ${
                        selectedId === el.id
                          ? "bg-amber-300 text-black ring-2 ring-white"
                          : "bg-amber-400 text-black"
                      }`}
                      style={{
                        left: el.x,
                        top: el.y,
                        zIndex: el.z_index ?? 1,
                        width: el.width ?? "auto",
                        height: el.height ?? "auto",
                      }}
                    >
                      {el.content}

                      {isEditing && (
                        <div
                          data-resize-handle="true"
                          onPointerDown={(e) => startResize(e, el.id, el.width, el.height)}
                          className="absolute bottom-0 right-0 h-3 w-3 cursor-se-resize rounded-sm bg-black/40"
                        />
                      )}
                    </div>
                  ))}

                  {isEditing ? (
                    <div className="pointer-events-none absolute left-4 top-4 rounded-lg bg-black/70 px-3 py-2 text-xs text-white/80">
                      Edit mode: preview locked
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </div>

        <aside
          className={`border-l border-white/10 bg-slate-950/95 backdrop-blur-xl transition-all duration-300 ${
            isEditing ? "w-[380px] opacity-100" : "w-0 overflow-hidden opacity-0"
          }`}
        >
          <div className="w-[380px] p-6">
            <div className="text-xs uppercase tracking-[0.22em] text-white/40">
              Editor Panel
            </div>

            <h3 className="mt-2 text-xl font-semibold">Edit Event Page</h3>

            <p className="mt-2 text-sm text-white/65">
              This right-side drawer will become your visual controls panel.
            </p>

            <div className="mt-6 space-y-4">
              <button className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left hover:bg-white/10">
                Colors
              </button>
              <button className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left hover:bg-white/10">
                Background
              </button>
              <button className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left hover:bg-white/10">
                Header
              </button>
              <button className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left hover:bg-white/10">
                Hero
              </button>

              <button
                onClick={addTextBlock}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left hover:bg-white/10"
              >
                Add Element
              </button>
            </div>

            <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm font-semibold">Selected Element</div>

              {selectedElement ? (
                <div className="mt-4 space-y-3">
                  <div>
                    <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/40">
                      Text Content
                    </div>
                    <textarea
                      value={selectedElement.content}
                      onChange={(e) => updateSelectedContent(e.target.value)}
                      className="min-h-[110px] w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-sm text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs text-white/60">
                    <div className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2">
                      X: {Math.round(selectedElement.x)}
                    </div>
                    <div className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2">
                      Y: {Math.round(selectedElement.y)}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs text-white/60">
                    <div className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2">
                      W: {Math.round(selectedElement.width ?? 0)}
                    </div>
                    <div className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2">
                      H: {Math.round(selectedElement.height ?? 0)}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (!selectedId) return
                      setElements((prev) => prev.filter((el) => el.id !== selectedId))
                      setSelectedId(null)
                    }}
                    className="w-full rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-200 hover:bg-red-500/20"
                  >
                    Delete Element
                  </button>
                </div>
              ) : (
                <div className="mt-3 text-sm text-white/55">
                  Click a block on the canvas to edit it.
                </div>
              )}
            </div>

            <button
              onClick={saveLayout}
              className="mt-8 w-full rounded-xl bg-emerald-600 px-4 py-3 font-semibold hover:bg-emerald-500"
            >
              Save
            </button>

            {saveMessage ? (
              <div className="mt-3 text-sm text-white/70">{saveMessage}</div>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  )
}