export const PRODUCER_MAX_BLOCKS = 200
export const PRODUCER_MAX_COMPOSITION_BYTES = 2_000_000

export function normalizeProducerBlocks(input: unknown): unknown[] | null {
  if (!Array.isArray(input)) return null
  return input.slice(0, PRODUCER_MAX_BLOCKS)
}

export function producerCompositionSize(blocks: unknown[]): number {
  return new TextEncoder().encode(JSON.stringify(blocks)).byteLength
}

export function isProducerCompositionTooLarge(blocks: unknown[]): boolean {
  return producerCompositionSize(blocks) > PRODUCER_MAX_COMPOSITION_BYTES
}

export function parseExpectedProducerVersion(input: unknown): number | null {
  if (input === null || input === undefined || input === "") return null
  const value = Number(input)
  return Number.isSafeInteger(value) && value >= 0 ? value : null
}

export function isProducerConcurrencyError(error: {
  code?: string | null
  message?: string | null
}): boolean {
  return (
    error.code === "40001" ||
    Boolean(error.message?.toLowerCase().includes("another console"))
  )
}

export function isTerminalEgressStatus(status: number): boolean {
  return status === 3 || status === 4 || status === 5 || status === 6
}

export function egressStatusLabel(status: number): string {
  switch (status) {
    case 0:
      return "starting"
    case 1:
      return "active"
    case 2:
      return "ending"
    case 3:
      return "complete"
    case 4:
      return "failed"
    case 5:
      return "aborted"
    case 6:
      return "limit_reached"
    default:
      return "unknown"
  }
}
