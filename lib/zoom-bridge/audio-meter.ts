export function meterDb(amplitude: number) { return amplitude > 0 && Number.isFinite(amplitude) ? Math.max(-60, Math.min(0, 20 * Math.log10(amplitude))) : -60 }
export function validAudioMeter(value: unknown): value is { peak: number; rms: number; muted: boolean; sentAt: number } {
  if (!value || typeof value !== "object") return false
  const p = value as Record<string, unknown>
  return [p.peak, p.rms].every(v => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 1) && typeof p.muted === "boolean" && typeof p.sentAt === "number" && Number.isFinite(p.sentAt)
}
