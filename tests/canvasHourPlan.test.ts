import test from 'node:test'
import assert from 'node:assert/strict'
import {CANVAS_HOUR_SCHEDULE,canvasHourLayout,canvasColorsMatch,canvasHourColors} from '../lib/production/canvasHourPlan.ts'
import {SOAK_FAULTS} from '../lib/production/haSoakPlan.ts'
const assets={video:'blob:video',slides:'blob:slides',audio:'blob:audio',green:'blob:green',orange:'blob:orange'}
test('all 13 hour phases take a complete four-source canvas with looping audio and video',()=>{
 assert.equal(CANVAS_HOUR_SCHEDULE.length,13)
 for(const step of CANVAS_HOUR_SCHEDULE){const blocks=canvasHourLayout(step.phase,assets);assert.deepEqual(blocks.map(block=>block.type),['video','pdf','image','audio']);assert.equal(blocks[0].loop,true);assert.equal(blocks[3].loop,true);assert.equal(blocks[1].pdfPage,step.phase==='slide2'?2:1)}
 assert.ok(CANVAS_HOUR_SCHEDULE.some(step=>step.transition==='fade'))
 for(const fault of SOAK_FAULTS)assert.ok(CANVAS_HOUR_SCHEDULE.every(step=>Math.abs(step.minute-fault.atMs/60000)>=2),'TAKE schedule must not overlap fault injection')
})
test('output proof requires the slide and graphic colors, not just a running video counter',()=>{
 for(const phase of ['video','slide1','slide2','audio'] as const){assert.equal(canvasColorsMatch(canvasHourColors(phase),phase),true);assert.equal(canvasColorsMatch([0,0,0,0,0,0],phase),false);assert.equal(canvasColorsMatch([13,41,56],phase),false)}
 assert.equal(canvasColorsMatch(canvasHourColors('slide1'),'video'),false)
})
