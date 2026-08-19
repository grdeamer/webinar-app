const allowedOrigins = new Set([
  "https://letstrainonline.live",
  "https://www.letstrainonline.live",
])

export function publicEventHeaders(request: Request) {
  const origin = request.headers.get("origin") || ""
  const allowedOrigin = allowedOrigins.has(origin) ? origin : "https://letstrainonline.live"

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "no-store, no-cache, must-revalidate",
    Vary: "Origin",
  }
}

