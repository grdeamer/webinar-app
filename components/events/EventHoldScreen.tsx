import type { CSSProperties } from "react"
import { HOLD_SCREEN_CSS, holdScreenStyle, safeHoldLogo, type HoldScreenSettings } from "@/lib/page-editor/holdScreen"

export type HoldScreenField = "logoUrl" | "title" | "heading" | "message" | "status"

type Props = {
  settings: HoldScreenSettings
  eventTitle: string
  selectedField?: HoldScreenField
  onSelect?: (field: HoldScreenField) => void
}

export default function EventHoldScreen({ settings, eventTitle, selectedField, onSelect }: Props) {
  function editable(field: HoldScreenField) {
    return onSelect ? {
      "data-hold-field": field,
      role: "button",
      tabIndex: 0,
      "aria-label": `Edit ${field === "logoUrl" ? "logo" : field}`,
      "aria-pressed": selectedField === field,
      onClick: () => onSelect(field),
      onKeyDown: (event: React.KeyboardEvent) => {
        if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(field) }
      },
    } : {}
  }
  return <div className="jupiter-hold" style={holdScreenStyle(settings) as CSSProperties}>
    <style>{HOLD_SCREEN_CSS}</style>
    <div className="hold-card">
      {settings.logoUrl ? <div {...editable("logoUrl")}><img className="hold-logo" src={safeHoldLogo(settings.logoUrl) || undefined} alt={settings.logoAlt} /></div> : onSelect ? <button type="button" onClick={() => onSelect("logoUrl")} className="mb-6 text-sm underline">Add logo</button> : null}
      <div className="hold-title" {...editable("title")}>{settings.title || eventTitle}</div>
      <h2 className="hold-heading" {...editable("heading")}>{settings.heading || (onSelect ? "Add heading" : "")}</h2>
      <p className="hold-message" {...editable("message")}>{settings.message || (onSelect ? "Add message" : "")}</p>
      {settings.status || onSelect ? <div className="hold-status" {...editable("status")}><span className="hold-dot" />{settings.status || "Add status"}</div> : null}
    </div>
  </div>
}
