import test from 'node:test'
import assert from 'node:assert/strict'
import {mixedHourApproval} from '../lib/production/mixedHourProfile.ts'
import {PRODUCER_EC2_SESSION_MS} from '../lib/production/ec2Lifecycle.ts'
test('mixed hour requires an exact approved scope, fixed spending/traffic bounds and two independent deadlines',()=>{
 const now=1000000000000,scope={eventId:'event',sessionId:'session'},value={kind:'original-room-mixed-hour',approvalId:'d86db408-4bb5-44b5-aeca-507a656d00bf',...scope,cloudStopAtMs:now+70*60000,mediaStopAtMs:now+68*60000,approvedBudgetUsd:2,networkLimitBytes:4000000000,recording:false}
 assert.equal(mixedHourApproval(value,scope,now).recording,false)
 assert.equal(mixedHourApproval({...value,networkLimitBytes:2000000000},scope,now).networkLimitBytes,2000000000)
 for(const patch of [{recording:true},{approvedBudgetUsd:3},{networkLimitBytes:5000000000},{eventId:'other'},{mediaStopAtMs:now+71*60000},{cloudStopAtMs:now+71*60000},{mediaStopAtMs:now+60*60000}])assert.throws(()=>mixedHourApproval({...value,...patch},scope,now),/approval/)
 assert.equal(PRODUCER_EC2_SESSION_MS,30*60000)
})

test('mixed schedule keeps TAKE transitions clear of all four fault injections',async()=>{
 const {MIXED_MEDIA_SCHEDULE}=await import('../lib/producer/mixedMediaSchedule.ts')
 for(const minute of [10,25,40,55]){
  assert.ok(MIXED_MEDIA_SCHEDULE.every(step=>Math.abs(step.minute-minute)>=1))
  const phase=[...MIXED_MEDIA_SCHEDULE].reverse().find(step=>step.minute<minute)?.phase
  assert.equal(phase,minute===40?'slide2':'video')
 }
 for(let i=1;i<MIXED_MEDIA_SCHEDULE.length;i++)assert.ok(MIXED_MEDIA_SCHEDULE[i].minute-MIXED_MEDIA_SCHEDULE[i-1].minute<8)
})
