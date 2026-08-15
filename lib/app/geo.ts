export type GeoResult = {
  region: string | null
  country: string | null
  city: string | null
  lat: number | null
  lng: number | null
  source: string | null
}

function normalizeText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function normalizeNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

const continents: Record<string, string> = {
  AF: "Africa",
  AN: "Antarctica",
  AS: "Asia",
  EU: "Europe",
  NA: "North America",
  OC: "Oceania",
  SA: "South America",
}

function decodeHeader(value: string | null): string | null {
  if (!value) return null
  try {
    return normalizeText(decodeURIComponent(value))
  } catch {
    return normalizeText(value)
  }
}

function countryName(countryCode: string | null): string | null {
  if (!countryCode) return null
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(countryCode) ?? countryCode
  } catch {
    return countryCode
  }
}

export function lookupGeoFromHeaders(headers: Headers): GeoResult {
  const countryCode = normalizeText(headers.get("x-vercel-ip-country"))
  const subdivision = decodeHeader(headers.get("x-vercel-ip-country-region"))
  const continentCode = normalizeText(headers.get("x-vercel-ip-continent"))
  const latitudeHeader = headers.get("x-vercel-ip-latitude")
  const longitudeHeader = headers.get("x-vercel-ip-longitude")
  const lat = latitudeHeader ? Number(latitudeHeader) : null
  const lng = longitudeHeader ? Number(longitudeHeader) : null

  return {
    region: subdivision || (continentCode ? continents[continentCode] ?? null : null),
    country: countryName(countryCode),
    city: decodeHeader(headers.get("x-vercel-ip-city")),
    lat: normalizeNumber(lat),
    lng: normalizeNumber(lng),
    source: countryCode || subdivision || continentCode ? "vercel-ip" : null,
  }
}
