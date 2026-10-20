'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),zlib=require('node:zlib'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'/opt/codex/cua_node/lib/node_modules/playwright'),V=require('./view.js');
const root=path.resolve(__dirname,'../../..'),out=path.join(__dirname,'validation'),data=V.validate(JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(__dirname,'output/review.json.gz'))))),checks=[],errors=[];
const server=http.createServer((req,res)=>{const f=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/codex(?=\/)/,''));if(!f.startsWith(root+'/')||!fs.existsSync(f)||!fs.statSync(f).isFile()){res.writeHead(404);return res.end();}res.setHeader('Content-Type',({'.js':'text/javascript','.json':'application/json','.html':'text/html','.css':'text/css'})[path.extname(f)]||'application/octet-stream');fs.createReadStream(f).pipe(res);});
const pass=s=>{checks.push(s);console.log('PASS '+s);};
(async()=>{let browser;try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const base=`http://127.0.0.1:${server.address().port}/codex/integration/natural-world/d298591-constraints/index.html`,page=await browser.newPage({viewport:{width:1440,height:1000}}),requests=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));await page.goto(base+'#cell=274035&warming=2&factor=90&energy=E1-G0-I0&rise=1&tailwater=0.5');await page.waitForFunction(()=>window.constraintsDebug?.current);
 let q=await page.evaluate(()=>constraintsDebug.current);assert.deepEqual(q,V.select(data,{cell:274035,warmingC:2,meltFactor:90,energyId:'E1-G0-I0',stageRiseM:1,tailwaterDepthM:.5}));pass('shared URL restores all six selectors after hash/schema verification');
 let comparisons=0,downloads=0;
 const cellIds=data.summary.classes.map(c=>c.cellIds[0]);
 for(const s of data.sensitivity){
  await page.selectOption('#warming',String(s.warmingC));await page.selectOption('#factor',String(s.meltFactorMmPerCPerPeriod));
  for(const cell of cellIds){await page.selectOption('#cell',String(cell));q=await page.evaluate(()=>constraintsDebug.current);assert.deepEqual(q,V.select(data,q.selection));assert.equal(q.snow.selectedCellAccumulationMm,s.cellAccumulationMm[data.cells.findIndex(c=>c.cell===cell)]);comparisons++;}
 }
 pass('36 snow selections across all causes and12 assumptions match source-linked AI results');
 const clicked=data.summary.classes[0].cellIds[3];await page.locator(`#snow-map rect[data-cell="${clicked}"]`).click();assert.equal(await page.locator('#cell').inputValue(),String(clicked));pass('native-grid click selects the exact source cell');
 for(const e of data.energy){
  await page.selectOption('#energy',e.id);q=await page.evaluate(()=>constraintsDebug.current);assert.deepEqual(q.energy,e);assert.equal(await page.locator('#energy-periods tr').count(),12);
  const download=page.waitForEvent('download');await page.locator('#download').click();const saved=JSON.parse(fs.readFileSync(await(await download).path()));assert.deepEqual(saved,q);downloads++;
 }
 pass('all12 energy masks and actual JSON downloads preserve source, assumptions and unknowns');
 for(const r of data.outlet.levels)for(const g of r.guard){
  await page.selectOption('#rise',String(r.stageRiseM));await page.selectOption('#tailwater',String(g.tailwaterDepthM));q=await page.evaluate(()=>constraintsDebug.current);assert.deepEqual(q.outlet.guard,g);assert.match(await page.locator('#guard').innerText(),/실제 방류는 미정/);
 }
 pass('all25 stage/tailwater cases display the tested routing guard without invented discharge');
 await page.reload();await page.waitForFunction(()=>window.constraintsDebug?.current);assert.deepEqual(await page.evaluate(()=>constraintsDebug.current),q);
 await page.selectOption('#rise','0');await page.goBack();assert.deepEqual(await page.evaluate(()=>constraintsDebug.current),q);
 const fresh=await browser.newPage();await fresh.goto(base+await page.locator('#share-link').getAttribute('href'));await fresh.waitForFunction(()=>window.constraintsDebug?.current);assert.deepEqual(await fresh.evaluate(()=>constraintsDebug.current),q);await fresh.close();pass('reload, history and fresh shared page preserve complete selected evidence');
 for(const width of [1440,390,320]){
  await page.setViewportSize({width,height:1000});await page.selectOption('#warming','0');await page.selectOption('#factor','45');await page.selectOption('#cell','274035');await page.selectOption('#energy','E2-G0.25-I0');await page.selectOption('#rise','0.5');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  for(const selector of ['#cell','#warming','#factor','#energy','#rise','#tailwater','#download']){const box=await page.locator(selector).boundingBox();assert(box.width>=70&&box.height>=40);}
  await page.screenshot({path:path.join(out,'constraints-'+width+'.png'),fullPage:true});
 }
 pass('1440/390/320px layouts fit with usable labeled controls and conditional maps');
 assert(!requests.some(r=>/period-\d|stage5\/output|unified-atlas\/output|inputs\/fluxes/.test(r)));pass('review loads only its compressed evidence, without global climate or terrain arrays');
 for(const kind of ['http','hash','schema']){
  const p=await browser.newPage();p.on('pageerror',e=>errors.push(e.message));let bad=true;
  if(kind==='http')await p.route('**/output/review.json.gz',route=>bad?route.fulfill({status:503,body:'unavailable'}):route.continue());
  if(kind==='hash')await p.route('**/output/review.json.gz',route=>bad?route.fulfill({status:200,body:Buffer.from('broken')}):route.continue());
  if(kind==='schema'){const bytes=zlib.gzipSync(JSON.stringify({...data,schema:'wrong'})),manifest={schema:'d298591-constraints-manifest/1',file:'review.json.gz',bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')};await p.route('**/output/manifest.json',route=>bad?route.fulfill({json:manifest}):route.continue());await p.route('**/output/review.json.gz',route=>bad?route.fulfill({body:bytes}):route.continue());}
  await p.goto(base+'#warming=1&factor=90&rise=1');await p.waitForFunction(()=>!document.getElementById('retry').hidden);assert(await p.locator('#content').isHidden());assert.equal(await p.evaluate(()=>window.constraintsDebug),null);
  bad=false;await p.locator('#retry').click();await p.waitForFunction(()=>window.constraintsDebug?.current);assert.equal(await p.evaluate(()=>constraintsDebug.current.selection.warmingC),1);await p.close();pass(kind+' failure hides unverified values and retry restores requested assumptions');
 }
 const prior=await browser.newPage();await prior.goto(base.replace('/d298591-constraints/','/d298591-surface/'));await prior.waitForFunction(()=>window.surfaceDebug?.current);await prior.locator('a[href="../d298591-constraints/index.html"]').click();await prior.waitForFunction(()=>window.constraintsDebug?.current);await prior.close();pass('existing dynamic surface page links to working new review');
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'browser-checks.json'),JSON.stringify({status:'passed',checks,pageErrors:errors,snowComparisons:comparisons,energyComparisons:12,outletComparisons:25,jsonDownloads:downloads},null,2)+'\n');
 }catch(e){fs.writeFileSync(path.join(out,'browser-checks.json'),JSON.stringify({status:'failed',checks,error:e.stack,pageErrors:errors},null,2)+'\n');throw e;}finally{await browser?.close();server.close();}})();
