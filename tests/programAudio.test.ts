import assert from "node:assert/strict"
import test from "node:test"
import { readFileSync } from "node:fs"
import { runInNewContext } from "node:vm"
import ts from "typescript"
import { programAudioAllows, selectProgramAudio } from "../lib/live/programAudio.ts"

test("only committed camera blocks open microphones, never backstage or hidden sources", () => {
  const selection = selectProgramAudio({ is_live: true,
    stage_participant_ids: ["backstage"], primary_participant_id: "fallback",
    program_blocks: [
      { type: "camera", assignedParticipantId: "speaker" },
      { type: "camera_slot", assignedParticipantId: "second" },
      { type: "camera", assignedParticipantId: "hidden", hidden: true },
      { type: "camera", assignedParticipantId: "transparent", opacity: 0 },
    ],
  })
  assert.equal(programAudioAllows(selection, "speaker", "microphone"), true)
  assert.equal(programAudioAllows(selection, "second", "microphone"), true)
  for (const identity of ["backstage", "fallback", "hidden", "transparent"]) {
    assert.equal(programAudioAllows(selection, identity, "microphone"), false)
  }
  assert.equal(programAudioAllows(selection, "speaker", "screen_share_audio"), false)
  assert.equal(programAudioAllows(selection, "speaker", "unknown"), false)
})

test("screen audio requires a Program screen source and does not open its microphone", () => {
  const selection = selectProgramAudio({ is_live: true, screen_share_participant_id: "screen-presenter",
    program_blocks: [{ type: "screen_share" }],
  })
  assert.equal(programAudioAllows(selection, "screen-presenter", "screen_share_audio"), true)
  assert.equal(programAudioAllows(selection, "screen-presenter", "microphone"), false)
  assert.equal(programAudioAllows(selection, "backstage", "screen_share_audio"), false)
})

test("taking media-only Program closes microphones even when stage selections remain", () => {
  const selection = selectProgramAudio({ is_live: true, primary_participant_id: "speaker",
    stage_participant_ids: ["speaker"], program_blocks: [{ type: "image" }, { type: "video" }],
  })
  assert.equal(selection.microphones.size, 0)
  assert.equal(selection.screenShares.size, 0)
})

test("Off Air and missing Program deny all audio despite retained composition", () => {
  for (const state of [null, { is_live: false, primary_participant_id: "speaker",
    program_blocks: [{ type: "camera", assignedParticipantId: "speaker" }],
  }]) {
    const selection = selectProgramAudio(state)
    assert.equal(selection.microphones.size, 0)
    assert.equal(selection.screenShares.size, 0)
  }
})

test("legacy layouts select solo speaker, panel, and screen audio explicitly", () => {
  const solo = selectProgramAudio({ is_live: true, layout: "solo", primary_participant_id: "speaker", stage_participant_ids: ["speaker", "other"] })
  assert.deepEqual([...solo.microphones], ["speaker"])
  const grid = selectProgramAudio({ is_live: true, layout: "grid", stage_participant_ids: ["a", "b"] })
  assert.deepEqual([...grid.microphones], ["a", "b"])
  const screen = selectProgramAudio({ is_live: true, layout: "screen_speaker", primary_participant_id: "speaker", screen_share_participant_id: "slides" })
  assert.deepEqual([...screen.microphones], ["speaker"])
  assert.deepEqual([...screen.screenShares], ["slides"])
})

test("audience renderer unsubscribes backstage audio and removes it from playback on TAKE", () => {
  class Publication {
    kind: string
    source: string
    trackSid: string
    isDesired = true
    constructor(kind: string, source: string, sid: string) { this.kind = kind; this.source = source; this.trackSid = sid }
    setSubscribed(value: boolean) { this.isDesired = value }
  }
  const publications = [
    new Publication("audio", "microphone", "mic-one"),
    new Publication("audio", "microphone", "mic-two"),
    new Publication("audio", "screen_share_audio", "slides-audio"),
    new Publication("audio", "unknown", "unlabelled"),
    new Publication("video", "camera", "camera"),
  ]
  const identities = ["one", "two", "two", "one", "one"]
  const refs = publications.map((publication, index) => ({ publication, participant: { identity: identities[index], isLocal: false } }))
  const source = readFileSync(new URL("../components/live/ProgramAudioRenderer.tsx", import.meta.url), "utf8")
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText
  type Element = { type: unknown; props: { children?: Element[] } }
  const jsx = (type: unknown, props: Element["props"]) => ({ type, props })
  const effects: (() => void)[] = []
  const audioComponent = Symbol("AudioTrack")
  const dependencies: Record<string, unknown> = {
    react: { useEffect: (effect: () => void) => effects.push(effect), useMemo: (fn: () => unknown) => fn() },
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "@livekit/components-react": { AudioTrack: audioComponent, useTracks: (_sources: unknown, options: { onlySubscribed: boolean }) => { assert.equal(options.onlySubscribed, false); return refs } },
    "livekit-client": { RemoteTrackPublication: Publication, Track: { Kind: { Audio: "audio", Video: "video" }, Source: {} } },
    "@/lib/live/programAudio": { selectProgramAudio, programAudioAllows },
  }
  const exports = {} as { default: (props: { state: Parameters<typeof selectProgramAudio>[0] }) => Element }
  runInNewContext(compiled, { exports, require: (name: string) => { assert.ok(Object.hasOwn(dependencies, name)); return dependencies[name] } })
  for (const speaker of ["one", "two"]) {
    const tree = exports.default({ state: { is_live: true, program_blocks: [{ type: "camera", assignedParticipantId: speaker }] } })
    const rendered = tree.props.children ?? []
    assert.equal(rendered.length, 1)
    assert.equal(rendered[0].type, audioComponent)
    effects.splice(0).forEach(effect => effect())
    assert.deepEqual(publications.map(pub => pub.isDesired), [speaker === "one", speaker === "two", false, false, true])
  }
})
