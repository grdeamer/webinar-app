import type { CSSProperties } from "react"
import { resolveEventFont, findEventDesignPreset, resolveSessionLayout } from "@/lib/page-editor/eventDesignPresets"
import type { EventTheme } from "@/lib/page-editor/sectionTypes"

export type SessionDisplayItem = {
  id: string
  title: string
  time?: string | null
  date?: string | null
  presenter?: string | null
  description?: string | null
  status?: string
  detailsHref?: string
  joinHref?: string | null
  artwork?: string | null
}

export function SessionLayouts({ items, theme, settings = {}, preview = false }: {
  items: SessionDisplayItem[]
  theme?: EventTheme | null
  settings?: Record<string, unknown>
  preview?: boolean
}) {
  const preset = findEventDesignPreset(theme?.presetId)
  const layout = resolveSessionLayout(settings.displayMode, theme?.sessionLayout)
  const featured = items.find((item) => item.status === "Live now") ?? items.find((item) => item.status === "Upcoming") ?? items[0]
  const ordered = layout === "featured" && featured ? [featured, ...items.filter((item) => item !== featured)] : items
  const style = {
    color: theme?.textColor ?? "#f2f0fa",
    "--sessions-panel": theme?.panelBackgroundColor ?? "#1a2132",
    "--sessions-border": theme?.panelBorderColor ?? "#41405a",
    "--sessions-accent": theme?.accentColor ?? preset?.accent ?? "#dfd2ff",
    "--sessions-action-radius": theme?.buttonStyle === "pill" ? "999px" : "6px",
    "--sessions-action-bg": theme?.buttonStyle && theme.buttonStyle !== "outline" ? "var(--sessions-accent)" : "transparent",
    "--sessions-action-ink": theme?.buttonStyle && theme.buttonStyle !== "outline" ? preset?.background ?? "#111526" : "var(--sessions-accent)",
    "--sessions-radius": `${preset?.radius ?? 14}px`,
    fontFamily: resolveEventFont(theme),
  } as CSSProperties

  return (
    <div style={style} className="@container space-y-4">
      {typeof settings.title === "string" && settings.title && <h2 className="text-xl font-semibold">{settings.title}</h2>}
      {typeof settings.body === "string" && settings.body && <p className="opacity-80">{settings.body}</p>}
      {!ordered.length && <p className="rounded-[var(--sessions-radius)] border border-[var(--sessions-border)] bg-[var(--sessions-panel)] p-6">
        {typeof settings.emptyStateText === "string" && settings.emptyStateText ? settings.emptyStateText : "No sessions available."}
      </p>}
      <div className={layout === "cards" ? "grid gap-4 @sm:grid-cols-2" : "grid gap-3"}>
        {ordered.map((item, index) => {
          const prominent = layout === "featured" && index === 0
          return (
            <article key={item.id} className={`overflow-hidden rounded-[var(--sessions-radius)] border border-[var(--sessions-border)] bg-[var(--sessions-panel)] ${prominent ? "border-l-4 border-l-[var(--sessions-accent)]" : ""}`}>
              {layout === "cards" && item.artwork && <div role="img" aria-label="" className="aspect-[3/1] bg-cover bg-center" style={{ backgroundImage: `url(${JSON.stringify(item.artwork)})` }} />}
              <div className={`gap-4 ${prominent ? "p-6" : "p-4"} ${layout === "list" ? "grid items-center @lg:grid-cols-[minmax(6rem,auto)_1fr_auto]" : "grid"}`}>
                <div className="text-xs opacity-80">
                  {settings.showTime !== false && [item.date, item.time].filter(Boolean).join(" · ")}
                  {item.status && <span className="block font-semibold">{item.status}</span>}
                </div>
                <div>
                  <h3 className={prominent ? "text-2xl font-semibold" : "text-lg font-semibold"}>{item.title}</h3>
                  {settings.showPresenter !== false && item.presenter && <p className="mt-1 text-sm opacity-80">{item.presenter}</p>}
                  {settings.showDescriptions !== false && item.description && <p className="mt-1 text-sm opacity-80">{item.description}</p>}
                </div>
                {(settings.showJoinAction !== false || item.detailsHref) && (
                  <div className="flex flex-wrap gap-2 text-sm">
                    {item.detailsHref && <a className="rounded-md border border-[var(--sessions-border)] px-3 py-2" href={item.detailsHref}>View session</a>}
                    {settings.showJoinAction !== false && (item.joinHref ?
                      <a className="rounded-[var(--sessions-action-radius)] border border-[var(--sessions-accent)] bg-[var(--sessions-action-bg)] px-3 py-2 font-semibold text-[var(--sessions-action-ink)]" href={item.joinHref} target="_blank" rel="noopener noreferrer">Join session ↗</a> :
                      preview && <span className="rounded-[var(--sessions-action-radius)] border border-[var(--sessions-accent)] bg-[var(--sessions-action-bg)] px-3 py-2 font-semibold text-[var(--sessions-action-ink)]">Join session ↗</span>)}
                  </div>
                )}
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}

export const sessionPreviewItems: SessionDisplayItem[] = [
  { id: "welcome", title: "Welcome and opening discussion", presenter: "Alex Morgan", time: "9:00 AM", status: "Live now" },
  { id: "workshop", title: "Facilitated workshop", presenter: "Jordan Lee", time: "10:30 AM", status: "Upcoming" },
]
