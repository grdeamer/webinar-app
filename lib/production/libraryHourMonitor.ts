import {canvasColorsMatch,type CanvasHourPhase} from './canvasHourPlan.ts'
import { freemem,loadavg } from 'node:os'
import { execFileSync } from 'node:child_process'
import { macMemoryAvailable } from './localScale.ts'
import assert from 'node:assert/strict'
import { appendFileSync,mkdirSync } from 'node:fs'
import { join } from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { LocalHaRuntime } from './localHaRuntime.ts'
import { LOCAL_SCOPE } from './localWorkbench.ts'
import { writePrivateJson } from './localAtomicFile.ts'
import { qualityWindow, type QualityPoint } from './haQualityMetrics.ts'
import { assessSoakWindow, SOAK_FAULTS } from './haSoakPlan.ts'
type Observer={atMs:number;lastGoodAtMs:number;selectionMismatches:number;width:number;height:number;videoTrackSid:string;audioTrackSid:string;generation:number;candidate:string;revision:number;validFrames:number;presentedFrames:number;audioRms:number;processingError?:string|null;canvasRgb?:number[];rtc:{framesDecoded:number};lastSelection?:{firstPresentedAtMs:number;videoGapMs:number;firstAudibleAtMs?:number}}
const observer=(s:ReturnType<LocalHaRuntime['status']>)=>s.observer as unknown as Observer
const delay=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms))
export class LibraryHourMonitor {
 result:{profile:string;runId:string;outcome:string;startedAtMs:number|null;elapsedMs:number;qualifiedMs:number;phase:string;phaseAtMs:number;faultActive:boolean;windows:unknown[];events:Record<string,unknown>[];error:string|null;cleanup:unknown}
 private runtime:LocalHaRuntime
 private directory:string
 private stop:()=>Promise<void>
 private canvasMode:boolean
 private qualification:boolean
 private ownedFile?:(sourceId:string)=>boolean
 constructor(runtime:LocalHaRuntime,directory:string,stop:()=>Promise<void>,ownedFile?:(sourceId:string)=>boolean,canvasMode=false,qualification=false){this.qualification=qualification;this.canvasMode=canvasMode;mkdirSync(directory,{recursive:true,mode:0o700});this.ownedFile=ownedFile;this.runtime=runtime;this.directory=directory;this.stop=stop;this.result={profile:canvasMode?(qualification?'multi-canvas-qualification':'multi-canvas-hour'):'single-library-hour',runId:runtime.runId,outcome:'waiting-for-browser',startedAtMs:null,elapsedMs:0,qualifiedMs:0,phase:'',phaseAtMs:0,faultActive:false,windows:[],events:[],error:null,cleanup:null};this.save()}
 save(){writePrivateJson(join(this.directory,'result.json'),this.result)}
 cleaned(s:ReturnType<LocalHaRuntime['status']>){this.result.cleanup={workersStopped:s.workers.length===0&&!s.sfuRunning,atMs:Date.now()};this.save()}
 report(x:{runId:string;phase?:string;error?:string;transition?:string}){
  if(x.runId!==this.runtime.runId||this.result.faultActive)throw Error('Run changed or fault in progress')
  if(x.error){this.result.error='Browser schedule failed';this.result.outcome='failed';this.save();void this.stop();throw Error(this.result.error)}
  if(!['video','slide1','slide2','audio'].includes(x.phase??''))throw Error('Unknown test phase')
  if(!this.result.startedAtMs&&x.phase!=='video')throw Error('The hour must begin with video')
  if(this.canvasMode){
   const state=this.runtime.status(),r=observer(state)
   if(!canvasColorsMatch(r?.canvasRgb,x.phase as CanvasHourPhase)||r.audioRms<=.0005)throw Error('Decoded multi-canvas phase not confirmed')
   this.result.events.push({kind:'take',phase:x.phase,transition:x.transition??'cut',atMs:Date.now(),revision:r.revision,pictureGapMs:r.lastSelection?.videoGapMs??null})
  }
  this.result.phase=x.phase!;this.result.phaseAtMs=Date.now();if(!this.result.startedAtMs){this.result.startedAtMs=Date.now();this.result.outcome='running'}this.save()
 }
 interrupted(reason:string){if(!['completed','failed'].includes(this.result.outcome)){this.result.outcome='failed';this.result.error='Engine interrupted: '+reason;this.save()}}
 summary(){const {runId,outcome,startedAtMs,elapsedMs,phase,faultActive}=this.result;return {mode:'original-room-mixed-hour' as const,profile:this.result.profile,runId,outcome,startedAtMs,elapsedMs,phase,faultActive}}
 async handle(req:IncomingMessage,res:ServerResponse){if(!req.url?.startsWith('/api/library-soak'))return false
  try {if(req.headers.host!=='127.0.0.1:4311'||req.headers['sec-fetch-site']==='cross-site'||(req.headers.origin&&req.headers.origin!=='http://127.0.0.1:4311'))throw Error('Loopback required')
   if(req.method==='POST'){if(req.headers['x-jupiter-local']!=='library-soak')throw Error('Local control required');let body='';for await(const c of req){body+=String(c);if(body.length>2000)throw Error('Request too large')}const x=JSON.parse(body);this.report(x)}
   res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(this.result))
  }catch(e){this.result.error=e instanceof Error?e.message:'Browser failure';this.result.outcome='failed';this.save();res.writeHead(400);res.end(JSON.stringify({error:this.result.error}));void this.stop()}return true
 }
 private async action(action:string){const s=this.runtime.status();return this.runtime.action({action,runId:s.runId,expectedGeneration:s.generation})}
 private async until(test:(s:ReturnType<LocalHaRuntime['status']>)=>boolean,timeout=20000){const end=Date.now()+timeout;while(Date.now()<end){const s=this.runtime.status();if(test(s))return s;await delay(100)}throw Error('Fault recovery/readiness timed out')}
 async run(){let started=0,points:(QualityPoint & {sourceFrames:number;sourceAtMs:number;sourceStatsFresh:boolean;receivedFrames:number;receivedAtMs:number;audioRms:number})[]=[],sid='',audioSid='',nextFault=0,revision=-1,generation=-1,settleUntil=0
  try {
   const startup=Date.now()+120000;while(!this.result.startedAtMs){assert.notEqual(this.result.outcome,'failed','Browser schedule failed');assert.ok(Date.now()<startup,'Browser source startup timed out');await delay(500)}started=performance.now()
   const durationMs=this.qualification?170000:3600000
   const faults=this.qualification?[{atMs:40000,kind:'stall'},{atMs:95000,kind:'crash'}]:SOAK_FAULTS
   while(performance.now()-started<durationMs){
    assert.notEqual(this.result.outcome,'failed','Browser schedule failed');this.result.elapsedMs=performance.now()-started;const s=this.runtime.status(),r=observer(s);assert.ok(s.running&&!s.failure,'Runtime stopped/failed');assert.ok(Date.now()<s.expiresAtMs-5000,'Hard deadline reached');assert.ok(r&&Date.now()-r.atMs<2500,'Receiver stale');assert.ok(!r.processingError,'Decoded-frame validation worker failed');assert.equal(r.selectionMismatches,0,'Provenance mismatch');assert.equal(r.width,1920);assert.equal(r.height,1080)
    const programSource=this.runtime.store.read(LOCAL_SCOPE).program.composition.layers[0]?.sourceId
    if(this.ownedFile){assert.ok(programSource&&this.ownedFile(programSource),'Program file ownership lease lost');const input=s.sourceReceiveMedia[programSource==='camera-a'?'source-a':'source-b'];assert.ok(input&&Date.now()-input.atMs<2500,'Program input decoder progress stopped')}
    if(sid){assert.equal(r.videoTrackSid,sid);assert.equal(r.audioTrackSid,audioSid)}sid=r.videoTrackSid;audioSid=r.audioTrackSid
    if(Math.floor(this.result.elapsedMs/1000)%15===0){
      if(process.platform==='linux'){
        const available=freemem();appendFileSync(join(this.directory,'resources.ndjson'),JSON.stringify({atMs:Date.now(),available,load:loadavg(),owner:process.resourceUsage(),memory:process.memoryUsage()})+'\n');assert.ok(available>512*1024*1024,'Low memory safety stop')
      }else{
      const pressure=execFileSync('/usr/sbin/sysctl',['-n','kern.memorystatus_vm_pressure_level'],{encoding:'utf8'}).trim()
      const available=macMemoryAvailable(execFileSync('/usr/bin/vm_stat',[],{encoding:'utf8'}))
      const owned=new Set([process.pid,s.sfuPid,...s.workers.map(worker=>worker.pid)])
      const processes=execFileSync('/bin/ps',['-axo','pid=,ppid=,rss=,pcpu='],{encoding:'utf8'}).trim().split('\n').map(line=>{const [pid,ppid,rss,cpu]=line.trim().split(/\s+/).map(Number);return {pid,ppid,rssBytes:rss*1024,cpuPercent:cpu}})
      let changed=true;while(changed){changed=false;for(const process of processes)if(owned.has(process.ppid)&&!owned.has(process.pid)){owned.add(process.pid);changed=true}}
      appendFileSync(join(this.directory,'resources.ndjson'),JSON.stringify({atMs:Date.now(),available,pressure,owner:process.resourceUsage(),memory:process.memoryUsage(),processes:processes.filter(process=>owned.has(process.pid))})+'\n')
      assert.equal(pressure,'1','Memory pressure safety stop');assert.ok(available>512*1024*1024,'Low memory safety stop')
      }
    }
    appendFileSync(join(this.directory,'samples.ndjson'),JSON.stringify({atMs:Date.now(),elapsedMs:this.result.elapsedMs,phase:this.result.phase,status:s})+'\n')
    const fault=faults[nextFault]
    if(fault&&this.result.elapsedMs>=fault.atMs){this.result.faultActive=true;this.save();points=[]
     const ready=(v:ReturnType<LocalHaRuntime['status']>,who:'primary'|'standby')=>{const c=v.candidates[who];return Boolean(c&&!c.error&&c.revision===v.revision&&Date.now()-c.progressedAtMs<600)}
     await this.until(v=>ready(v,'primary')&&ready(v,'standby'));if(s.selected!=='primary'){await this.action('promote-primary');await this.until(v=>v.observer?.candidate==='primary'&&v.observer.generation===v.generation)}
     const began=Date.now(),before=this.runtime.status();const event:Record<string,unknown>={kind:fault.kind,minute:fault.atMs/60000,beganAtMs:began};this.result.events.push(event)
     await this.action(fault.kind==='stall'?'freeze-primary':'crash-primary');const recovered=await this.until(v=>v.generation>before.generation&&v.observer?.candidate==='standby'&&v.observer.generation===v.generation&&(observer(v).lastSelection?.firstPresentedAtMs??0)>=began)
     event.pictureGapMs=observer(recovered).lastSelection!.videoGapMs;event.recoveryMs=Date.now()-began;assert.ok(Number(event.pictureGapMs)<1000,'Fault picture gap exceeded one second')
     if(this.canvasMode){const audible=await this.until(v=>v.observer?.candidate==='standby'&&observer(v).audioRms>.0005&&(observer(v).lastSelection?.firstAudibleAtMs??0)>=began,3000);event.audioRecoveryAfterInjectionMs=(observer(audible).lastSelection?.firstAudibleAtMs??Date.now())-began;event.audioPresentOnRecoveredSelection=true}
     await this.action(fault.kind==='stall'?'heal-primary':'restart-primary');await this.until(v=>ready(v,'primary'));event.restoredAtMs=Date.now();nextFault++;this.result.faultActive=false;settleUntil=Date.now()+5000;this.save();continue
    }
    if(revision!==s.revision||generation!==s.generation){points=[];settleUntil=Date.now()+5000;revision=s.revision;generation=s.generation}
    if(Date.now()>settleUntil&&(!points.length||r.atMs>points.at(-1)!.atMs)){
      if(this.canvasMode){
       assert.ok(canvasColorsMatch(r.canvasRgb,this.result.phase as CanvasHourPhase),'Decoded slide/graphic layout mismatch')
       assert.ok(r.audioRms>.0005,'Multi-canvas audio missing')
       const fileRole=programSource==='camera-a'?'source-a':'source-b',media=s.sourceMedia[fileRole]
       if(media&&Date.now()-media.atMs<2500){assert.equal(media.encoding.captureMode,'explicit-canvas-frames','Whole canvas publisher required');assert.ok(Number(media.encoding.canvasLayerCount)>=4,'Multi-source canvas layers missing');assert.ok(Object.keys(media.encoding.canvasSourceFrames??{}).length>=1,'Moving video layer missing')}
      }
      assert.ok(Date.now()-r.lastGoodAtMs<1000,'Outgoing frames stopped');const sourceId=this.runtime.store.read(LOCAL_SCOPE).program.composition.layers[0]?.sourceId;const source=s.sourceMedia[sourceId==='camera-a'?'source-a':'source-b'];const received=s.sourceReceiveMedia[sourceId==='camera-a'?'source-a':'source-b'];points.push({audioRms:r.audioRms,receivedFrames:received?.frames??0,receivedAtMs:received?.reportAtMs??0,sourceStatsFresh:Boolean(source&&r.atMs-source.atMs<2500),sourceFrames:Number(source?.encoding.framesEncoded??0),sourceAtMs:source?.atMs??0,atMs:r.atMs,frames:r.validFrames,decoded:r.rtc.framesDecoded,presented:r.presentedFrames,width:r.width,height:r.height,generation:r.generation,videoTrackSid:r.videoTrackSid});if(points.at(-1)!.atMs-points[0].atMs>=30000){const m=qualityWindow(points);try{assessSoakWindow(m)}catch(error){this.result.events.push({kind:'failed-window',phase:this.result.phase,...m});throw error}if(this.result.phase==='audio')assert.ok(r.audioRms>.0005,'Audio tone missing');if(this.canvasMode)assert.ok(points.every(p=>p.audioRms>.0005),'Multi-canvas audio missing within steady window');const a=points[0],z=points.at(-1)!;const sourceStatsFresh=points.every(p=>p.sourceStatsFresh),sourceEncodedFps=sourceStatsFresh&&z.sourceAtMs>a.sourceAtMs?(z.sourceFrames-a.sourceFrames)*1000/(z.sourceAtMs-a.sourceAtMs):null,sourceReceivedFps=z.receivedAtMs>a.receivedAtMs&&z.receivedFrames>=a.receivedFrames?(z.receivedFrames-a.receivedFrames)*1000/(z.receivedAtMs-a.receivedAtMs):null;this.result.windows.push({phase:this.result.phase,sourceStatsFresh,sourceEncodedFps,sourceReceivedFps,...m});this.result.qualifiedMs+=m.seconds*1000;points=[points.at(-1)!]}}
    assert.ok(Date.now()-this.result.phaseAtMs<8*60000,'Browser source schedule stalled');this.save();await delay(1000)
   }
   this.result.elapsedMs=performance.now()-started;assert.ok(this.result.elapsedMs>=durationMs,'Incomplete observation');assert.equal(nextFault,faults.length);if(this.canvasMode)assert.ok(this.result.events.filter(event=>event.kind==='take').length>=(this.qualification?2:13),'Missing planned canvas TAKE transitions');for(const name of (this.qualification?['video','audio']:['video','slide1','slide2','audio']))assert.ok(this.result.windows.some((w)=> (w as {phase:string}).phase===name),'Missing phase '+name);assert.ok(this.result.qualifiedMs>=(this.qualification?90000:3000000),'Insufficient steady observation');this.result.outcome='completed'
  }catch(e){this.result.outcome='failed';this.result.error=e instanceof Error?e.message:'Soak failed'}finally{this.save();await this.stop()}
 }
}
