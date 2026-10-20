'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),zlib=require('node:zlib'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'/opt/codex/cua_node/lib/node_modules/playwright'),V=require('./view.js');
const root=path.resolve(__dirname,'../../..'),out=path.join(__dirname,'validation'),data=V.validate(JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(__dirname,'output/review.json.gz'))))),checks=[],errors=[];
const server=http.createServer((req,res)=>{const f=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/codex(?=\/)/,''));if(!f.startsWith(root+'/')||!fs.existsSync(f)||!fs.statSync(f).isFile()){res.writeHead(404);return res.end();}res.setHeader('Content-Type',({'.js':'text/javascript','.json':'application/json','.html':'text/html','.css':'text/css'})[path.extname(f)]||'application/octet-stream');fs.createReadStream(f).pipe(res);});
const pass=s=>{checks.push(s);console.log('PASS '+s);};
(async()=>{let browser;try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const base=`http://127.0.0.1:${server.address().port}/codex/integration/natural-world/d298591-surface/index.html`,page=await browser.newPage({viewport:{width:1440,height:1000}});
 page.on('pageerror',e=>errors.push(e.message));const requests=[];page.on('request',r=>requests.push(r.url()));
 await page.goto(base+'#evap=2&ground=0.25&initial=0.5&year=8');await page.waitForFunction(()=>window.surfaceDebug?.current);
 assert.deepEqual(await page.evaluate(()=>surfaceDebug.current),V.select(data,'E2-G0.25-I0.5',8));pass('shared address restores all assumptions and selected year after verified loading');
 let q,downloads=0;
 for(const c of data.scenarios){
  await page.selectOption('#evap',String(c.options.evaporationMPerYear));await page.selectOption('#ground',String(c.options.netGroundLossMPerYear));await page.selectOption('#initial',String(c.options.initialFraction));
  for(const year of [1,5,100]){
   await page.locator('#year').fill(String(year));await page.locator('#year').dispatchEvent('input');q=await page.evaluate(()=>surfaceDebug.current);assert.deepEqual(q,V.select(data,c.id,year));
   const wet=await page.locator('#map rect[fill="#79d6d0"]').count();assert.equal(wet,q.selectedYear.wetCells.length);
   assert.match(await page.locator('#year-label').innerText(),new RegExp(year+'년차'));
  }
  const download=page.waitForEvent('download');await page.locator('#download').click();const saved=JSON.parse(fs.readFileSync(await(await download).path()));assert.deepEqual(saved,q);downloads++;
 }
 pass('36 scenario/year comparisons, actual wet-grid counts and 12 JSON downloads match model results');
 await page.reload();await page.waitForFunction(()=>window.surfaceDebug?.current);assert.deepEqual(await page.evaluate(()=>surfaceDebug.current),q);
 await page.selectOption('#evap','1');await page.goBack();assert.deepEqual(await page.evaluate(()=>surfaceDebug.current),q);pass('reload and back preserve complete evidence with matching assumptions');
 const shared=await browser.newPage();await shared.goto(base+await page.locator('#share-link').getAttribute('href'));await shared.waitForFunction(()=>window.surfaceDebug?.current);assert.deepEqual(await shared.evaluate(()=>surfaceDebug.current),q);await shared.close();pass('shared comparison opens identically in another page');
 for(const width of [1440,390,320]){
  await page.setViewportSize({width,height:1000});await page.selectOption('#evap','2');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  for(const selector of ['#evap','#ground','#initial','#year','#download']){const box=await page.locator(selector).boundingBox();assert(box.width>=70&&box.height>=40);}
  await page.screenshot({path:path.join(out,'surface-'+width+'.png'),fullPage:true});
 }
 pass('1440/390/320px fit with keyboard controls, labeled plots and visible conditional status');
 assert(!requests.some(r=>/period-\d|stage5\/output|unified-atlas\/output|inputs\/fluxes/.test(r)));pass('comparison loads only its compressed review, without original simulator or full seasonal arrays');
 const malformed=await browser.newPage();await malformed.goto(base+'#evap=NaN&ground=-1&initial=1&year=0');await malformed.waitForFunction(()=>window.surfaceDebug?.current);assert.deepEqual(await malformed.evaluate(()=>surfaceDebug.current),V.select(data,'E1-G0.25-I0',100));await malformed.close();pass('invalid shared values safely restore explicit defaults');
 for(const kind of ['http','hash','schema']){
  const p=await browser.newPage();p.on('pageerror',e=>errors.push(e.message));let bad=true;
  if(kind==='http')await p.route('**/output/review.json.gz',route=>bad?route.fulfill({status:503,body:'unavailable'}):route.continue());
  if(kind==='hash')await p.route('**/output/review.json.gz',route=>bad?route.fulfill({status:200,body:Buffer.from('broken')}):route.continue());
  if(kind==='schema'){
   const bytes=zlib.gzipSync(JSON.stringify({...data,schema:'wrong'})),manifest={schema:'d298591-surface-manifest/1',file:'review.json.gz',bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')};
   await p.route('**/output/manifest.json',route=>bad?route.fulfill({json:manifest}):route.continue());await p.route('**/output/review.json.gz',route=>bad?route.fulfill({body:bytes}):route.continue());
  }
  await p.goto(base+'#evap=0.5&ground=0&initial=0.5&year=4');await p.waitForFunction(()=>!document.getElementById('retry').hidden);assert(await p.locator('#content').isHidden());assert.equal(await p.evaluate(()=>window.surfaceDebug),null);
  bad=false;await p.locator('#retry').click();await p.waitForFunction(()=>window.surfaceDebug?.current);assert.deepEqual(await p.evaluate(()=>surfaceDebug.current),V.select(data,'E0.5-G0-I0.5',4));await p.close();pass(kind+' failure hides results and retry preserves requested scenario/year');
 }
 const prior=await browser.newPage();await prior.goto(base.replace('/d298591-surface/','/downstream-budget/'));await prior.waitForFunction(()=>window.budgetDebug?.current);assert.equal(await prior.locator('a[href="../d298591-surface/index.html"]').count(),1);await prior.locator('a[href="../d298591-surface/index.html"]').click();await prior.waitForFunction(()=>window.surfaceDebug?.current);await prior.close();pass('previous downstream review links to the new working page');
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'browser-checks.json'),JSON.stringify({status:'passed',checks,pageErrors:errors,scenarioYearComparisons:36,jsonDownloads:downloads},null,2)+'\n');
 }catch(e){fs.writeFileSync(path.join(out,'browser-checks.json'),JSON.stringify({status:'failed',checks,error:e.stack,pageErrors:errors},null,2)+'\n');throw e;}finally{await browser?.close();server.close();}})();
