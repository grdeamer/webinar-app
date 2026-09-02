"use client"

import { useState } from "react"
import type { EventPageElement } from "@/lib/page-editor/sectionTypes"
import { getResponsiveElement, type ElementPreviewDevice } from "@/lib/page-editor/elementPresentation"
import { ELEMENT_ANIMATION_EFFECT_OPTIONS, ELEMENT_ANIMATION_EASING_OPTIONS, getElementAnimationConfig, type ElementAnimationEffect, type ElementAnimationEasing } from "./elementAnimation"
import type { LayerCommand } from "./layerCommands"

type Tab = "design" | "position" | "animate"
const FIELD = "w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white"
const BUTTON = "rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2 text-xs font-semibold text-white/65 hover:bg-white/[0.075] hover:text-white disabled:opacity-30"
const FONTS = ["Inter, sans-serif", "Arial, sans-serif", "Georgia, serif", "'Times New Roman', serif", "Verdana, sans-serif", "'Trebuchet MS', sans-serif"]

export default function ElementInspectorTabs({ element: sourceElement, previewDevice, canBringForward, canSendBackward, canDuplicate, canDelete, updateElement: updateBaseElement, updateProps: updateBaseProps, performLayerCommand, duplicate, remove, uploadImage, uploadPdf, uploadVideo, uploadPoster }: {
  element: EventPageElement
  previewDevice: ElementPreviewDevice
  canBringForward: boolean
  canSendBackward: boolean
  canDuplicate: boolean
  canDelete: boolean
  updateElement: (id: string, patch: Partial<EventPageElement>) => void
  updateProps: (id: string, patch: Record<string, unknown>) => void
  performLayerCommand: (id: string, command: LayerCommand) => void
  duplicate: () => void
  remove: () => void
  uploadImage: (file: File) => Promise<void>
  uploadPdf: (file: File) => Promise<void>
  uploadVideo: (file: File) => Promise<void>
  uploadPoster: (file: File) => Promise<void>
}) {
  const [tab, setTab] = useState<Tab>("design")
  const element = getResponsiveElement(sourceElement, previewDevice)
  const props = element.props ?? {}
  const responsiveStyles = sourceElement.props?.responsiveStyles && typeof sourceElement.props.responsiveStyles === "object" && !Array.isArray(sourceElement.props.responsiveStyles) ? sourceElement.props.responsiveStyles as Record<string, unknown> : {}
  const currentOverride = responsiveStyles[previewDevice] && typeof responsiveStyles[previewDevice] === "object" && !Array.isArray(responsiveStyles[previewDevice]) ? responsiveStyles[previewDevice] as Record<string, unknown> : {}
  const currentOverrideProps = currentOverride.props && typeof currentOverride.props === "object" && !Array.isArray(currentOverride.props) ? currentOverride.props as Record<string, unknown> : {}
  const updateElement = (id: string, patch: Partial<EventPageElement>) => {
    if (previewDevice === "desktop") { updateBaseElement(id, patch); return }
    updateBaseProps(id, { responsiveStyles: { ...responsiveStyles, [previewDevice]: { ...currentOverride, ...patch } } })
  }
  const updateProps = (id: string, patch: Record<string, unknown>) => {
    if (previewDevice === "desktop") { updateBaseProps(id, patch); return }
    updateBaseProps(id, { responsiveStyles: { ...responsiveStyles, [previewDevice]: { ...currentOverride, props: { ...currentOverrideProps, ...patch } } } })
  }
  const resetDeviceOverrides = () => {
    if (previewDevice === "desktop") return
    const next = { ...responsiveStyles }
    delete next[previewDevice]
    updateBaseProps(sourceElement.id, { responsiveStyles: next })
  }
  const animation = getElementAnimationConfig(props)
  const decoration = String(props.textDecoration ?? "none")
  const transform = String(props.textTransform ?? "none")
  const updateAnimation = (patch: Partial<typeof animation>) => updateProps(element.id, { animation: { ...animation, ...patch } })

  return <div className="mt-4">
    <div role="tablist" aria-label="Element settings" className="grid grid-cols-3 border-b border-white/10">
      {(["design", "position", "animate"] as Tab[]).map((item) => <button key={item} type="button" role="tab" aria-selected={tab === item} onClick={() => setTab(item)} className={`border-b-2 px-2 py-3 text-sm font-semibold capitalize transition ${tab === item ? "border-violet-400 text-white" : "border-transparent text-white/45 hover:text-white/75"}`}>{item}</button>)}
    </div>

    {tab === "design" ? <div className="mt-5 space-y-5">
      {element.element_type !== "spacer" ? <InspectorGroup label="Content"><textarea aria-label="Element content" value={element.content} onChange={(event) => updateElement(element.id, { content: event.target.value })} className={`${FIELD} min-h-20 resize-y`} /></InspectorGroup> : null}
      {element.element_type === "image" ? <>
        <InspectorGroup label="Image">
          <select aria-label="Image fit" className={FIELD} value={String(props.imageFit ?? "cover")} onChange={(event) => updateProps(element.id, { imageFit: event.target.value })}><option value="cover">Cover — crop to fill</option><option value="contain">Contain — show full image</option></select>
          <select aria-label="Image position" className={FIELD} value={String(props.imagePosition ?? "center")} onChange={(event) => updateProps(element.id, { imagePosition: event.target.value })}>{["center","top","bottom","left","right"].map((position) => <option key={position} value={position}>{position}</option>)}</select>
          <RangeField label="Zoom" value={Number(props.imageScale ?? 1)} min={1} max={4} step={0.05} onChange={(value) => updateProps(element.id, { imageScale: value })} />
          <RangeField label="Horizontal focal point" value={Number(props.imageFocalX ?? 50)} min={0} max={100} step={1} onChange={(value) => updateProps(element.id, { imageFocalX: value })} />
          <RangeField label="Vertical focal point" value={Number(props.imageFocalY ?? 50)} min={0} max={100} step={1} onChange={(value) => updateProps(element.id, { imageFocalY: value })} />
          <button type="button" className={BUTTON} onClick={() => updateProps(element.id, { imageScale: 1, imageFocalX: 50, imageFocalY: 50 })}>Reset crop</button>
          <FileField label="Replace image" accept="image/*" onFile={uploadImage} />
        </InspectorGroup>
      </> : null}
      {element.element_type === "video" ? <InspectorGroup label="Video">
        <input aria-label="Video URL" placeholder="Video URL" value={String(props.url ?? props.src ?? "")} onChange={(event) => updateProps(element.id, { url: event.target.value })} className={FIELD} />
        <div className="grid grid-cols-2 gap-2"><Check label="Controls" checked={props.controls !== false} onChange={(checked) => updateProps(element.id, { controls: checked })} /><Check label="Autoplay" checked={Boolean(props.autoplay)} onChange={(checked) => updateProps(element.id, { autoplay: checked })} /><Check label="Loop" checked={Boolean(props.loop)} onChange={(checked) => updateProps(element.id, { loop: checked })} /><Check label="Muted" checked={props.muted !== false} onChange={(checked) => updateProps(element.id, { muted: checked })} /></div>
        <FileField label="Replace video" accept="video/*" onFile={uploadVideo} /><FileField label="Upload poster" accept="image/*" onFile={uploadPoster} />
      </InspectorGroup> : null}
      {element.element_type === "pdf" ? <InspectorGroup label="PDF"><input aria-label="PDF URL" placeholder="PDF URL" value={String(props.url ?? "")} onChange={(event) => updateProps(element.id, { url: event.target.value })} className={FIELD} /><FileField label="Replace PDF" accept="application/pdf" onFile={uploadPdf} /></InspectorGroup> : null}
      {element.element_type === "button" ? <InspectorGroup label="Button"><input aria-label="Button link" placeholder="Link URL" value={String(props.href ?? "")} onChange={(event) => updateProps(element.id, { href: event.target.value })} className={FIELD} /><div className="grid grid-cols-2 gap-2"><ColorField label="Text" value={String(props.textColor ?? "#ffffff")} onChange={(value) => updateProps(element.id, { textColor: value })} /><ColorField label="Background" value={String(props.backgroundColor ?? "#7c3aed")} onChange={(value) => updateProps(element.id, { backgroundColor: value })} /></div></InspectorGroup> : null}
      {element.element_type === "spacer" ? <InspectorGroup label="Divider"><ColorField label="Color" value={String(props.backgroundColor ?? "#facc15")} onChange={(value) => updateProps(element.id, { backgroundColor: value })} /><RangeField label="Opacity" value={Number(props.backgroundOpacity ?? 1)} min={0} max={1} step={0.05} onChange={(value) => updateProps(element.id, { backgroundOpacity: value })} /></InspectorGroup> : null}
      {element.element_type === "text" ? <>
      <InspectorGroup label="Text">
        <select aria-label="Font family" className={FIELD} value={String(props.fontFamily ?? "Inter, sans-serif")} onChange={(event) => updateProps(element.id, { fontFamily: event.target.value })}>{FONTS.map((font) => <option key={font} value={font}>{font.split(",")[0].replaceAll("'", "")}</option>)}</select>
        <div className="grid grid-cols-[1fr_1fr_52px] gap-2">
          <input aria-label="Font size" className={FIELD} type="number" min="6" max="300" value={Number(props.fontSize ?? 22)} onChange={(event) => updateProps(element.id, { fontSize: Number(event.target.value) })} />
          <select aria-label="Font weight" className={FIELD} value={Number(props.fontWeight ?? 700)} onChange={(event) => updateProps(element.id, { fontWeight: Number(event.target.value) })}><option value="400">Regular</option><option value="500">Medium</option><option value="600">Semibold</option><option value="700">Bold</option><option value="800">Extra Bold</option><option value="900">Black</option></select>
          <input aria-label="Text color" title="Text color" type="color" value={String(props.textColor ?? "#ffffff")} onChange={(event) => updateProps(element.id, { textColor: event.target.value })} className="h-full w-full rounded-xl border border-white/10 bg-slate-950 p-2" />
        </div>
        <div className="grid grid-cols-5 overflow-hidden rounded-xl border border-white/10">
          <Toggle label="Bold" active={Number(props.fontWeight ?? 700) >= 700} onClick={() => updateProps(element.id, { fontWeight: Number(props.fontWeight ?? 700) >= 700 ? 400 : 700 })}>B</Toggle>
          <Toggle label="Italic" active={props.fontStyle === "italic"} onClick={() => updateProps(element.id, { fontStyle: props.fontStyle === "italic" ? "normal" : "italic" })}><i>I</i></Toggle>
          <Toggle label="Underline" active={decoration === "underline"} onClick={() => updateProps(element.id, { textDecoration: decoration === "underline" ? "none" : "underline" })}><u>U</u></Toggle>
          <Toggle label="Strikethrough" active={decoration === "line-through"} onClick={() => updateProps(element.id, { textDecoration: decoration === "line-through" ? "none" : "line-through" })}><s>S</s></Toggle>
          <Toggle label="Change case" active={transform === "uppercase"} onClick={() => updateProps(element.id, { textTransform: transform === "uppercase" ? "none" : "uppercase" })}>aA</Toggle>
        </div>
        <div className="grid grid-cols-4 overflow-hidden rounded-xl border border-white/10">{["left", "center", "right", "justify"].map((align) => <Toggle key={align} label={`Align ${align}`} active={String(props.textAlign ?? "left") === align} onClick={() => updateProps(element.id, { textAlign: align })}>{align === "left" ? "≡" : align === "center" ? "≣" : align === "right" ? "≡" : "☰"}</Toggle>)}</div>
      </InspectorGroup>
      <InspectorGroup label="Text spacing">
        <div className="grid grid-cols-2 gap-2"><NumberField label="Letter" value={Number(props.letterSpacing ?? 0)} step={0.1} onChange={(value) => updateProps(element.id, { letterSpacing: value })} /><NumberField label="Line" value={Number(props.lineHeight ?? 1.4)} step={0.1} onChange={(value) => updateProps(element.id, { lineHeight: value })} /></div>
      </InspectorGroup>
      <InspectorGroup label="Colors">
        <ColorRow label="Text" value={String(props.textColor ?? "#ffffff")} opacity={Number(props.opacity ?? 1)} onColor={(value) => updateProps(element.id, { textColor: value })} onOpacity={(value) => updateProps(element.id, { opacity: value })} />
        <ColorRow label="Link" value={String(props.linkColor ?? "#8b5cf6")} opacity={Number(props.linkOpacity ?? 1)} onColor={(value) => updateProps(element.id, { linkColor: value })} onOpacity={(value) => updateProps(element.id, { linkOpacity: value })} />
        <input aria-label="Link URL" placeholder="Link URL" value={String(props.href ?? "")} onChange={(event) => updateProps(element.id, { href: event.target.value })} className={FIELD} />
      </InspectorGroup>
      </> : null}
    </div> : null}

    {tab === "position" ? <div className="mt-5 space-y-5">
      {previewDevice !== "desktop" ? <div className="rounded-xl border border-violet-300/15 bg-violet-400/10 px-3 py-2 text-[10px] font-semibold text-violet-100"><span>Editing {previewDevice} overrides. Desktop remains unchanged.</span><button type="button" onClick={resetDeviceOverrides} className="mt-2 block text-white/60 underline hover:text-white">Reset {previewDevice} to desktop</button></div> : null}
      <InspectorGroup label="Position and size">
        <div className="grid grid-cols-2 gap-2"><NumberField label="X" value={element.x} onChange={(value) => updateElement(element.id, { x: value })} /><NumberField label="Y" value={element.y} onChange={(value) => updateElement(element.id, { y: value })} /><NumberField label="Width" value={Number(element.width ?? 0)} min={24} onChange={(value) => updateElement(element.id, { width: value })} /><NumberField label="Height" value={Number(element.height ?? 0)} min={24} onChange={(value) => updateElement(element.id, { height: value })} /><NumberField label="Rotation" value={Number(props.rotation ?? 0)} step={1} onChange={(value) => updateProps(element.id, { rotation: value })} /><NumberField label="Opacity %" value={Math.round(Number(props.opacity ?? 1) * 100)} min={0} onChange={(value) => updateProps(element.id, { opacity: Math.min(1, Math.max(0, value / 100)) })} /></div>
        <div className="grid grid-cols-2 gap-2"><button type="button" className={BUTTON} aria-pressed={props.flipX === true} onClick={() => updateProps(element.id, { flipX: props.flipX !== true })}>Flip horizontal</button><button type="button" className={BUTTON} aria-pressed={props.flipY === true} onClick={() => updateProps(element.id, { flipY: props.flipY !== true })}>Flip vertical</button></div>
        <Check label="Lock aspect ratio" checked={props.lockAspectRatio === true} onChange={(checked) => updateProps(element.id, { lockAspectRatio: checked })} />
      </InspectorGroup>
      <InspectorGroup label="Layers">
        <div className="grid grid-cols-2 gap-2"><button className={BUTTON} disabled={!canBringForward} onClick={() => performLayerCommand(element.id, "bring-forward")}>Bring forward</button><button className={BUTTON} disabled={!canBringForward} onClick={() => performLayerCommand(element.id, "bring-to-front")}>Bring to front</button><button className={BUTTON} disabled={!canSendBackward} onClick={() => performLayerCommand(element.id, "send-backward")}>Send backward</button><button className={BUTTON} disabled={!canSendBackward} onClick={() => performLayerCommand(element.id, "send-to-back")}>Send to back</button></div>
        <div className="grid grid-cols-2 gap-2"><button className={BUTTON} onClick={() => updateElement(element.id, { locked: !element.locked })}>{element.locked ? "Unlock" : "Lock"}</button><button className={BUTTON} disabled={!canDuplicate} onClick={duplicate}>Duplicate</button></div>
        <div className="grid grid-cols-1 gap-2"><Check label="Hide on mobile" checked={Boolean(props.hideOnMobile)} onChange={(checked) => updateProps(element.id, { hideOnMobile: checked })} /><Check label="Hide on tablet" checked={Boolean(props.hideOnTablet)} onChange={(checked) => updateProps(element.id, { hideOnTablet: checked })} /><Check label="Hide on desktop" checked={Boolean(props.hideOnDesktop)} onChange={(checked) => updateProps(element.id, { hideOnDesktop: checked })} /></div>
        <button className="w-full rounded-xl border border-red-300/15 bg-red-400/10 px-3 py-2 text-xs font-semibold text-red-100 disabled:opacity-30" disabled={!canDelete} onClick={remove}>Delete element</button>
      </InspectorGroup>
    </div> : null}

    {tab === "animate" ? <div className="mt-5 space-y-5"><InspectorGroup label="Animation">
      <SelectField label="Intro" value={animation.intro} options={ELEMENT_ANIMATION_EFFECT_OPTIONS} onChange={(value) => updateAnimation({ intro: value as ElementAnimationEffect })} />
      <div className="grid grid-cols-2 gap-2"><NumberField label="Delay (ms)" value={animation.delay} min={0} step={50} onChange={(value) => updateAnimation({ delay: value })} /><NumberField label="Duration (ms)" value={animation.duration} min={0} step={50} onChange={(value) => updateAnimation({ duration: value })} /></div>
      <SelectField label="Easing" value={animation.easing} options={ELEMENT_ANIMATION_EASING_OPTIONS} onChange={(value) => updateAnimation({ easing: value as ElementAnimationEasing })} />
      <p className="text-[10px] leading-4 text-white/35">Animations play when the page appears. Exit animation controls will return when page transitions can play them reliably.</p>
    </InspectorGroup></div> : null}
  </div>
}

function InspectorGroup({ label, children }: { label: string; children: React.ReactNode }) { return <section className="space-y-3"><h4 className="text-xs font-semibold text-white/75">{label}</h4>{children}</section> }
function Toggle({ label, active, onClick, children }: { label: string; active: boolean; onClick: () => void; children: React.ReactNode }) { return <button type="button" aria-label={label} aria-pressed={active} onClick={onClick} className={`h-11 text-sm font-semibold ${active ? "bg-violet-600 text-white" : "bg-black/20 text-white/55 hover:bg-white/5"}`}>{children}</button> }
function NumberField({ label, value, onChange, min, step }: { label: string; value: number; onChange: (value: number) => void; min?: number; step?: number }) { return <label className="text-[10px] text-white/40"><span>{label}</span><input className={`${FIELD} mt-1`} type="number" min={min} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} /></label> }
function ColorRow({ label, value, opacity, onColor, onOpacity }: { label: string; value: string; opacity: number; onColor: (value: string) => void; onOpacity: (value: number) => void }) { return <div className="grid grid-cols-[1fr_44px_74px] items-center gap-2 rounded-xl border border-white/10 bg-black/15 px-3 py-2"><span className="text-xs text-white/55">{label}</span><input aria-label={`${label} color`} type="color" value={value} onChange={(event) => onColor(event.target.value)} className="h-7 w-10 bg-transparent" /><label className="text-[10px] text-white/35"><input aria-label={`${label} opacity`} type="number" min="0" max="100" value={Math.round(opacity * 100)} onChange={(event) => onOpacity(Number(event.target.value) / 100)} className="w-full rounded-lg border border-white/10 bg-slate-950 px-2 py-1 text-xs text-white" /></label></div> }
function SelectField({ label, value, options, onChange }: { label: string; value: string; options: Array<{ label: string; value: string }>; onChange: (value: string) => void }) { return <label className="block text-[10px] text-white/40"><span>{label}</span><select className={`${FIELD} mt-1`} value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label> }
function RangeField({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (value: number) => void }) { return <label className="block text-[10px] text-white/45"><span>{label} · {value}</span><input aria-label={label} type="range" value={value} min={min} max={max} step={step} onChange={(event) => onChange(Number(event.target.value))} className="mt-2 w-full accent-violet-500" /></label> }
function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="flex items-center justify-between rounded-xl border border-white/10 bg-black/15 px-3 py-2 text-xs text-white/55"><span>{label}</span><input aria-label={`${label} color`} type="color" value={value} onChange={(event) => onChange(event.target.value)} className="h-8 w-10 bg-transparent" /></label> }
function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) { return <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/15 px-3 py-2 text-xs text-white/55"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />{label}</label> }
function FileField({ label, accept, onFile }: { label: string; accept: string; onFile: (file: File) => Promise<void> }) { return <label className="block text-[10px] text-white/45"><span>{label}</span><input type="file" accept={accept} onChange={(event) => { const file = event.target.files?.[0]; if (file) void onFile(file); event.target.value = "" }} className="mt-1 block w-full text-xs text-white/55 file:mr-2 file:rounded-lg file:border-0 file:bg-violet-500/20 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-violet-100" /></label> }
