import assert from 'node:assert/strict'
import {createServer} from 'node:http'
import {once} from 'node:events'
import {mkdirSync,openSync,closeSync,writeFileSync,readFileSync,unlinkSync,appendFileSync} from 'node:fs'
import {resolve,join} from 'node:path'
import {spawn,execFileSync} from 'node:child_process'
import {randomUUID,createHash} from 'node:crypto'
import {chromium,type BrowserServer,type Page} from 'playwright-core'
import {LocalHaRuntime} from '../lib/production/localHaRuntime.ts'
import {LocalProducerRehearsal} from '../lib/production/localProducerRehearsal.ts'
import {handleDirectTake} from '../lib/production/directTakeHttp.ts'
import {BLOCKED_LOCAL_MEDIA_REQUEST} from '../lib/production/localRequestPolicy.ts'
import {writePrivateJson} from '../lib/production/localAtomicFile.ts'
import {qualityWindow,type QualityPoint} from '../lib/production/haQualityMetrics.ts'
import type {ProgramTakeTiming} from '../lib/producer/programTakeTiming.ts'
process.umask(0o077)
const root=resolve(import.meta.dirname,'..'),base=join(root,'.local/production/ha'),id=randomUUID(),directory=join(base,'low-latency',id)
mkdirSync(directory,{recursive:true,mode:0o700})
const lockPath=join(base,'runtime.lock'),lock=openSync(lockPath,'wx',0o600);writeFileSync(lock,String(process.pid));closeSync(lock)
const artifact=createHash('sha256'),sourcePaths=execFileSync('git',['ls-files','--cached','--others','--exclude-standard'],{cwd:root,encoding:'utf8'}).trim().split('\n').filter(path=>/\.(ts|tsx|js|mjs)$/.test(path)).sort()
for(const path of sourcePaths)artifact.update(path+'\0').update(readFileSync(join(root,path)))
const sourceArtifactId=artifact.digest('hex'),deadline=Date.now()+8*60000
const runtime=new LocalHaRuntime(directory,{rehearsal:true,rehearsalDeadlineAtMs:deadline,lowLatency:true,adaptiveStandby:true})
const producer=new LocalProducerRehearsal(runtime,{directTakeOrigins:['http://127.0.0.1:3008'],directTakeUrl:'http://127.0.0.1:4312/control'})
const birth=execFileSync('/bin/ps',['-p',String(process.pid),'-o','lstart='],{encoding:'utf8',env:{PATH:'/usr/bin:/bin',LC_ALL:'C',NODE_ENV:'development'}}).trim()
const activePath=join(directory,'active.json'),active={soakId:'low-latency-'+id,runtimeRunId:runtime.runId,ownerPid:process.pid,ownerBirth:birth,hostPid:process.pid,hostBirth:birth,hardDeadlineAtMs:deadline,outcome:'starting',cleanup:null as null|{workersStopped:boolean},sourceArtifactId,recordingEnabled:false,cloudDeployed:false,watchdogPid:0}
function saveActive(){writePrivateJson(activePath,active);writePrivateJson(join(base,'low-latency-active.json'),{...active,directory})}
saveActive()
const guard=spawn('/Users/lets-gd/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3',[join(root,'scripts/production-ha-soak-watchdog.py'),activePath,active.soakId,String(process.pid),birth,String(process.pid),birth,String(deadline/1000)],{detached:true,stdio:'ignore',env:{PATH:'/usr/bin:/bin',HOME:process.env.HOME??'',LC_ALL:'C',NODE_ENV:'development'}});guard.unref();active.watchdogPid=guard.pid??0;saveActive()
const awake=spawn('/usr/bin/caffeinate',['-w',String(process.pid)],{detached:true,stdio:'ignore'});awake.unref()
const local=createServer(async(req,res)=>{if(!await producer.handle(req,res))await runtime.handle(req,res)})
const direct=createServer(async(req,res)=>{if(!await handleDirectTake(req,res,producer.directTake)){res.writeHead(404);res.end()}})
let driver:BrowserServer|null=null,closing=false
const result={profile:'local-low-latency-qualification',runId:runtime.runId,sourceArtifactId,startedAtMs:Date.now(),outcome:'running',warmup:null as ProgramTakeTiming|null,takes:[] as ProgramTakeTiming[],windows:[] as ReturnType<typeof qualityWindow>[],faults:[] as Record<string,unknown>[],cleanup:null as null|Record<string,unknown>,failure:null as string|null,externalRequests:[] as string[],resources:[] as {atMs:number;rssBytes:number;pressure:string}[]}
const save=()=>writePrivateJson(join(directory,'result.json'),result)
const delay=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms))
type Receiver={atMs:number;validFrames:number;presentedFrames:number;width:number;height:number;generation:number;videoTrackSid:string;audioTrackSid:string;candidate:string;revision:number;lastGoodAtMs:number;audioRms:number;selectionMismatches:number;processingError:string|null;rtc:{framesDecoded:number;framesPerSecond:number};lastSelection:{firstPresentedAtMs:number;videoGapMs:number;firstAudibleAtMs:number|null}}
function observed(){return runtime.status().observer as unknown as Receiver}
function resource(){const pressure=execFileSync('/usr/sbin/sysctl',['-n','kern.memorystatus_vm_pressure_level'],{encoding:'utf8'}).trim();result.resources.push({atMs:Date.now(),rssBytes:process.memoryUsage().rss,pressure});assert.equal(pressure,'1','Memory pressure safety stop')}
async function until(predicate:()=>boolean,label:string,limit=15000){const end=Math.min(deadline,Date.now()+limit);while(Date.now()<end&&!closing){if(runtime.failure)throw Error(runtime.failure);if(predicate())return;await delay(100)}throw Error(label)}
async function take(page:Page,warmup=false){
 await page.waitForFunction(()=>{const button=[...document.querySelectorAll('button')].find(el=>el.textContent==='TAKE whole canvas');return button&&!button.disabled},{},{timeout:20000})
 const video=page.locator('video[aria-label="Decoded Program output"]'),before=JSON.parse(await video.getAttribute('data-take-timing')||'null') as ProgramTakeTiming|null
 await page.getByRole('button',{name:'TAKE whole canvas',exact:true}).click()
 await page.waitForFunction(previous=>{const value=document.querySelector('video[aria-label="Decoded Program output"]')?.getAttribute('data-take-timing');if(!value)return false;const x=JSON.parse(value);return x.startedAtMs!==previous&&(typeof x.presentedMs==='number'||x.pictureError)},before?.startedAtMs??null,{timeout:10000})
 const timing=JSON.parse((await video.getAttribute('data-take-timing'))!) as ProgramTakeTiming
 assert.equal(timing.pictureError,undefined);assert.ok(typeof timing.presentedMs==='number')
 assert.equal(timing.controlRoute,'direct','Prepared CUT unexpectedly used proxy');if(warmup)result.warmup=timing;else result.takes.push(timing)
 save()
 await until(()=>observed()?.revision===runtime.status().revision&&Date.now()-observed().lastGoodAtMs<700,'Program revision confirmation')
}
async function measure(seconds=30){
 await delay(1800);const points:QualityPoint[]=[],start=Date.now()
 while(Date.now()-start<seconds*1000||points.length<2||points.at(-1)!.atMs-points[0].atMs<30000){
  const r=observed();assert.ok(r&&r.rtc);assert.equal(r.selectionMismatches,0);assert.equal(r.processingError,null);assert.ok(r.audioRms>.0005,'Mixed Program audio missing')
  if(!points.length||r.atMs>points.at(-1)!.atMs)points.push({atMs:r.atMs,frames:r.validFrames,decoded:r.rtc.framesDecoded,presented:r.presentedFrames,width:r.width,height:r.height,videoTrackSid:r.videoTrackSid,generation:r.generation})
  appendFileSync(join(directory,'samples.ndjson'),JSON.stringify({atMs:Date.now(),observer:r,sourceReceiveMedia:runtime.sourceReceiveMedia,candidateMedia:runtime.candidateMedia})+'\n')
  resource();await delay(1000);assert.ok(Date.now()<deadline,'Qualification deadline')
 }
 const value=qualityWindow(points);assert.equal(value.fullHdThroughout,true)
 assert.ok([value.distinctFps,value.decodedFps,value.presentedFps].every(fps=>fps>=29.5&&fps<=30.5),'FPS outside 29.5–30.5: '+JSON.stringify(value));result.windows.push(value);save()
}
async function action(name:string){const s=runtime.status();return runtime.action({runId:s.runId,expectedGeneration:s.generation,action:name})}
async function fault(kind:'stall'|'crash'){
 await until(()=>runtime.authority.ready('primary',runtime.status().revision),'Primary not warm')
 if(runtime.status().selected!=='primary')await action('promote-primary')
 const previous=observed(),injectedAtMs=Date.now();await action(kind==='stall'?'freeze-primary':'crash-primary')
 await until(()=>observed()?.candidate==='standby'&&observed().generation>previous.generation&&observed().lastSelection.firstPresentedAtMs>=injectedAtMs,'Failover to standby',12000)
 const r=observed();assert.equal(r.videoTrackSid,previous.videoTrackSid);assert.equal(r.audioTrackSid,previous.audioTrackSid);assert.ok(r.lastSelection.videoGapMs<1000,'Fault picture gap exceeded one second')
 await until(()=>observed().audioRms>.0005,'Audio did not resume')
 result.faults.push({kind,injectedAtMs,pictureGapMs:r.lastSelection.videoGapMs,recoveryAfterInjectionMs:r.lastSelection.firstPresentedAtMs-injectedAtMs,publicationPreserved:true,audioAfter:observed().audioRms})
 await action(kind==='stall'?'heal-primary':'restart-primary');await until(()=>runtime.authority.ready('primary',runtime.status().revision),'Primary restoration',20000);await action('promote-primary');await until(()=>observed().candidate==='primary','Primary return');save()
}
async function cleanup(){
 if(closing)return;closing=true
 await driver?.close().catch(()=>{});await producer.stop()
 local.closeAllConnections();direct.closeAllConnections();await Promise.all([new Promise<void>(resolve=>local.close(()=>resolve())),new Promise<void>(resolve=>direct.close(()=>resolve()))])
 const s=runtime.status(),driverStopped=!driver||driver.process().exitCode!==null||driver.process().signalCode!==null;active.cleanup={workersStopped:s.workers.length===0&&!s.sfuRunning&&driverStopped};active.outcome=result.outcome==='passed'&&active.cleanup.workersStopped?'completed':'failed';saveActive()
 result.cleanup={workersStopped:active.cleanup.workersStopped,sfuRunning:s.sfuRunning,failure:s.failure,driverStopped:!driver||driver.process().exitCode!==null||driver.process().signalCode!==null};save()
 runtime.store.close();if(active.cleanup.workersStopped&&readFileSync(lockPath,'utf8')===String(process.pid))unlinkSync(lockPath)
}
const deadlineTimer=setTimeout(()=>{result.failure='Hard deadline';result.outcome='failed';void cleanup()},Math.max(0,deadline-Date.now()));deadlineTimer.unref()
process.once('SIGINT',()=>{result.outcome='failed';result.failure='Interrupted';void cleanup()});process.once('SIGTERM',()=>{result.outcome='failed';result.failure='Interrupted';void cleanup()})
try{
 local.listen(4311,'127.0.0.1');direct.listen(4312,'127.0.0.1');await Promise.all([once(local,'listening'),once(direct,'listening')])
 for(let i=0;i<50;i++){try{if(JSON.parse(readFileSync(join(directory,'soak-watchdog-result.json'),'utf8')).outcome==='armed')break}catch{}await delay(100)}
 assert.equal(JSON.parse(readFileSync(join(directory,'soak-watchdog-result.json'),'utf8')).outcome,'armed')
 resource();await runtime.start();active.outcome='running';saveActive();resource()
 driver=await chromium.launchServer({channel:'chrome',host:'127.0.0.1',headless:true,chromiumSandbox:true,args:['--autoplay-policy=no-user-gesture-required'],env:{PATH:process.env.PATH??'',HOME:process.env.HOME??'',TMPDIR:process.env.TMPDIR??'',NODE_ENV:'development'}})
 const browser=await chromium.connect(driver.wsEndpoint()),context=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block'})
 await context.route(BLOCKED_LOCAL_MEDIA_REQUEST,route=>{const raw=route.request().url();if(!raw.startsWith('blob:')&&!raw.startsWith('data:'))result.externalRequests.push(new URL(raw).hostname);return route.abort()})
 const page=await context.newPage();await page.goto('http://127.0.0.1:3008/dev/producer-latency')
 await page.getByRole('button',{name:'Load video + PowerPoint + audio',exact:true}).click();await page.getByRole('button',{name:'Connect local engine',exact:true}).click();await take(page,true)
 for(let i=0;i<6;i++){await page.getByRole('button',{name:'Change top layer position and opacity',exact:true}).click();await take(page)}
 await measure();await fault('stall');await measure();await fault('crash');await measure()
 assert.equal(result.externalRequests.length,0);assert.equal(result.faults.length,2);assert.ok(result.takes.length>=6)
 const timings=[result.warmup!,...result.takes].map(t=>t.presentedMs!).sort((a,b)=>a-b),p95=timings[Math.min(timings.length-1,Math.floor(timings.length*.95))]
 result.outcome=p95<=200?'passed':'latency-target-not-met';if(result.outcome!=='passed')process.exitCode=1;save()
 console.log(JSON.stringify({runId:runtime.runId,profile:result.profile,result:result.outcome,rangeMs:[timings[0],timings.at(-1)],p95Ms:p95,takes:result.takes.length,windows:result.windows,faults:result.faults,directory}))
}catch(error){result.outcome='failed';result.failure=String(error instanceof Error?error.message:error).replace(/https?:\/\/\S+|[a-f0-9]{64}/g,'[redacted]').slice(0,300);save();console.error(JSON.stringify({runId:runtime.runId,result:'failed',failure:result.failure,directory}));process.exitCode=1}
finally{clearTimeout(deadlineTimer);await cleanup()}
