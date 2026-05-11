export type LocalPdfDeck = {
  name: string
  pageCount: number
  src?: string | null
}

export async function estimatePdfPageCount(file: File): Promise<number> {
  const text = new TextDecoder("latin1").decode(await file.arrayBuffer())
  const matches = text.match(/\/Type\s*\/Page\b/g)

  return Math.max(1, matches?.length ?? 1)
}