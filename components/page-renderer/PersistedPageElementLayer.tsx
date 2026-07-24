import type { EventPageElement } from "@/lib/page-editor/sectionTypes"

export default function PersistedPageElementLayer({
  elements,
}: {
  elements: EventPageElement[]
}) {
  return elements
    .filter((element) => element.visible !== false)
    .map((element) => (
      <div
        key={element.id}
        className={`absolute overflow-hidden rounded-xl shadow-lg ${
          element.element_type === "image"
            ? "bg-white"
            : element.element_type === "video"
              ? "bg-black"
              : element.element_type === "pdf"
                ? "bg-red-950/90 text-white"
                : element.element_type === "button"
                  ? "bg-transparent"
                  : element.element_type === "spacer"
                    ? "border border-dashed border-white/20 bg-white/5"
                    : "bg-amber-400 text-black"
        }`}
        style={{
          left: element.x,
          top: element.y,
          zIndex: element.z_index ?? 1,
          width: element.width ?? "auto",
          height: element.height ?? "auto",
        }}
      >
        {element.element_type === "image" ? (
          <img
            src={String(element.props?.src ?? "https://placehold.co/800x450/png")}
            alt={String(element.props?.alt ?? "Image block")}
            className="h-full w-full object-cover"
            draggable={false}
          />
        ) : element.element_type === "video" ? (
          String(element.props?.posterUrl ?? "") ? (
            <img
              src={String(element.props?.posterUrl ?? "")}
              alt={element.content || "Video poster"}
              className="h-full w-full object-cover"
              draggable={false}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-white/50">
              Video block
            </div>
          )
        ) : element.element_type === "pdf" ? (
          <div className="flex h-full w-full flex-col justify-between p-4">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-white/50">PDF</div>
              <div className="mt-2 text-base font-semibold">{element.content}</div>
            </div>
            <div className="mt-4 break-all text-xs text-white/70">
              {String(element.props?.url ?? "")}
            </div>
          </div>
        ) : element.element_type === "button" ? (
          <div className="flex h-full w-full items-center justify-center">
            <a
              href={String(element.props?.href ?? "#")}
              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white no-underline"
            >
              {element.content || "Button"}
            </a>
          </div>
        ) : element.element_type === "spacer" ? (
          <div className="flex h-full w-full items-center justify-center text-xs uppercase tracking-[0.18em] text-white/40">
            Spacer
          </div>
        ) : (
          <div className="px-4 py-2 text-sm font-medium whitespace-pre-wrap">
            {element.content}
          </div>
        )}
      </div>
    ))
}
