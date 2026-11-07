import {chromium} from 'playwright-core';
(async()=>{
 const base=process.argv[2]||'http://127.0.0.1:3007';const target=new URL(base);if(target.protocol!=='http:'||!['127.0.0.1','localhost'].includes(target.hostname)||target.username||target.password)throw Error('Loopback-only development URL required');
 const browser=await chromium.launch({channel:'chrome',headless:true,chromiumSandbox:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  const errors=[],forbidden=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>{const u=new URL(route.request().url());if(!['127.0.0.1','localhost'].includes(u.hostname)||u.pathname.includes('/transport')||u.pathname.includes('/api/')){forbidden.push(u.pathname);return route.abort()}return route.continue()});
  await page.goto(target.origin+'/dev/producer-layouts');
  await page.getByRole('button',{name:/Choose layout/}).waitFor();
  await page.waitForFunction(()=>document.querySelector('[data-engine-session]')?.dataset.engineSession&&document.querySelector('video')?.srcObject);
  await page.getByRole('button',{name:'Mixer',exact:true}).click();
  const gain=page.getByRole('slider',{name:'Program gain'});await gain.focus();await gain.press('Home');for(let i=0;i<17;i++)await gain.press('ArrowRight');
  await page.getByRole('button',{name:'Select Teal',exact:true}).click();
  await page.evaluate(()=>window.layoutBaseline={element:document.querySelector('video'),stream:document.querySelector('video').srcObject,engine:document.querySelector('[data-engine-session]').dataset.engineSession,gain:document.querySelector('[data-mixer-gain]').textContent,ticks:Number(document.querySelector('[data-frame-ticks]').dataset.frameTicks)});
  const seen=[];
  for(const [name,id] of [['Launchpad','launchpad'],['Spotlight','spotlight'],['Flight Deck','flight-deck'],['Launchpad','launchpad'],['Spotlight','spotlight']]){
   await page.getByRole('button',{name:/Choose layout/}).click();

   await page.locator('.producer-layout-option').filter({hasText:name}).click();
   await page.waitForFunction(expected=>document.querySelector('[data-producer-layout]').dataset.producerLayout===expected,id);
   const preserved=await page.evaluate(()=>{const b=window.layoutBaseline;return {sameElement:document.querySelector('video')===b.element,sameStream:document.querySelector('video').srcObject===b.stream,sameEngine:document.querySelector('[data-engine-session]').dataset.engineSession===b.engine,gain:document.querySelector('[data-mixer-gain]').textContent,program:document.querySelector('[data-program-intent]').textContent,selected:document.querySelector('.producer-monitor--preview').textContent.includes('Teal')}});
   if(!preserved.sameElement||!preserved.sameStream||!preserved.sameEngine||preserved.gain!=='17'||preserved.program!=='Holding'||!preserved.selected)throw Error(JSON.stringify(preserved));
   seen.push({layout:id,preserved});
  }
  await page.waitForTimeout(250);
  if(!await page.evaluate(()=>Number(document.querySelector('[data-frame-ticks]').dataset.frameTicks)>window.layoutBaseline.ticks))throw Error('Metadata progress stopped');

  await page.reload();
  await page.waitForFunction(()=>document.querySelector('[data-producer-layout]')?.dataset.producerLayout==='spotlight');
  await page.getByRole('button',{name:/Choose layout/}).click();
  if(await page.locator('.producer-layout-option[aria-pressed=true]').innerText().then(t=>!t.includes('Spotlight')))throw Error('Saved choice was not restored');
  await page.getByRole('button',{name:'Close',exact:true}).click();
  await page.evaluate(()=>{Storage.prototype.setItem=function(){throw new Error('Blocked fixture storage')}});
  await page.getByRole('button',{name:/Choose layout/}).click();await page.locator('.producer-layout-option').filter({hasText:'Launchpad'}).click();
  await page.waitForFunction(()=>document.querySelector('[data-producer-layout]').dataset.producerLayout==='launchpad');
  for(const width of [1440,1024,820]){
   await page.setViewportSize({width,height:900});
   const geometry=await page.locator('[data-layout-fixture]').evaluate(el=>({scroll:el.scrollWidth,client:el.clientWidth}));
   if(geometry.scroll>geometry.client+1)throw Error('Horizontal overflow at '+width+': '+JSON.stringify(geometry));
  }
  if(errors.length)throw Error(errors.join('; '));if(forbidden.length)throw Error('Unexpected network '+forbidden.join(','));
  console.log(JSON.stringify({result:'passed',switches:seen.length,sameMonitorAndStream:true,sameEngineSession:true,mixerGainPreserved:17,programIntentPreserved:true,progressContinued:true,preferenceSurvivedReload:true,blockedStorageFallback:true,externalOrEngineRequests:forbidden.length,errors}));
 }finally{await browser.close()}
})().catch(e=>{console.error(e.message);process.exitCode=1});
