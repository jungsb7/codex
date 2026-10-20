'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto'),assert=require('node:assert/strict'),V=require('./view.js');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'/opt/codex/cua_node/lib/node_modules/playwright'),root=path.resolve(__dirname,'../../..'),out=path.join(__dirname,'validation'),data=V.validate(require('./output/catalog.json')),checks=[],errors=[];
const server=http.createServer((req,res)=>{const f=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/codex(?=\/)/,''));if(!f.startsWith(root+'/')||!fs.existsSync(f)||!fs.statSync(f).isFile()){res.writeHead(404);return res.end();}res.setHeader('Content-Type',({'.js':'text/javascript','.json':'application/json','.html':'text/html','.css':'text/css'})[path.extname(f)]||'application/octet-stream');fs.createReadStream(f).pipe(res);}),pass=s=>{checks.push(s);console.log('PASS '+s);};
let maxNumericDifference=0;
function equivalent(a,b,at='root'){
 if(typeof a==='number'&&typeof b==='number'){const delta=Math.abs(a-b);maxNumericDifference=Math.max(maxNumericDifference,delta);assert(delta<=1e-8+1e-11*Math.abs(b),at+': '+a+' vs '+b);return;}
 if(a&&b&&typeof a==='object'&&typeof b==='object'){assert.deepEqual(Object.keys(a),Object.keys(b),at);for(const k of Object.keys(a))equivalent(a[k],b[k],at+'.'+k);return;}
 assert.equal(a,b,at);
}
(async()=>{let browser;try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const base=`http://127.0.0.1:${server.address().port}/codex/integration/natural-world/d298591-confluence/index.html`,page=await browser.newPage({viewport:{width:1440,height:1000}}),requests=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));await page.goto(base);await page.waitForFunction(()=>!document.getElementById('content').hidden);
 assert.equal(await page.evaluate(()=>confluenceDebug),null);assert(await page.locator('#editor').isHidden());assert(await page.locator('#result').isHidden());pass('initial state supplies no implicit assumptions');
 let downloads=0;
 for(const p of data.presets){
  await page.selectOption('#preset',p.id);const q=await page.evaluate(()=>confluenceDebug.current);equivalent(q,V.result(data,p.input));
  for(const rr of q.candidate.reaches){await page.selectOption('#reach',rr.id);assert.equal(await page.locator('#plot-area').isVisible(),!!rr.profile.length);}
  const wait=page.waitForEvent('download');await page.locator('#download').click();assert.deepEqual(JSON.parse(fs.readFileSync(await(await wait).path())),q);downloads++;await page.waitForTimeout(200);
 }
 pass('10 examples, every reach state and 10 downloaded JSON outputs agree with CLI core');
 await page.selectOption('#preset','two-branches');await page.selectOption('#reach','side');await page.locator('#point').fill('3');await page.locator('#point').dispatchEvent('input');const q=await page.evaluate(()=>confluenceDebug.current),hash=await page.locator('#share-link').getAttribute('href');await page.reload();await page.waitForFunction(()=>window.confluenceDebug);assert.equal(await page.evaluate(()=>confluenceDebug.reachId),'side');assert.equal(await page.evaluate(()=>confluenceDebug.point),3);equivalent(await page.evaluate(()=>confluenceDebug.current),q);await page.selectOption('#preset','constant');await page.goBack();equivalent(await page.evaluate(()=>confluenceDebug.current),q);
 const fresh=await browser.newPage();await fresh.goto(base+hash);await fresh.waitForFunction(()=>window.confluenceDebug);equivalent(await fresh.evaluate(()=>confluenceDebug.current),q);await fresh.close();pass('full assumptions, selected reach and position survive sharing, reload and history');
 const field=page.locator('input[data-path=\'["downstream","depthM"]\']');await field.fill('6');assert.equal(await page.evaluate(()=>confluenceDebug),null);assert(await page.locator('#result').isHidden());await page.locator('#calculate').click();const custom=JSON.parse(JSON.stringify(data.presets.find(x=>x.id==='two-branches').input));custom.downstream.depthM=6;equivalent(await page.evaluate(()=>confluenceDebug.current),V.result(data,custom));pass('editing clears stale output and computes explicitly submitted custom input');
 await page.locator('#fields details').nth(1).locator('summary').click();const flow=page.locator('input[data-path=\'["reaches",1,"inflowM3S"]\']');
 for(const value of ['', '0','-10']){await flow.fill(value);await page.locator('#calculate').click();assert.equal(await page.evaluate(()=>confluenceDebug),null);assert(await page.locator('#result').isHidden());assert.match(await page.locator('#run-status').innerText(),/계산하지 않았/);}
 pass('missing and zero/reverse flow never inherit previous values');
 await page.selectOption('#preset','two-branches');await page.locator('#fields details').nth(2).locator('summary').click();await page.locator('input[data-path=\'["reaches",2,"junctionAngleDeg"]\']').fill('45');await page.locator('#calculate').click();assert.equal((await page.evaluate(()=>confluenceDebug.current)).candidate.junctions[0].status,'held');await page.selectOption('#reach','side');assert(await page.locator('#plot-area').isHidden());pass('unsupported angle visibly blocks upstream results without extending a profile');
 await page.locator('#clear').click();assert.equal(await page.evaluate(()=>location.hash),'');assert.equal(await page.evaluate(()=>confluenceDebug),null);await page.goto(base+'#input=%7B%7D');await page.waitForFunction(()=>!document.getElementById('content').hidden);assert.equal(await page.evaluate(()=>confluenceDebug),null);assert.match(await page.locator('#run-status').innerText(),/계산하지 않았/);pass('clear and malformed shared assumptions retain the empty result');
 for(const[width,id,reach]of [[1440,'variable-branches','side'],[390,'bank-stop','out'],[320,'angle-held','side']]){
  await page.setViewportSize({width,height:1000});await page.selectOption('#preset',id);await page.selectOption('#reach',reach);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  for(const selector of ['#preset','#calculate','#download','#reach']){const box=await page.locator(selector).boundingBox();assert(box.width>=70&&box.height>=40);}
  await page.screenshot({path:path.join(out,'confluence-'+width+'.png'),fullPage:true});
 }
 // An open geometry editor must also fit a narrow viewport.
 await page.locator('#fields details').nth(0).locator('summary').click();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:path.join(out,'confluence-editor-320.png'),fullPage:true});pass('1440/390/320px completed, stopped, held and editable geometry states fit the viewport');
 assert.equal(await page.locator('#source-rows tr').count(),12);assert(!requests.some(r=>/period-\d|stage5\/output|tailwater\/output/.test(r)));pass('12-phase audit is separate and no original terrain/climate payload is fetched');
 for(const kind of ['http','hash','schema']){
  const p=await browser.newPage();p.on('pageerror',e=>errors.push(e.message));let bad=true;
  if(kind==='http')await p.route('**/output/catalog.json',r=>bad?r.fulfill({status:503,body:'unavailable'}):r.continue());
  if(kind==='hash')await p.route('**/output/catalog.json',r=>bad?r.fulfill({body:'broken'}):r.continue());
  if(kind==='schema'){const bytes=Buffer.from(JSON.stringify({...data,schema:'bad'})),m={schema:'d298591-confluence-manifest/1',file:'catalog.json',bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')};await p.route('**/output/manifest.json',r=>bad?r.fulfill({json:m}):r.continue());await p.route('**/output/catalog.json',r=>bad?r.fulfill({body:bytes}):r.continue());}
  await p.goto(base+hash);await p.waitForFunction(()=>!document.getElementById('retry').hidden);assert(await p.locator('#content').isHidden());assert.equal(await p.evaluate(()=>confluenceDebug),null);bad=false;await p.locator('#retry').click();await p.waitForFunction(()=>window.confluenceDebug);equivalent(await p.evaluate(()=>confluenceDebug.current),q);await p.close();pass(kind+' failure hides output; retry retains requested complete assumptions');
 }
 const prior=await browser.newPage();await prior.goto(base.replace('/d298591-confluence/','/d298591-hydraulics/'));await prior.locator('a[href="../d298591-confluence/index.html"]').click();await prior.waitForFunction(()=>!document.getElementById('content').hidden);assert.equal(await prior.evaluate(()=>confluenceDebug),null);await prior.close();pass('previous candidate links to the new stage without adopting a preset');
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'browser-checks.json'),JSON.stringify({status:'passed',checks,pageErrors:errors,presetComparisons:10,jsonDownloads:downloads,viewports:[1440,390,320],maxNumericDifference,numericTolerance:'absolute 1e-8 + relative 1e-11; keys/strings/null/flags exact; download exact to browser result'},null,2)+'\n');
}catch(e){fs.writeFileSync(path.join(out,'browser-checks.json'),JSON.stringify({status:'failed',checks,error:e.stack,pageErrors:errors},null,2)+'\n');throw e;}finally{await browser?.close();server.close();}})();
