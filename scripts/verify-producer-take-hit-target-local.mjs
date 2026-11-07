import {chromium} from 'playwright-core';
const base=new URL(process.argv[2]||'http://127.0.0.1:3007');
if(base.protocol!=='http:'||!['127.0.0.1','localhost'].includes(base.hostname)||base.username||base.password)throw Error('Loopback fixture required');
const browser=await chromium.launch({channel:'chrome',headless:true,chromiumSandbox:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:550}}),results=[],external=[];
 await page.route('**/*',route=>{const u=new URL(route.request().url());if(!['127.0.0.1','localhost'].includes(u.hostname)||u.pathname.includes('/api/')||u.pathname.includes('/transport')){external.push(u.pathname);return route.abort()}return route.continue()});
 await page.goto(base.origin+'/dev/producer-layouts');
 for(const name of ['Flight Deck','Launchpad','Spotlight']){
  await page.getByRole('button',{name:/Choose layout/}).click();
  await page.locator('.producer-layout-option').filter({hasText:name}).click();
  await page.getByRole('dialog').waitFor({state:'hidden',timeout:5000});
  const take=page.locator('.producer-take-rail button');await take.scrollIntoViewIfNeeded();
  const value=await take.evaluate(el=>{const r=el.getBoundingClientRect(),c=document.querySelector('.producer-center-surface').getBoundingClientRect(),d=document.querySelector('.producer-bottom-dock').getBoundingClientRect(),hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return {reachable:!!hit&&el.contains(hit),panelsSeparated:c.bottom<=d.top+1||d.right<=c.left+1,centerHeight:c.height,hitTag:hit?.tagName}});
  if(!value.reachable||!value.panelsSeparated)throw Error(name+': '+JSON.stringify(value));results.push({name,...value});
 }
 if(external.length)throw Error('External requests: '+external.join(','));console.log(JSON.stringify({results,externalRequests:external.length}));
}finally{await browser.close()}
