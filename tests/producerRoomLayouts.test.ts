import assert from 'node:assert/strict'
import test from 'node:test'
import {PRODUCER_ROOM_LAYOUTS,parseProducerRoomLayout,producerLayoutStorageKey,producerMonitorColumns} from '../lib/producer/roomLayouts.ts'
test('all three distinct producer layouts keep Mission Control reserved for the dashboard',()=>{
 assert.deepEqual(PRODUCER_ROOM_LAYOUTS.map(x=>x.name),['Flight Deck','Launchpad','Spotlight'])
 for(const option of PRODUCER_ROOM_LAYOUTS)assert.equal(parseProducerRoomLayout(option.id),option.id)
 for(const bad of [null,undefined,'old-name','mission-control',{},42])assert.equal(parseProducerRoomLayout(bad),'flight-deck')
})
test('saved layout is scoped per verified user and missing identity cannot share a saved preference',()=>{
 assert.notEqual(producerLayoutStorageKey('owner-one'),producerLayoutStorageKey('owner-two'))
 assert.equal(producerLayoutStorageKey(),null)
 assert.equal(producerLayoutStorageKey(''),null)
 assert.equal(producerLayoutStorageKey('unsafe/value'),null)
 assert.equal(producerLayoutStorageKey('owner-one'),'jupiter.producer.layout.v1:owner-one')
})
test('Spotlight reverses monitor order and keeps Program larger while the splitter remains bounded',()=>{
 assert.match(producerMonitorColumns('flight-deck',50),/50fr/)
 assert.match(producerMonitorColumns('launchpad',50),/50fr/)
 assert.match(producerMonitorColumns('spotlight',50),/65fr.*35fr/)
 assert.match(producerMonitorColumns('flight-deck',200),/68fr.*32fr/)
})
