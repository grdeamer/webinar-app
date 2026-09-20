import assert from "node:assert/strict"
import test from "node:test"
import { publicEventHeaders } from "../lib/publicEventCors.ts"

const request = new Request("https://app.jupiter.events/api/public/events/example/runtime", {
  headers: { Origin: "https://letstrainonline.live" },
})

test("runtime responses use a brief shared CDN cache", () => {
  const headers = publicEventHeaders(request, "runtime")
  assert.equal(headers["Cache-Control"], "public, max-age=0, must-revalidate")
  assert.equal(
    headers["Vercel-CDN-Cache-Control"],
    "public, s-maxage=3, stale-while-revalidate=10",
  )
})

test("district directory responses use a one-minute shared CDN cache", () => {
  const headers = publicEventHeaders(request, "district-directory")
  assert.equal(
    headers["Vercel-CDN-Cache-Control"],
    "public, s-maxage=60, stale-while-revalidate=300",
  )
})

test("private public-event actions remain uncacheable", () => {
  const headers = publicEventHeaders(request)
  assert.equal(headers["Cache-Control"], "no-store, no-cache, must-revalidate")
  assert.equal("Vercel-CDN-Cache-Control" in headers, false)
})
