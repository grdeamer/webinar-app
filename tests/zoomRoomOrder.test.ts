import test from "node:test"
import assert from "node:assert/strict"
import { orderRooms } from "../lib/zoom-bridge/room-order.ts"

test("satellite order survives reversed polling responses and status changes", () => {
  const first = [{ id: "b", name: "Satellite 02", running: false }, { id: "a", name: "Jupiter Satellite 01", running: true }]
  const next = [...first].reverse().map(room => ({ ...room, running: !room.running }))
  assert.deepEqual(orderRooms(first).map(r => r.id), ["a", "b"])
  assert.deepEqual(orderRooms(next).map(r => r.id), ["a", "b"])
  assert.equal(first[0].id, "b")
})

test("numeric names sort naturally and duplicate names have a fixed tie breaker", () => {
  const rooms = [{ id: "b", name: "Satellite 2" }, { id: "c", name: "Satellite 10" }, { id: "a", name: "satellite 2" }]
  assert.deepEqual(orderRooms(rooms).map(r => r.id), ["a", "b", "c"])
  assert.deepEqual(orderRooms([...rooms].reverse()).map(r => r.id), ["a", "b", "c"])
})
