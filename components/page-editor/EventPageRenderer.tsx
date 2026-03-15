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

type EventLike = {
  title: string
  description?: string | null
}

export default function EventPageRenderer({
  event,
  elements,
  mode = "live",
}: {
  event: EventLike
  elements: EditorElement[]
  mode?: "live" | "editor"
}) {
  return (
    <div className="relative min-h-[900px] overflow-hidden rounded-3xl border border-white/10 bg-slate-950 text-white">
      <div className="border-b border-white/10 bg-white/5 px-8 py-8">
        <div className="text-xs uppercase tracking-[0.22em] text-white/40">
          Event Page
        </div>
        <h1 className="mt-3 text-4xl font-bold">{event.title}</h1>
        {event.description ? (
          <p className="mt-4 max-w-3xl text-white/70">{event.description}</p>
        ) : null}
      </div>

      <div className="px-8 py-8">
        <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.03] p-10 text-white/50">
          Built-in event sections will move here next.
        </div>
      </div>

      {elements.map((el) => (
        <div
          key={el.id}
          className={`absolute overflow-hidden rounded-xl shadow-lg ${
            el.element_type === "image"
              ? "bg-white"
              : el.element_type === "pdf"
              ? "bg-red-950/90 text-white"
              : "bg-amber-400 text-black"
          } ${mode === "editor" ? "pointer-events-none" : ""}`}
          style={{
            left: el.x,
            top: el.y,
            zIndex: el.z_index ?? 1,
            width: el.width ?? "auto",
            height: el.height ?? "auto",
          }}
        >
          {el.element_type === "image" ? (
            <img
              src={String(el.props?.src ?? "https://placehold.co/600x400/png")}
              alt={String(el.props?.alt ?? "Image block")}
              className="h-full w-full object-cover"
              draggable={false}
            />
          ) : el.element_type === "pdf" ? (
            <div className="flex h-full w-full flex-col justify-between p-4">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-white/50">
                  PDF
                </div>
                <div className="mt-2 text-base font-semibold">{el.content}</div>
              </div>
              <div className="mt-4 text-xs break-all text-white/70">
                {String(el.props?.url ?? "")}
              </div>
            </div>
          ) : (
            <div className="px-4 py-2 text-sm font-medium">{el.content}</div>
          )}
        </div>
      ))}
    </div>
  )
}