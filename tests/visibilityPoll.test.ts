import assert from 'node:assert/strict'
import test from 'node:test'
import {startVisibilityPoll,type PollEnvironment} from '../lib/browser/visibilityPoll.ts'
function harness(){let visible=true,listener=()=>{},id=0;const timers=new Map<number,{run:()=>void;delay:number}>();let removed=false
 const env:PollEnvironment={visible:()=>visible,listen(fn){listener=fn;return()=>{removed=true}},later(run,delay){timers.set(++id,{run,delay});return id},cancel(key){timers.delete(key as number)},random:()=>1}
 async function fire(){const task=timers.values().next().value;assert.ok(task);timers.clear();task.run();await Promise.resolve();await Promise.resolve();await Promise.resolve()}
 return{env,timers,fire,visibility(value:boolean){visible=value;listener()},wake(){listener()},removed:()=>removed}}
test('hidden UI does not poll; focus resumes one stream; stop removes listeners and timers',async()=>{
 const h=harness();let count=0;const poll=startVisibilityPoll({run:async()=>{count++},intervalMs:3000},h.env)
 await h.fire();assert.equal(count,1);h.visibility(false);assert.equal(h.timers.size,0);h.visibility(true);h.wake();assert.equal(h.timers.size,1);await h.fire();assert.equal(count,2);poll.stop();assert.equal(h.timers.size,0);assert.equal(h.removed(),true);h.wake();assert.equal(h.timers.size,0)
})
test('slow reads cannot overlap and resolving after unmount never schedules another request',async()=>{
 const h=harness();let count=0,release:()=>void=()=>{};let signal:AbortSignal|undefined
 const poll=startVisibilityPoll({run:s=>{signal=s;count++;return new Promise<void>(resolve=>{release=resolve})},intervalMs:3000},h.env)
 await h.fire();h.wake();h.wake();assert.equal(count,1);poll.stop();assert.ok(signal?.aborted);release();await Promise.resolve();await Promise.resolve();assert.equal(h.timers.size,0);assert.equal(count,1)
})
test('read failures back off with a ceiling and success restores normal cadence',async()=>{
 const h=harness();let failing=true,errors=0;const poll=startVisibilityPoll({run:async()=>{if(failing)throw Error('offline')},intervalMs:3000,onError:()=>{errors++}},h.env)
 const delays=[];for(let i=0;i<8;i++){await h.fire();delays.push([...h.timers.values()][0].delay)}
 assert.deepEqual(delays,[6000,12000,24000,30000,30000,30000,30000,30000]);assert.equal(errors,8);failing=false;await h.fire();assert.equal([...h.timers.values()][0].delay,3000);poll.stop()
})
