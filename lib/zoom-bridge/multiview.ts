export function parseMonitorRequest(value: unknown): { ids: string[]; expanded: boolean } {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid monitor request")
  const { ids, expanded } = value as { ids?: unknown; expanded?: unknown }
  if (!Array.isArray(ids) || !ids.length || ids.length > 9 || typeof expanded !== "boolean" || (expanded && ids.length !== 1) || ids.some(id => typeof id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id)) || new Set(ids).size !== ids.length) throw new Error("Invalid monitor selection")
  return { ids, expanded }
}
export function monitorPage<T>(items: T[], requested: number) {
  const pages = Math.max(1, Math.ceil(items.length / 9))
  const page = Math.max(0, Math.min(pages - 1, Math.floor(requested)))
  return { page, pages, items: items.slice(page * 9, (page + 1) * 9) }
}
