import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"
import { runInNewContext } from "node:vm"

const templateRoot = new URL("../public/templates/lets-live-agenda/", import.meta.url)

test("district visibility follows the fast runtime flag", async () => {
  const script = await readFile(new URL("app.js", templateRoot), "utf8")

  assert.match(
    script,
    /state\.district_directory_enabled === false \|\| !districtDirectoryAvailable/,
  )
  assert.match(script, /syncDistrictDirectoryVisibility\(\);/)
})

test("display sync bypasses an older district CDN object", async () => {
  const script = await readFile(new URL("app.js", templateRoot), "utf8")

  assert.match(script, /requestUrl\.searchParams\.set\("sync", normalizedSyncToken\)/)
  assert.match(script, /fetchDistrictDirectory\(nextState\.sync_token\)/)
})

test("district destinations use accessible platform marks and a motion-safe room gloss", async () => {
  const [script, styles] = await Promise.all([
    readFile(new URL("app.js", templateRoot), "utf8"),
    readFile(new URL("styles.css", templateRoot), "utf8"),
  ])

  assert.match(script, /createMeetingProviderBrand\(provider\)/)
  assert.match(script, /brand\.setAttribute\("aria-label", provider\.label\)/)
  assert.match(script, /wordmark\.src = "zoom-wordmark\.png"/)
  assert.match(script, /link\.className = "district-room-link"/)
  assert.match(script, /copyButton\.className = "district-room-copy"/)
  assert.match(styles, /@keyframes district-room-gloss/)
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/)
})

test("room URL copying falls back when the Clipboard API is unavailable or denied", async () => {
  const script = await readFile(new URL("app.js", templateRoot), "utf8")
  const copyFunction = script.slice(script.indexOf("  async function copyRoomUrl(url) {"), script.indexOf("  function renderDistrictDestination(node) {"))
  const selected: string[] = []
  const field = {
    value: "",
    style: { position: "", opacity: "" },
    setAttribute() {},
    select() { selected.push(this.value) },
    remove() {},
  }
  const context = {
    navigator: { clipboard: { writeText: async () => { throw new Error("Denied") } } },
    document: {
      createElement: () => field,
      body: { append() {} },
      execCommand: (command: string) => command === "copy",
    },
  }
  const copied = await runInNewContext(`${copyFunction}\ncopyRoomUrl("https://example.com/room")`, context)
  assert.equal(copied, true)
  assert.deepEqual(selected, ["https://example.com/room"])
})

test("selecting linked groups and districts reveals their room links", async () => {
  const script = await readFile(new URL("app.js", templateRoot), "utf8")
  const destination = script.slice(script.indexOf("  function renderDistrictDestination(node) {"), script.indexOf("  function renderDistrictDirectory(query = \"\") {"))
  const directory = script.slice(script.indexOf("  function renderDistrictDirectory(query = \"\") {"), script.indexOf("  async function fetchDistrictDirectory("))

  class Element {
    tag: string
    children: Element[] = []
    className = ""
    dataset: Record<string, string> = {}
    hidden = false
    textContent = ""
    href = ""
    disabled = false
    listeners: Record<string, () => void | Promise<void>> = {}
    selected = false
    classList = {
      add: (name: string) => { if (name === "is-selected") this.selected = true },
      remove: (name: string) => { if (name === "is-selected") this.selected = false },
    }

    constructor(tag: string) { this.tag = tag }
    append(...children: Element[]) { this.children.push(...children) }
    replaceChildren(...children: Element[]) { this.children = children }
    setAttribute() {}
    addEventListener(name: string, listener: () => void | Promise<void>) { this.listeners[name] = listener }
    click() { return this.listeners.click?.() }
    querySelectorAll() { return walk(this).filter((element) => element.tag === "button" && element.selected) }
    scrollIntoView() {}
  }

  function walk(element: Element): Element[] {
    return [element, ...element.children.flatMap(walk)]
  }

  const tree = new Element("nav")
  const detail = new Element("aside")
  const nodes = [
    { id: "other", parent_id: null, node_type: "other", name: "Other", sort_order: 0 },
    { id: "msl", parent_id: "other", node_type: "group", name: "MSL", meeting_link: "https://example.com/msl", sort_order: 0 },
    { id: "virtual", parent_id: "other", node_type: "group", name: "Virtual Team", meeting_link: null, sort_order: 1 },
    { id: "east", parent_id: null, node_type: "zone", name: "East", sort_order: 1 },
    { id: "region", parent_id: "east", node_type: "region", name: "Mid-Atlantic", sort_order: 0 },
    { id: "baltimore", parent_id: "region", node_type: "district", name: "Baltimore", meeting_link: "https://example.com/baltimore", sort_order: 0 },
  ]
  const copiedUrls: string[] = []
  const context = {
    document: { createElement: (tag: string) => new Element(tag) },
    els: { districtDirectoryTree: tree, districtDirectoryDetail: detail },
    districtDirectoryNodes: nodes,
    window: { matchMedia: () => ({ matches: false }) },
    safeMeetingUrl: (value: string | null) => value?.startsWith("https://") ? value : "",
    copyRoomUrl: async (url: string) => { copiedUrls.push(url); return true },
    resolveMeetingProvider: () => ({ label: "Meeting" }),
    createMeetingProviderBrand: () => new Element("brand"),
  }
  runInNewContext(`${destination}\n${directory}\nrenderDistrictDirectory();`, context)

  function clickNode(name: string) {
    const button = walk(tree).find((element) => element.tag === "button" && walk(element).some((child) => child.tag === "strong" && child.textContent === name))
    assert.ok(button, `${name} appears in the tree`)
    button.click()
  }

  clickNode("MSL")
  assert.equal(walk(detail).find((element) => element.tag === "a")?.href, "https://example.com/msl")
  assert.ok(walk(detail).some((element) => element.textContent === "Open group room ↗"))
  const groupCopy = walk(detail).find((element) => element.tag === "button" && element.className === "district-room-copy")
  assert.ok(groupCopy)
  await groupCopy.click()
  assert.equal(groupCopy.textContent, "Copied!")
  assert.deepEqual(copiedUrls, ["https://example.com/msl"])

  clickNode("Baltimore")
  assert.equal(walk(detail).find((element) => element.tag === "a")?.href, "https://example.com/baltimore")
  assert.ok(walk(detail).some((element) => element.textContent === "Open district room ↗"))
  const districtCopy = walk(detail).find((element) => element.tag === "button" && element.className === "district-room-copy")
  assert.ok(districtCopy)
  await districtCopy.click()
  assert.deepEqual(copiedUrls, ["https://example.com/msl", "https://example.com/baltimore"])

  clickNode("Virtual Team")
  assert.equal(walk(detail).find((element) => element.tag === "a"), undefined)
  assert.equal(walk(detail).find((element) => element.className === "district-room-copy"), undefined)
  assert.ok(walk(detail).some((element) => element.textContent.includes("does not have a meeting link yet")))
})
