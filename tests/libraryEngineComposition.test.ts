import assert from 'node:assert/strict'
import test from 'node:test'
import {libraryEngineComposition} from '../lib/producer/libraryEngineComposition.ts'

test('engine composition preserves original room placement, visibility and visual effects without persisting file or participant credentials',()=>{
 const composition=libraryEngineComposition({id:'slide-2',type:'pdf',src:'blob:private-file',pdfPage:2,x:20,y:40,width:400,height:225,zIndex:3,rotation:12,opacity:.7,hidden:true,borderRadius:8,assignedParticipantId:'private-presenter',assignedTrackSid:'private-track'},'camera-b')
 assert.deepEqual(composition.layers[0],{id:'library-input',kind:'camera',sourceId:'camera-b',props:{x:20,y:40,width:400,height:225,fit:'contain',borderRadius:8,shadowIntensity:0,zIndex:3,opacity:.7,rotation:12,hidden:true}})
 assert.doesNotMatch(JSON.stringify(composition),/blob:|private-|pdfPage/)
})
