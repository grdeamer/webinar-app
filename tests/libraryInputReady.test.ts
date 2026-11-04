import test from 'node:test'
import assert from 'node:assert/strict'
import {libraryInputReady} from '../lib/producer/libraryInputReady.ts'
const now=10000,sid='TR_owned',role='source-b' as const
function status(){return {state:{bindings:{'camera-b':{trackSid:sid,generation:3}}},runtime:{sourceReceiveMedia:{'source-b':{trackSid:sid,generation:3,atMs:now-50}},candidateMedia:{primary:{atMs:now-20,inputTrackSids:{'source-camera-b':sid},inputFrames:{'source-camera-b':20}},standby:{atMs:now-30,inputTrackSids:{'source-camera-b':sid},inputFrames:{'source-camera-b':10}}}}}}
test('signaling alone cannot mark a slide ready for TAKE',()=>{const s=status();delete s.runtime.sourceReceiveMedia['source-b'];assert.equal(libraryInputReady(s,role,sid,now),false)})
test('both decoders must be fresh and belong to the authenticated publication',()=>{
 assert.equal(libraryInputReady(status(),role,sid,now),true)
 for(const candidate of ['primary','standby'] as const){const s=status();s.runtime.candidateMedia[candidate].inputTrackSids['source-camera-b']='TR_old';assert.equal(libraryInputReady(s,role,sid,now),false)}
 const stale=status();stale.runtime.sourceReceiveMedia['source-b'].atMs=now-2500;assert.equal(libraryInputReady(stale,role,sid,now),false)
 const changed=status();changed.runtime.sourceReceiveMedia['source-b'].generation=2;assert.equal(libraryInputReady(changed,role,sid,now),false)
})
