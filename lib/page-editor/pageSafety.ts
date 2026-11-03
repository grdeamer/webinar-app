export type PageSafetyRow = { page_key: string; sections?: unknown; elements?: unknown; page_theme?: unknown; published_document?: unknown; document_revision?: number }
export function assetReferencePages(rows: PageSafetyRow[], url: string): string[] {
  if (!url) return []
  return rows.filter(row => JSON.stringify([row.sections, row.elements, row.page_theme, row.published_document]).includes(url)).map(row => row.page_key)
}
export function publicationStatus(row: PageSafetyRow | undefined, status?: string): string {
  if (!row || status !== 'published' || !row.published_document || typeof row.published_document !== 'object') return 'Draft'
  const published = row.published_document as { revision?: number }
  if (!Number.isSafeInteger(published.revision)) return 'Draft'
  return published.revision === row.document_revision ? 'Published' : 'Unpublished changes'
}
