import assert from "node:assert/strict"
import test from "node:test"
import { publicIpv4 } from "../lib/zoom-bridge/public-ip.ts"
test("encoder allowlist accepts a single public IPv4", () => {
  assert.equal(publicIpv4(" 72.92.10.150 "), "72.92.10.150")
})
test("encoder allowlist rejects local addresses, ranges, URLs, and non-IP input", () => {
  for (const ip of ["10.0.0.1", "127.0.0.1", "192.168.0.1", "172.16.0.1", "169.254.1.1", "100.64.0.1", "0.0.0.0/0", "72.92.10.150/32", "https://example.com", "::1", "224.0.0.1", "192.0.2.1", "198.51.100.1", "203.0.113.1", "999.0.0.1"]) assert.throws(() => publicIpv4(ip), ip)
})

test("firewall endpoint requires admin authorization and an explicit same-origin confirmation", async () => {
  const { readFile } = await import("node:fs/promises")
  const route = await readFile(new URL("../app/api/admin/zoom-bridge/encoder-ip/route.ts", import.meta.url), "utf8")
  assert.match(route, /admin\.profile\.role !== "admin"/)
  assert.match(route, /request\.headers\.get\("origin"\) !== new URL\(request\.url\)\.origin/)
  assert.match(route, /body\.confirm !== true/)
  const policy = JSON.parse(await readFile(new URL("../docs/jupiter-io/firewall-role-policy.json", import.meta.url), "utf8"))
  assert.deepEqual(policy.Statement.map((s: {Action:string}) => s.Action), ["lightsail:GetInstancePortStates", "lightsail:OpenInstancePublicPorts"])
  assert.match(policy.Statement[1].Resource, /Instance\/10da764f-e02d-42ce-ada6-0d9338c35289$/)
})
