import test from "node:test"
import assert from "node:assert/strict"
import { parseVideoSettings } from "../lib/zoom-bridge/video-settings.ts"
test("satellite video settings accept only supported profiles", () => {
 for (const quality of ["auto", "720p", "1080p"]) for (const aspect of ["original", "16:9", "4:3"]) assert.deepEqual(parseVideoSettings({ quality, aspect }), { quality, aspect })
 for (const value of [null, [], {}, { quality: "4k", aspect: "original" }, { quality: "720p", aspect: "stretch" }]) assert.throws(() => parseVideoSettings(value))
})
