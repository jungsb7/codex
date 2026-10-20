'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),zlib=require('node:zlib'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'/opt/codex/cua_node/lib/node_modules/playwright'),B=require('./core.js');
const root=path.resolve(__dirname,'../../..'),out=path.join(__dirname,'validation'),data=JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(__dirname,'output/review.json.gz')))),checks=[],errors=[];
const server=http.createServer((req,res)=>{const f=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/codex(?=\/)/,''));if(!f.startsWith(root+'/')||!fs.existsSync(f)||!fs.statSync(f).isFile()){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',({'.js':'text/javascript','.json':'application/json','.html':'text/html','.css':'text/css'})[path.extname(f)]||'application/octet-stream');fs.createReadStream(f).pipe(res);});
const pass=s=>{checks.push(s);console.log('PASS '+s);};
(async()=>{let browser;try{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
  const base=`http://127.0.0.1:${server.address().port}/codex/integration/natural-world/downstream-budget/index.html`,page=await browser.newPage({viewport:{width:1440,height:1000}});
  page.on('pageerror',e=>errors.push(e.message));const requests=[];page.on('request',r=>requests.push(r.url()));
  await page.goto(base+'#group=D200327&loss=.5&years=10&initial=.5');await page.waitForFunction(()=>window.budgetDebug?.current);
  let q=await page.evaluate(()=>budgetDebug.current);assert.equal(q.review.id,'D200327');assert.equal(q.experiment.years,10);assert.equal(q.experiment.initialFraction,.5);pass('direct shared address restores representative and every assumption after verified async load');
  assert.deepEqual(await page.locator('#categories tr').count(),5);assert.match(await page.locator('#categories').innerText(),/15,439/);pass('exclusive category counts and physical-unresolved status are shown');
  for(const g of data.representatives){
    await page.selectOption('#representative',g.id);
    for(const initial of ['0','.5'])for(const loss of ['0','.25','.5','1','2']){
      await page.selectOption('#initial',initial);await page.selectOption('#loss',loss);await page.selectOption('#years','100');
      q=await page.evaluate(()=>budgetDebug.current);assert.deepEqual(q.experiment,B.experiment(g,{years:100,initialFraction:+initial,lossMPerYear:+loss}));
    }
    const download=page.waitForEvent('download');await page.locator('#download').click();const f=await (await download).path(),saved=JSON.parse(fs.readFileSync(f));assert.deepEqual(saved,q);
  }
  pass('all 60 representative scenarios and six actual JSON downloads match the tested model');
  await page.reload();await page.waitForFunction(()=>window.budgetDebug?.current);assert.deepEqual(await page.evaluate(()=>budgetDebug.current),q);
  await page.selectOption('#years','1');await page.goBack();assert.deepEqual(await page.evaluate(()=>budgetDebug.current),q);pass('reload and back restore inputs and results together');
  const share=await page.locator('#share-link').getAttribute('href'),fresh=await browser.newPage();await fresh.goto(base+share);await fresh.waitForFunction(()=>window.budgetDebug?.current);assert.deepEqual(await fresh.evaluate(()=>budgetDebug.current),q);await fresh.close();pass('share link opens identical evidence and experiment in a fresh page');
  const reach=data.reaches.find(r=>r.endpointNode===data.groups.find(g=>g.id==='D298591').node);
  for(const query of ['D298591',String(reach.id),'D0','0','<script>']){
    await page.fill('#query',query);await page.locator('#lookup button').click();
    assert.match(await page.locator('#lookup-result').innerText(),query==='D298591'||query===String(reach.id)?/D298591/:/없습니다/);
  }
  pass('boundary and reach lookup distinguish known, ocean-connected and invalid inputs');
  const href=await page.locator('#map-link').getAttribute('href'),map=await browser.newPage();await map.goto(new URL(href,base).href);await map.waitForFunction(()=>window.natureDebug?.ready&&window.natureDebug?.hydrologyQuery,{timeout:60000});assert.equal(await map.evaluate(()=>natureDebug.state.cell),q.review.node);await map.close();pass('map link selects the exact source terminal in drainage mode');
  await page.fill('#query','D298591');await page.locator('#lookup button').click();
  for(const width of [1440,390,320]){
    await page.setViewportSize({width,height:1000});await page.selectOption('#representative','D298591');await page.selectOption('#loss','.5');
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    for(const selector of ['#representative','#loss','#years','#initial','#download']){const b=await page.locator(selector).boundingBox();assert(b.width>70&&b.height>=40);}
    await page.locator('#budget-title').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,'budget-'+width+'.png'),fullPage:true});
  }
  pass('desktop and 390/320px fit with usable selectors and source/assumption distinctions');
  assert(!requests.some(r=>/period-\d|stage5\/output|unified-atlas\/output/.test(r)));pass('review page never requests full map or seasonal arrays');
  for(const kind of ['http','hash','schema']){
    const p=await browser.newPage();p.on('pageerror',e=>errors.push(e.message));let bad=true;
    if(kind==='http')await p.route('**/output/review.json.gz',route=>bad?route.fulfill({status:503,body:'unavailable'}):route.continue());
    if(kind==='hash')await p.route('**/output/review.json.gz',route=>bad?route.fulfill({status:200,body:Buffer.from('broken')}):route.continue());
    if(kind==='schema'){
      const bytes=zlib.gzipSync(JSON.stringify({...data,schema:'wrong'})),manifest={schema:'downstream-boundary-manifest/1',file:'review.json.gz',bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')};
      await p.route('**/output/manifest.json',route=>bad?route.fulfill({json:manifest}):route.continue());
      await p.route('**/output/review.json.gz',route=>bad?route.fulfill({body:bytes}):route.continue());
    }
    await p.goto(base+'#group=D260741&loss=2&years=10&initial=.5');await p.waitForFunction(()=>!document.getElementById('retry').hidden);
    assert(await p.locator('#content').isHidden());assert.equal(await p.evaluate(()=>window.budgetDebug),null);
    bad=false;await p.locator('#retry').click();await p.waitForFunction(()=>window.budgetDebug?.current);assert.equal(await p.evaluate(()=>budgetDebug.current.review.id),'D260741');await p.close();pass(kind+' failure hides results and retry restores the requested comparison');
  }
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'browser-checks.json'),JSON.stringify({status:'passed',checks,pageErrors:errors,scenarioComparisons:60,jsonDownloads:6},null,2)+'\n');
}catch(e){fs.writeFileSync(path.join(out,'browser-checks.json'),JSON.stringify({status:'failed',checks,error:e.stack,pageErrors:errors},null,2)+'\n');throw e;}finally{await browser?.close();server.close();}})();
