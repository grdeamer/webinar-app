/** Test-fixture color classification after several lossy video hops. Reject slates and ambiguous colors. */
export function classifySourceColor(red, green, blue) {
  if (![red, green, blue].every(value => Number.isInteger(value) && value >= 0 && value <= 255)) return null
  const a = Math.abs(red - 7) + Math.abs(green - 59) + Math.abs(blue - 96)
  const b = Math.abs(red - 88) + Math.abs(green - 38) + Math.abs(blue - 71)
  if (Math.min(a, b) > 70 || Math.abs(a - b) < 30) return null
  return a < b ? 'camera-a' : 'camera-b'
}
