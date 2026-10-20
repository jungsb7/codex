'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'/opt/codex/cua_node/lib/node_modules/playwright'),catalog=require('../landscape-notes/output/catalog.json'),C=require('./core.js');
const root=path.resolve(__dirname,'../../..'),out=path.join(__dirname,'validation'),checks=[],views=[],errors=[];fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/codex(?=\/)/,''));if(!file.startsWith(root+'/')||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end();}res.setHeader('Content-Type',({'.js':'text/javascript','.json':'application/json','.html':'text/html','.css':'text/css'})[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);});
const pass=s=>{checks.push(s);console.log('PASS '+s);};
(async()=>{let browser;try{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox'],headless:true});
  const base=`http://127.0.0.1:${server.address().port}/codex/integration/natural-world/unified-atlas/index.html`,page=await browser.newPage({viewport:{width:1500,height:1080}}),requests=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
  const ready=()=>page.waitForFunction(()=>window.natureDebug?.landscapeComparison,{timeout:60000});
  const first=C.compare(catalog,290975,'forest',2,9);
  await page.goto(base+C.href(first)+'&detail=false');await ready();
  assert.deepEqual(await page.evaluate(()=>natureDebug.landscapeComparison),first);pass('direct shared address restores exact two-period comparison after asynchronous catalog load');
  for(let i=0;i<catalog.entries.length;i++){
    if(i&&i%5===0){await page.reload();await ready();}
    const e=catalog.entries[i],a=i%12+1,b=(i+6)%12+1;
    await page.selectOption('#landscape-note-select',e.id);await page.selectOption('#compare-a',String(a));await page.locator('#compare-b').focus();await page.selectOption('#compare-b',String(b));
    assert.equal(await page.evaluate(()=>document.activeElement.id),'compare-b');
    const q=await page.evaluate(()=>natureDebug.landscapeComparison);assert.deepEqual(q,C.compare(catalog,e.cell,e.family,a,b));
    const wait=page.waitForEvent('download');await page.locator('#compare-json').click();const d=JSON.parse(fs.readFileSync(await (await wait).path()));assert.deepEqual(d,q);
    views.push({id:e.id,cell:e.cell,a,b,export:true});
  }
  assert(!requests.some(u=>/period-\d|chart-\d|water-metadata|stage5\/output/.test(u)));pass('all 30 controls and actual comparison JSON downloads match source without requesting seasonal arrays');
  await page.locator('#compare-swap').click();const swapped=await page.evaluate(()=>natureDebug.landscapeComparison);assert.equal(swapped.periodA,views.at(-1).b);assert.equal(swapped.periodB,views.at(-1).a);
  await page.reload();await ready();assert.deepEqual(await page.evaluate(()=>natureDebug.landscapeComparison),swapped);
  await page.selectOption('#compare-b','12');await page.goBack();assert.deepEqual(await page.evaluate(()=>natureDebug.landscapeComparison),swapped);pass('swap, refresh and browser back preserve both periods and signed differences');
  const share=await page.locator('#compare-link').getAttribute('href');const fresh=await browser.newPage();await fresh.goto(base+share);await fresh.waitForFunction(()=>window.natureDebug?.landscapeComparison);assert.deepEqual(await fresh.evaluate(()=>natureDebug.landscapeComparison),swapped);await fresh.close();pass('share link opens the same cell and both phases in a fresh page');
  // Exercise the real clipboard path and the recoverable denied-permission path.
  await page.context().grantPermissions(['clipboard-read','clipboard-write']);await page.locator('#compare-copy').click();assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),base+share);
  await page.evaluate(()=>{window.savedClipboardWrite=navigator.clipboard.writeText.bind(navigator.clipboard);navigator.clipboard.writeText=async()=>{throw Error('denied');};});
  await page.locator('#compare-copy').click();assert.match(await page.locator('#compare-copy-status').innerText(),/복사하지 못했습니다/);
  await page.evaluate(()=>navigator.clipboard.writeText=window.savedClipboardWrite);pass('copy link succeeds and clipboard denial leaves an accessible manual link');
  await page.selectOption('#landscape-note-select','grass-164753');await page.selectOption('#compare-a','4');await page.selectOption('#compare-b','4');
  let q=await page.evaluate(()=>natureDebug.landscapeComparison);assert.equal(q.difference.temperatureC,0);assert.equal(q.difference.flowM3s,null);
  assert.match(await page.locator('.comparison-difference').innerText(),/같은 기간/);pass('same-period comparison shows zero known changes and unknown flow remains null');
  for(const width of [1500,390,320]){
    await page.setViewportSize({width,height:1080});
    for(const id of ['forest-290975','grass-164753','wetland-489597']){
      await page.selectOption('#landscape-note-select',id);await page.selectOption('#compare-a','1');await page.selectOption('#compare-b','7');await page.locator('#landscape-compare-jump').click();
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      const boxes=await page.locator('.comparison-period').evaluateAll(nodes=>nodes.map(n=>{const b=n.getBoundingClientRect();return {x:b.x,y:b.y,right:b.right,width:b.width};}));
      assert.equal(boxes[0].y,boxes[1].y);assert(boxes[0].right<=boxes[1].x);assert(boxes.every(b=>b.width>0));
      await page.locator('#landscape-comparison').screenshot({path:path.join(out,`${id}-${width}.png`)});
    }
  }pass('forest, grass and wetland remain side-by-side with usable controls at 1500px, 390px and 320px');
  await page.selectOption('#compare-a','3');await page.selectOption('#compare-b','10');await page.locator('#compare-map-b').click();
  await page.waitForFunction(()=>natureDebug.seasonPoint?.status==='available'&&natureDebug.seasonPoint.period===10);
  q=await page.evaluate(()=>natureDebug.landscapeComparison);assert.equal(q.periodA,10);assert.equal(q.periodB,3);
  const live=await page.evaluate(()=>natureDebug.seasonPoint);for(const k of ['temperatureC','precipitationMm','flowM3s'])assert.equal(live[k],q.left[k]);
  await page.waitForFunction(()=>Object.keys(natureDebug.seasonStream.pending).length===0&&natureDebug.seasonStream.cache.has(9)&&natureDebug.seasonStream.cache.has(11));const before=requests.length;
  await page.selectOption('#compare-b','6');assert.equal(requests.length,before);assert.equal(await page.evaluate(()=>natureDebug.seasonPoint.period),10);assert(await page.evaluate(()=>natureDebug.seasonStream.cache.size<=3));
  let wait=page.waitForEvent('download');await page.locator('#download').click();const exported=JSON.parse(fs.readFileSync(await (await wait).path()));assert.equal(exported.landscapeComparison.periodB,6);assert.equal(exported.season.period,10);assert.equal(exported.point.cell,exported.landscapeComparison.cell);pass('B map action preserves pair, live A values match, B-only changes fetch nothing and coordinate export agrees');
  await page.setViewportSize({width:1500,height:1080});
  const cells=await page.evaluate(()=>{const m=natureDebug.model,reps=new Set(natureDebug.landscapeCatalog.entries.map(e=>e.cell));return [0,m.a.cells.find((c,j)=>m.a.lake[j]),m.a.cells.find((c,j)=>!m.a.lake[j]&&!reps.has(c))];});
  for(const cell of cells){await page.goto(base+'#cell='+cell);await page.waitForFunction(()=>window.natureDebug?.landscapeCatalog);assert.equal(await page.evaluate(()=>natureDebug.landscapeComparison),null);assert.equal(await page.locator('#landscape-comparison').isVisible(),false);}pass('other land, ocean and original lake clear comparison instead of borrowing nearby samples');
  for(const kind of ['http','hash','version']){
    const fail=await browser.newPage();fail.on('pageerror',e=>errors.push(e.message));const pattern=kind==='http'?'**/landscape-notes/output/catalog.json':'**/landscape-notes/output/manifest.json';
    await fail.route(pattern,async r=>{if(kind==='http')return r.fulfill({status:503,body:'temporary'});const response=await r.fetch(),d=await response.json();d[kind==='hash'?'sha256':'atlasSHA256']='0'.repeat(64);return r.fulfill({json:d});});
    await fail.goto(base+C.href(first));await fail.waitForFunction(()=>window.natureDebug?.ready&&!document.getElementById('landscape-notes-retry').hidden);assert.equal(await fail.evaluate(()=>natureDebug.landscapeComparison),null);assert.equal(await fail.locator('#landscape-comparison').isVisible(),false);
    await fail.unroute(pattern);await fail.locator('#landscape-notes-retry').click();await fail.waitForFunction(()=>natureDebug.landscapeComparison);assert.equal(await fail.evaluate(()=>natureDebug.landscapeComparison.periodB),9);await fail.close();pass(kind+' catalog failure clears comparison and retry restores requested pair');
  }
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'browser-checks.json'),JSON.stringify({status:'passed',checks,views,errors},null,2)+'\n');
}catch(e){fs.writeFileSync(path.join(out,'browser-checks.json'),JSON.stringify({status:'failed',checks,views,errors,error:e.stack},null,2)+'\n');throw e;}finally{await browser?.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
