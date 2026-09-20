const allowedOrigins = new Set([
  "https://letstrainonline.live",
  "https://www.letstrainonline.live",
])

export type PublicEventCacheProfile = "runtime" | "district-directory"

const sharedCacheDirectives: Record<PublicEventCacheProfile, string> = {
  runtime: "public, s-maxage=3, stale-while-revalidate=10",
  "district-directory": "public, s-maxage=60, stale-while-revalidate=300",
}

export function publicEventHeaders(
  request: Request,
  cacheProfile?: PublicEventCacheProfile,
) {
  const origin = request.headers.get("origin") || ""
  const allowedOrigin = allowedOrigins.has(origin) ? origin : "https://letstrainonline.live"

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": cacheProfile
      ? "public, max-age=0, must-revalidate"
      : "no-store, no-cache, must-revalidate",
    ...(cacheProfile
      ? { "Vercel-CDN-Cache-Control": sharedCacheDirectives[cacheProfile] }
      : {}),
    Vary: "Origin",
  }
}
