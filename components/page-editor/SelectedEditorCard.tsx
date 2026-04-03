"use client"

import {
  getSectionRegistryItem,
} from "@/lib/page-editor/sectionRegistry"
import type {
  SectionConfig,
} from "@/lib/page-editor/sectionTypes"

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

type EventPageSection = {
  id: string
  type: any
  config: SectionConfig
}

type Props = {
  selectedElement: EditorElement | null
  selectedSection: EventPageSection | null
  editorDetailsOpen: boolean
  setEditorDetailsOpen: React.Dispatch<React.SetStateAction<boolean>>
  canDuplicateElement: boolean
  canDeleteElement: boolean
  canSendBackward: boolean
  canBringForward: boolean
  canMoveUp: boolean
  canMoveDown: boolean
  canDuplicateSection: boolean
  canDeleteSection: boolean
  duplicateSelectedElement: () => void
  deleteSelectedElement: () => void
  sendSelectedElementBackward: () => void
  bringSelectedElementForward: () => void
  moveSelectedSection: (direction: "up" | "down") => void
  duplicateSelectedSection: () => void
  deleteSelectedSection: () => void
  updateElement: (id: string, patch: Partial<EditorElement>) => void
  updateElementProps: (id: string, patch: Record<string, unknown>) => void
  updateSectionConfig: (id: string, patch: Partial<SectionConfig>) => void
  SectionPanelHeader: React.ComponentType<{
    title: string
    open: boolean
    onToggle: () => void
  }>
  registryItem: any
}

export default function SelectedEditorCard({
  selectedElement,
  selectedSection,
  editorDetailsOpen,
  setEditorDetailsOpen,
  canDuplicateElement,
  canDeleteElement,
  canSendBackward,
  canBringForward,
  canMoveUp,
  canMoveDown,
  canDuplicateSection,
  canDeleteSection,
  duplicateSelectedElement,
  deleteSelectedElement,
  sendSelectedElementBackward,
  bringSelectedElementForward,
  moveSelectedSection,
  duplicateSelectedSection,
  deleteSelectedSection,
  updateElement,
  updateElementProps,
  updateSectionConfig,
  SectionPanelHeader,
  registryItem,
}: Props) {
  return (
    <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
      <SectionPanelHeader
        title={
          selectedElement
            ? "Selected Element"
            : selectedSection
            ? selectedSection.config.adminLabel ||
              getSectionRegistryItem(selectedSection.type).label
            : "Editor"
        }
        open={editorDetailsOpen}
        onToggle={() => setEditorDetailsOpen((v) => !v)}
      />

      {editorDetailsOpen && (
        <div className="mt-4">
          <div className="text-xs text-white/45">
            {selectedElement
              ? `${selectedElement.element_type ?? "text"} element`
              : selectedSection
              ? `${getSectionRegistryItem(selectedSection.type).label} section`
              : "Select a section or canvas element"}
          </div>

          {selectedElement ? (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={duplicateSelectedElement}
                  disabled={!canDuplicateElement}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                    canDuplicateElement
                      ? "bg-blue-600 text-white hover:bg-blue-500"
                      : "cursor-not-allowed bg-white/10 text-white/35"
                  }`}
                >
                  Duplicate
                </button>

                <button
                  onClick={deleteSelectedElement}
                  disabled={!canDeleteElement}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                    canDeleteElement
                      ? "bg-red-600 text-white hover:bg-red-500"
                      : "cursor-not-allowed bg-white/10 text-white/35"
                  }`}
                >
                  Delete
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={sendSelectedElementBackward}
                  disabled={!canSendBackward}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                    canSendBackward
                      ? "bg-white text-slate-950 hover:bg-white/90"
                      : "cursor-not-allowed bg-white/10 text-white/35"
                  }`}
                >
                  Send Back
                </button>

                <button
                  onClick={bringSelectedElementForward}
                  disabled={!canBringForward}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                    canBringForward
                      ? "bg-white text-slate-950 hover:bg-white/90"
                      : "cursor-not-allowed bg-white/10 text-white/35"
                  }`}
                >
                  Bring Front
                </button>
              </div>

              <div>
                <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/40">
                  Layer
                </div>
                <input
                  value={selectedElement.z_index ?? 1}
                  readOnly
                  className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-3 text-sm text-white/70"
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-white/80">
                <input
                  type="checkbox"
                  checked={Boolean(selectedElement.props?.hideOnMobile)}
                  onChange={(e) =>
                    updateElementProps(selectedElement.id, {
                      hideOnMobile: e.target.checked,
                    })
                  }
                />
                Hide on Mobile
              </label>

              <div>
                <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/40">
                  Element Type
                </div>
                <input
                  value={selectedElement.element_type ?? "text"}
                  readOnly
                  className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-3 text-sm text-white/70"
                />
              </div>

              {selectedElement.element_type !== "spacer" && (
                <div>
                  <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/40">
                    Content
                  </div>
                  {selectedElement.element_type === "text" ||
                  selectedElement.element_type === "pdf" ||
                  selectedElement.element_type === "button" ? (
                    <textarea
                      value={selectedElement.content}
                      onChange={(e) =>
                        updateElement(selectedElement.id, {
                          content: e.target.value,
                        })
                      }
                      className="min-h-[100px] w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-sm text-white"
                    />
                  ) : (
                    <input
                      value={selectedElement.content}
                      onChange={(e) =>
                        updateElement(selectedElement.id, {
                          content: e.target.value,
                        })
                      }
                      className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-sm text-white"
                    />
                  )}
                </div>
              )}
            </div>
          ) : selectedSection ? (
            <div className="mt-4 space-y-4">
              {selectedSection.type !== "hero" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => moveSelectedSection("up")}
                      disabled={!canMoveUp}
                      className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                        canMoveUp
                          ? "bg-white text-slate-950 hover:bg-white/90"
                          : "cursor-not-allowed bg-white/10 text-white/35"
                      }`}
                    >
                      Move Up
                    </button>

                    <button
                      onClick={() => moveSelectedSection("down")}
                      disabled={!canMoveDown}
                      className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                        canMoveDown
                          ? "bg-white text-slate-950 hover:bg-white/90"
                          : "cursor-not-allowed bg-white/10 text-white/35"
                      }`}
                    >
                      Move Down
                    </button>
                  </div>

                  <button
                    onClick={duplicateSelectedSection}
                    disabled={!canDuplicateSection}
                    className={`w-full rounded-xl px-4 py-2 text-sm font-semibold ${
                      canDuplicateSection
                        ? "bg-blue-600 text-white hover:bg-blue-500"
                        : "cursor-not-allowed bg-white/10 text-white/35"
                    }`}
                  >
                    Duplicate Section
                  </button>

                  <button
                    onClick={deleteSelectedSection}
                    disabled={!canDeleteSection}
                    className={`w-full rounded-xl px-4 py-2 text-sm font-semibold ${
                      canDeleteSection
                        ? "bg-red-600 text-white hover:bg-red-500"
                        : "cursor-not-allowed bg-white/10 text-white/35"
                    }`}
                  >
                    Delete Section
                  </button>
                </>
              )}

              {registryItem?.fields.map((field: any) => {
                const value = (selectedSection.config as any)?.[field.key]

                if (field.type === "checkbox") {
                  return (
                    <label
                      key={field.key}
                      className="flex items-center gap-2 text-sm text-white/80"
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(value)}
                        onChange={(e) =>
                          updateSectionConfig(selectedSection.id, {
                            [field.key]: e.target.checked,
                          })
                        }
                      />
                      {field.label}
                    </label>
                  )
                }

                if (field.type === "textarea") {
                  return (
                    <div key={field.key}>
                      <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/40">
                        {field.label}
                      </div>
                      <textarea
                        value={String(value ?? "")}
                        onChange={(e) =>
                          updateSectionConfig(selectedSection.id, {
                            [field.key]: e.target.value,
                          })
                        }
                        placeholder={field.placeholder}
                        className="min-h-[120px] w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-sm text-white"
                      />
                    </div>
                  )
                }

                if (field.type === "select") {
                  return (
                    <div key={field.key}>
                      <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/40">
                        {field.label}
                      </div>
                      <select
                        value={String(value ?? "")}
                        onChange={(e) =>
                          updateSectionConfig(selectedSection.id, {
                            [field.key]: e.target.value,
                          })
                        }
                        className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-sm text-white"
                      >
                        {field.options?.map((opt: any) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )
                }

                return (
                  <div key={field.key}>
                    <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/40">
                      {field.label}
                    </div>
                    <input
                      value={String(value ?? "")}
                      onChange={(e) =>
                        updateSectionConfig(selectedSection.id, {
                          [field.key]: e.target.value,
                        })
                      }
                      placeholder={field.placeholder}
                      className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-sm text-white"
                    />
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="mt-3 text-sm text-white/55">
              Click a section in the list or an element on the canvas to edit it.
            </div>
          )}
        </div>
      )}
    </div>
  )
}