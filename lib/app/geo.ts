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

function mapCountryToRegion(country: string | null): string | null {
  if (!country) return null

  const normalized = country.toLowerCase()

  if (
    [
      "united states",
      "canada",
      "mexico",
      "greenland",
    ].includes(normalized)
  ) {
    return "North America"
  }

  if (
    [
      "brazil",
      "argentina",
      "chile",
      "colombia",
      "peru",
      "uruguay",
      "paraguay",
      "bolivia",
      "ecuador",
      "venezuela",
    ].includes(normalized)
  ) {
    return "South America"
  }

  if (
    [
      "united kingdom",
      "ireland",
      "france",
      "germany",
      "italy",
      "spain",
      "portugal",
      "netherlands",
      "belgium",
      "switzerland",
      "austria",
      "sweden",
      "norway",
      "finland",
      "denmark",
      "poland",
      "czech republic",
      "greece",
      "romania",
      "hungary",
      "ukraine",
    ].includes(normalized)
  ) {
    return "Europe"
  }

  if (
    [
      "south africa",
      "nigeria",
      "kenya",
      "egypt",
      "morocco",
      "ghana",
      "ethiopia",
      "tanzania",
      "uganda",
      "algeria",
    ].includes(normalized)
  ) {
    return "Africa"
  }

  if (
    [
      "united arab emirates",
      "saudi arabia",
      "qatar",
      "kuwait",
      "oman",
      "israel",
      "jordan",
      "lebanon",
      "iraq",
      "iran",
      "turkey",
    ].includes(normalized)
  ) {
    return "Middle East"
  }

  if (
    [
      "china",
      "japan",
      "south korea",
      "india",
      "singapore",
      "australia",
      "new zealand",
      "thailand",
      "vietnam",
      "malaysia",
      "indonesia",
      "philippines",
    ].includes(normalized)
  ) {
    return "Asia Pacific"
  }

  return null
}

export async function lookupGeoFromIp(ip: string | null): Promise<GeoResult> {
  if (!ip) {
    return {
      region: null,
      country: null,
      city: null,
      lat: null,
      lng: null,
      source: null,
    }
  }

  try {
    const res = await fetch(`http://ip-api.com/json/${encodeURIComponent(ip)}`, {
      cache: "no-store",
    })

    const data = (await res.json().catch((): null => null)) as
      | {
          status?: string
          country?: unknown
          city?: unknown
          lat?: unknown
          lon?: unknown
        }
      | null

    if (!res.ok || !data || data.status !== "success") {
      return {
        region: null,
        country: null,
        city: null,
        lat: null,
        lng: null,
        source: null,
      }
    }

    const country = normalizeText(data.country)
    const city = normalizeText(data.city)

    return {
      region: mapCountryToRegion(country),
      country,
      city,
      lat: normalizeNumber(data.lat),
      lng: normalizeNumber(data.lon),
      source: "ip-api",
    }
  } catch {
    return {
      region: null,
      country: null,
      city: null,
      lat: null,
      lng: null,
      source: null,
    }
  }
}