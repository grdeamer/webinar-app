import assert from "node:assert/strict"
import test from "node:test"

import { lookupGeoFromHeaders } from "../lib/app/geo.ts"

test("reads approximate Vercel location without browser GPS", () => {
  const headers = new Headers({
    "x-vercel-ip-city": "Montr%C3%A9al",
    "x-vercel-ip-country": "CA",
    "x-vercel-ip-country-region": "QC",
    "x-vercel-ip-continent": "NA",
    "x-vercel-ip-latitude": "45.5019",
    "x-vercel-ip-longitude": "-73.5674",
  })

  assert.deepEqual(lookupGeoFromHeaders(headers), {
    region: "QC",
    country: "Canada",
    city: "Montréal",
    lat: 45.5019,
    lng: -73.5674,
    source: "vercel-ip",
  })
})

test("does not invent coordinates when location headers are absent", () => {
  assert.deepEqual(lookupGeoFromHeaders(new Headers()), {
    region: null,
    country: null,
    city: null,
    lat: null,
    lng: null,
    source: null,
  })
})
