export function newSatelliteNames(existingNames: readonly string[], quantity: number): string[] {
  const available = Math.max(0, 50 - existingNames.length)
  const count = Math.min(available, Math.max(0, Math.floor(quantity)))
  const used = new Set(existingNames.map(name => name.toLowerCase()))
  const names: string[] = []
  let number = existingNames.reduce((highest, name) => {
    const match = name.match(/\bsatellite\s+(\d+)$/i)
    return Math.max(highest, match ? Number(match[1]) : 0)
  }, 0) + 1
  while (names.length < count) {
    const name = `Jupiter Satellite ${String(number++).padStart(2, "0")}`
    if (!used.has(name.toLowerCase())) names.push(name)
  }
  return names
}
