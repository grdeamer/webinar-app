import assert from 'node:assert/strict'
import test from 'node:test'
import {engineStopEvent,ENGINE_STOP_REASONS} from '../lib/production/engineStopReason.ts'
import {readFileSync} from 'node:fs'

test('engine shutdown evidence distinguishes every stop path with only fixed metadata',()=>{
 const run='d86db408-4bb5-44b5-aeca-507a656d00bf'
 for(const reason of ENGINE_STOP_REASONS)assert.deepEqual(engineStopEvent(reason,run,'requested',false,123),{event:'producer-engine-stop',reason,runId:run,phase:'requested',success:false,atMs:123})
 assert.throws(()=>engineStopEvent('private-secret' as never,run,'requested',false),/Invalid/)
 assert.throws(()=>engineStopEvent('deadline','private-secret','requested',false),/Invalid/)
})
test('maintenance sequencing preserves normal updates and finishes them before both media services',()=>{
 const unit=readFileSync(new URL('../tools/production-ec2/jupiter-producer-maintenance.service',import.meta.url),'utf8')
 assert.match(unit,/Wants=.*apt-daily\.service apt-daily-upgrade\.service/)
 assert.match(unit,/After=.*apt-daily\.service apt-daily-upgrade\.service/)
 assert.match(unit,/Before=jupiter-livekit\.service jupiter-producer\.service/)
 assert.doesNotMatch(unit,/mask|disable|ConditionPathExists=!|APT::Periodic/)
})
