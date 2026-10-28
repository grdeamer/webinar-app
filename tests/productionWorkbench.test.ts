import assert from "node:assert/strict"
import { once } from "node:events"
import { request } from "node:http"
import test from "node:test"
import { LocalSqliteProductionStore } from "../lib/production/localSqliteStore.ts"
import { createLocalWorkbench, LOCAL_SCOPE, seedLocalProduction } from "../lib/production/localWorkbench.ts"

test("local workbench serves state-only controls, preserves revisions and refuses cross-origin writes", async () => {
  const store = new LocalSqliteProductionStore(":memory:"); seedLocalProduction(store)
  const server = createLocalWorkbench(store)
  server.listen(0, "127.0.0.1"); await once(server, "listening")
  const address = server.address()
  assert.ok(address && typeof address !== "string")
  const base = `http://127.0.0.1:${address.port}`
  try {
    const index = await fetch(base)
    assert.equal(index.status, 200)
    assert.match(await index.text(), /state-only workbench/)
    assert.match(index.headers.get("content-security-policy") ?? "", /connect-src 'self'/)
    const { state, engine } = await (await fetch(`${base}/api/state`)).json()
    assert.equal(state.revision, 3); assert.equal(engine, null)
    const body = JSON.stringify({ schemaVersion: 1, scope: LOCAL_SCOPE, commandId: "one", expectedRevision: 3, command: { type: "TAKE", transition: { type: "cut", durationMs: 0 } } })
    const headers = { "Content-Type": "application/json", "X-Jupiter-Local": "phase1", "X-Console-Id": "console-a" }
    assert.equal((await fetch(`${base}/api/commands`, { method: "POST", headers: { ...headers, Origin: "https://attacker.invalid" }, body })).status, 403)
    assert.equal((await fetch(`${base}/api/commands`, { method: "POST", headers: { "Content-Type": "application/json" }, body })).status, 403)
    const committed = await (await fetch(`${base}/api/commands`, { method: "POST", headers, body })).json()
    assert.equal(committed.receipt.revision, 4)
    assert.equal(committed.currentState.program.composition.layers[0].sourceId, "camera-a")
    assert.equal(committed.engine, null)
    const conflict = await fetch(`${base}/api/commands`, { method: "POST", headers, body: body.replace('"one"', '"another"') })
    assert.equal(conflict.status, 409)
    const history = await (await fetch(`${base}/api/commands?afterRevision=3`)).json()
    assert.equal(history.commands.length, 1)
    const hostileHost = await new Promise<number>(resolve => {
      const req = request(base, { headers: { Host: "attacker.invalid" } }, response => { response.resume(); resolve(response.statusCode ?? 0) })
      req.end()
    })
    assert.equal(hostileHost, 403)
    seedLocalProduction(store)
    assert.equal(store.read(LOCAL_SCOPE).revision, 4)
  } finally {
    server.closeAllConnections()
    await new Promise<void>(resolve => server.close(() => resolve()))
    store.close()
  }
})
