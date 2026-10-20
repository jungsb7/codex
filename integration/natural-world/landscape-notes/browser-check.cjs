'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'/opt/codex/cua_node/lib/node_modules/playwright'),root=path.resolve(__dirname,'../../..'),out=path.join(__dirname,'validation');
const catalog=require('./output/catalog.json'),checks=[],errors=[],requests=[],views=[];
fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{const p=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/codex(?=\/)/,''));if(!p.startsWith(root+'/')||!fs.existsSync(p)||!fs.statSync(p).isFile()){res.writeHead(404);return res.end();}res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json'})[path.extname(p)]||'application/octet-stream');fs.createReadStream(p).pipe(res);});
const pass=name=>{checks.push(name);console.log('PASS '+name);};
(async()=>{let browser;try{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
  const base=`http://127.0.0.1:${server.address().port}/codex/integration/natural-world/unified-atlas/index.html`,page=await browser.newPage({viewport:{width:1500,height:1080}});
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
  const ready=()=>page.waitForFunction(()=>window.natureDebug?.landscapeCatalog,{timeout:60000});
  async function desktopCapture(){
    await page.setViewportSize({width:1500,height:1080});
    await page.goto(base+'#cell=489597&lon=89.4140625&lat=15.3515625&zoom=12&draftFamily=wetland&period=11&detail=false');await ready();
    await page.locator('#landscape-notes-point h3').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,'wetland-desktop.png')});
    await page.locator('#landscape-note-json').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,'wetland-desktop-bottom.png')});
  }
  if(process.argv.includes('--desktop-only')){await desktopCapture();return;}
  await page.goto(base+new URL(catalog.entries[0].mapHref,'https://example.test').hash);await ready();
  const all=await page.evaluate(()=>natureDebug.landscapeCatalog.entries.map(e=>Array.from({length:12},(_,k)=>LandscapeNotes.query(natureDebug.landscapeCatalog,e.cell,e.family,k+1).selectedSeason)));assert.deepEqual(all,catalog.entries.map(e=>e.seasonal.samples));
  await page.locator('#detail-enable').uncheck();
  for(const e of catalog.entries){
    // Fresh document every five pairs avoids Chromium's repeated-download limiter.
    if(views.length&&views.length%5===0){await page.reload();await ready();}
    await page.selectOption('#landscape-note-select',e.id);
    const q=await page.evaluate(()=>({note:natureDebug.landscapeDescription,cell:natureDebug.query.cell,center:natureDebug.query.center}));assert.equal(q.note.id,e.id);assert.equal(q.cell,e.cell);assert.deepEqual(q.center,e.center);
    for(const period of (e===catalog.entries[0]?Array.from({length:12},(_,k)=>k+1):[12])){await page.selectOption('#landscape-note-period',String(period));const sample=await page.evaluate(()=>natureDebug.landscapeDescription.selectedSeason);assert.deepEqual(sample,e.seasonal.samples[period-1]);}
    let wait=page.waitForEvent('download');await page.locator('#download').click();let d=JSON.parse(fs.readFileSync(await (await wait).path()));assert.equal(d.point.cell,e.cell);assert.equal(d.landscapeDescription.cell,e.cell);assert.equal(d.landscapeDescription.selectedPeriod,12);assert.equal(d.season,null);
    wait=page.waitForEvent('download');await page.locator('#landscape-note-json').click();d=JSON.parse(fs.readFileSync(await (await wait).path()));assert.equal(d.id,e.id);assert.deepEqual(d.unknown,e.unknown);
    views.push({id:e.id,cell:e.cell,periodQueries:12,periodControls:e===catalog.entries[0]?12:1,coordinateExport:true,descriptionExport:true});if(views.length%5===0)console.log('Checked '+views.length+' / 30 representatives');
  }
  pass('all 30 selections, 360 period queries, twelve phase controls and 60 real JSON downloads match catalog and map');
  assert.ok(!requests.some(u=>/period-\d|chart-\d|water-metadata|stage5\/output/.test(u)));pass('description-only browsing does not request seasonal arrays or metadata');
  await page.selectOption('#landscape-note-select','wetland-489597');await page.selectOption('#landscape-note-period','5');await page.reload();await ready();assert.equal(await page.evaluate(()=>natureDebug.landscapeDescription.selectedPeriod),5);
  await page.selectOption('#landscape-note-period','8');await page.goBack();assert.equal(await page.evaluate(()=>natureDebug.landscapeDescription.selectedPeriod),5);pass('reload and browser back preserve representative cell and phase');
  await page.locator('#landscape-note-season-map').click();await page.waitForFunction(()=>natureDebug.seasonPoint?.status==='available'&&natureDebug.seasonPoint.period===5);
  const live=await page.evaluate(()=>({note:natureDebug.landscapeDescription.selectedSeason,season:natureDebug.seasonPoint,cache:natureDebug.seasonStream.cache.size}));
  for(const k of ['temperatureC','precipitationMm','flowM3s'])assert.equal(live.note[k],live.season[k]);assert(live.cache<=3);pass('chosen phase opens lazy season map with equal live values and bounded cache');
  await page.selectOption('#evidence','original');assert.match(await page.locator('#landscape-notes-point').innerText(),/후보를 숨겼습니다/);pass('original-only view labels notes as hidden candidates and unadopted prose');
  for(const width of [390,320]){
    await page.setViewportSize({width,height:844});
    for(const id of ['forest-317360','grass-164753','wetland-489597']){
      await page.selectOption('#landscape-note-select',id);await page.selectOption('#landscape-note-period','11');
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      await page.locator('#landscape-notes-point').screenshot({path:path.join(out,`${id}-${width}.png`)});
    }
  }pass('320px and 390px forest, grass and wetland cards fit and controls work');
  await desktopCapture();
  // Non-representative, lake and ocean selection must clear prose and exported state.
  const cells=await page.evaluate(()=>{const m=natureDebug.model,s=new Set(natureDebug.landscapeCatalog.entries.map(e=>e.cell));return [0,m.a.cells.find((c,j)=>m.a.lake[j]),m.a.cells.find((c,j)=>!m.a.lake[j]&&!s.has(c))];});
  for(const cell of cells){await page.goto(base+'#cell='+cell);await ready();assert.equal(await page.evaluate(()=>natureDebug.landscapeDescription),null);assert.equal(await page.locator('#landscape-notes-point').isVisible(),false);}pass('other land, lake and ocean selections clear representative description');
  for(const kind of ['http','hash','version']){
    const fail=await browser.newPage();fail.on('pageerror',e=>errors.push(e.message));const pattern=kind==='http'?'**/landscape-notes/output/catalog.json':'**/landscape-notes/output/manifest.json';
    await fail.route(pattern,async r=>{if(kind==='http')return r.fulfill({status:503,body:'temporary'});const response=await r.fetch(),mf=await response.json();mf[kind==='hash'?'sha256':'atlasSHA256']='0'.repeat(64);return r.fulfill({json:mf});});
    await fail.goto(base+new URL(catalog.entries[0].mapHref,'https://example.test').hash);await fail.waitForFunction(()=>window.natureDebug?.ready&&!document.getElementById('landscape-notes-retry').hidden);
    assert.equal(await fail.evaluate(()=>natureDebug.landscapeDescription),null);assert.equal(await fail.locator('#landscape-notes-point').isVisible(),false);
    await fail.unroute(pattern);await fail.locator('#landscape-notes-retry').click();await fail.waitForFunction(()=>natureDebug.landscapeDescription);await fail.close();pass(kind+' failure preserves working map and retry restores checked descriptions');
  }
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'browser-checks.json'),JSON.stringify({status:'passed',checks,views,errors},null,2)+'\n');
}catch(e){fs.writeFileSync(path.join(out,'browser-checks.json'),JSON.stringify({status:'failed',checks,views,errors,error:e.stack},null,2)+'\n');throw e;}finally{await browser?.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
