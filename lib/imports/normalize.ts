export function normalizeString(v: unknown) {
  return typeof v === "string" ? v.trim() : String(v ?? "").trim()
}

export function normalizeNullableString(v: unknown) {
  const s = normalizeString(v)
  return s ? s : null
}

export function normalizeEmail(v: unknown) {
  return normalizeString(v).toLowerCase()
}

export function normalizeSessionCode(v: unknown) {
  return normalizeString(v).toUpperCase()
}