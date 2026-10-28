import type { JsonObject, Composition, ProductionLayer, PlaybackIntent } from '../../../lib/production/contracts.ts'
export const BLENDS: string[]
export function finite(value: unknown, fallback: number, min?: number, max?: number): number
export function layout(props: JsonObject): { x: number; y: number; width: number; height: number; scale: number; rotation: number; opacity: number; dx: number; dy: number; radius: number; blur: number; glow: number; shadow: number; blend: string; hidden: boolean }
export function fitRect(sourceWidth: number, sourceHeight: number, width: number, height: number, fit?: string): { x: number; y: number; width: number; height: number }
export function playbackSeconds(intent: PlaybackIntent | undefined, nowMs: number, duration: number): number
export function color(value: unknown, fallback?: string): string
export function orderedLayers(composition: Composition): ProductionLayer[]
