'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),zlib=require('node:zlib'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'/opt/codex/cua_node/lib/node_modules/playwright'),V=require('./view.js');
const root=path.resolve(__dirname,'../../..'),out=path.join(__dirname,'validation'),data=V.validate(JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(__dirname,'output/review.json.gz'))))),checks=[],errors=[];
const server=http.createServer((req,res)=>{const f=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/codex(?=\/)/,''));if(!f.startsWith(root+'/')||!fs.existsSync(f)||!fs.statSync(f).isFile()){res.writeHead(404);return res.end();}res.setHeader('Content-Type',({'.js':'text/javascript','.json':'application/json','.html':'text/html','.css':'text/css'})[path.extname(f)]||'application/octet-stream');fs.createReadStream(f).pipe(res);});
const pass=s=>{checks.push(s);console.log('PASS '+s);};
(async()=>{let browser;try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const base=`http://127.0.0.1:${server.address().port}/codex/integration/natural-world/d298591-routing/index.html`,page=await browser.newPage({viewport:{width:1440,height:1000}}),defaultId='E1-G0.25-I0-W1000-C1.5-T0';
 page.on('pageerror',e=>errors.push(e.message));const requests=[];page.on('request',r=>requests.push(r.url()));
 await page.goto(base+'#evap=1&ground=0.25&initial=0&width=1000&tailwater=0&year=8');await page.waitForFunction(()=>window.routingDebug?.current);assert.deepEqual(await page.evaluate(()=>routingDebug.current),V.select(data,defaultId,8));pass('shared URL restores all outlet and loss assumptions with selected time');
 let q,comparisons=0,downloads=0;
 const cases=data.scenarios.filter(c=>c.options.tailwaterRiseM===0||c.options.evaporationMPerYear===1&&c.options.netGroundLossMPerYear===.25&&c.options.initialFraction===0&&c.options.widthM===1000);
 for(const c of cases){
  for(const [key,field]of [['evap','evaporationMPerYear'],['ground','netGroundLossMPerYear'],['initial','initialFraction'],['width','widthM'],['tailwater','tailwaterRiseM']])await page.selectOption('#'+key,String(c.options[field]));
  for(const year of [...new Set([0,Math.min(1,c.annual.length),c.annual.length])]){
   if(c.annual.length){await page.locator('#year').fill(String(year));await page.locator('#year').dispatchEvent('input');}
   q=await page.evaluate(()=>routingDebug.current);assert.deepEqual(q,V.select(data,c.id,year));assert.equal(await page.locator('#map rect[fill="#79d6d0"]').count(),q.selectedYear.wetCells.length);comparisons++;
   if(c.status==='unsupported-tailwater'){assert(await page.locator('#year').isDisabled());assert.match(await page.locator('#run-status').innerText(),/시작하지/);assert.match(await page.locator('#metrics').innerText(),/미정/);}
   if(c.stop?.reason==='alternate-outlet-limit'&&year===c.annual.length){assert.match(await page.locator('#ledger-title').innerText(),/부분/);assert.match(await page.locator('#run-status').innerText(),/이후.*계산하지/);assert.equal(+(await page.locator('#year').getAttribute('max')),c.annual.length);}
  }
  const wait=page.waitForEvent('download');await page.locator('#download').click();const saved=JSON.parse(fs.readFileSync(await(await wait).path()));assert.deepEqual(saved,q);downloads++;
 }
 pass('all36 free-flow cases and3 tailwater guards match snapshots, partial ledgers and downloaded JSON');
 await page.reload();await page.waitForFunction(()=>window.routingDebug?.current);assert.deepEqual(await page.evaluate(()=>routingDebug.current),q);await page.selectOption('#tailwater','0');await page.goBack();assert.deepEqual(await page.evaluate(()=>routingDebug.current),q);pass('reload and history preserve held state without fabricating later years');
 const shared=await browser.newPage();await shared.goto(base+await page.locator('#share-link').getAttribute('href'));await shared.waitForFunction(()=>window.routingDebug?.current);assert.deepEqual(await shared.evaluate(()=>routingDebug.current),q);await shared.close();pass('shared held condition restores in a fresh page');
 for(const [width,tailwater,outlet]of [[1440,'0','1000'],[390,'0','100'],[320,'0.5','1000']]){
  await page.setViewportSize({width,height:1000});await page.selectOption('#tailwater',tailwater);await page.selectOption('#width',outlet);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  for(const selector of ['#evap','#ground','#initial','#width','#tailwater','#download']){const box=await page.locator(selector).boundingBox();assert(box.width>=70&&box.height>=40);}
  assert.equal(await page.locator('#map rect[stroke="#e9c88c"]').count(),11);await page.screenshot({path:path.join(out,'routing-'+width+'.png'),fullPage:true});
 }
 pass('1440/390/320px show completed, limit and tailwater states with usable controls and11 extra cells');
 assert(!requests.some(r=>/period-\d|stage5\/output|unified-atlas\/output|inputs\/fluxes/.test(r)));pass('page loads only bound compressed evidence without global seasonal arrays');
 const invalid=await browser.newPage();await invalid.goto(base+'#evap=NaN&ground=-1&initial=1&width=2&tailwater=-3&year=1000');await invalid.waitForFunction(()=>window.routingDebug?.current);assert.deepEqual(await invalid.evaluate(()=>routingDebug.current),V.select(data,defaultId,100));await invalid.close();pass('invalid shared controls restore explicit valid defaults');
 for(const kind of ['http','hash','schema']){
  const p=await browser.newPage();p.on('pageerror',e=>errors.push(e.message));let bad=true;
  if(kind==='http')await p.route('**/output/review.json.gz',r=>bad?r.fulfill({status:503,body:'unavailable'}):r.continue());
  if(kind==='hash')await p.route('**/output/review.json.gz',r=>bad?r.fulfill({body:Buffer.from('broken')}):r.continue());
  if(kind==='schema'){const bytes=zlib.gzipSync(JSON.stringify({...data,schema:'bad'})),manifest={schema:'d298591-routing-manifest/1',file:'review.json.gz',bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')};await p.route('**/output/manifest.json',r=>bad?r.fulfill({json:manifest}):r.continue());await p.route('**/output/review.json.gz',r=>bad?r.fulfill({body:bytes}):r.continue());}
  await p.goto(base+'#width=100&year=1');await p.waitForFunction(()=>!document.getElementById('retry').hidden);assert(await p.locator('#content').isHidden());assert.equal(await p.evaluate(()=>window.routingDebug),null);bad=false;await p.locator('#retry').click();await p.waitForFunction(()=>window.routingDebug?.current);assert.deepEqual(await p.evaluate(()=>routingDebug.current),V.select(data,'E1-G0.25-I0-W100-C1.5-T0',1));await p.close();pass(kind+' failure hides results and retry retains requested condition');
 }
 const prior=await browser.newPage();await prior.goto(base.replace('/d298591-routing/','/d298591-constraints/'));await prior.locator('a[href="../d298591-routing/index.html"]').click();await prior.waitForFunction(()=>window.routingDebug?.current);await prior.close();pass('previous constraints review links to functioning outlet page');
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'browser-checks.json'),JSON.stringify({status:'passed',checks,pageErrors:errors,scenarioTimeComparisons:comparisons,jsonDownloads:downloads,viewports:[1440,390,320]},null,2)+'\n');
 }catch(e){fs.writeFileSync(path.join(out,'browser-checks.json'),JSON.stringify({status:'failed',checks,error:e.stack,pageErrors:errors},null,2)+'\n');throw e;}finally{await browser?.close();server.close();}})();
