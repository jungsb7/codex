'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),cp=require('node:child_process'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'/opt/codex/cua_node/lib/node_modules/playwright');
const root=path.resolve(__dirname,'../../..'),stage=process.argv[2]||'after',out=path.join(__dirname,'validation',stage),samples=require('./samples.json');
fs.mkdirSync(out,{recursive:true});
const originals=new Map(stage==='before'?['atlas-experience/core.js','atlas-experience/ui.js','atlas-experience/detail.js','unified-atlas/render.js','unified-atlas/app.js','unified-atlas/index.html'].map(f=>[path.join(root,'integration/natural-world',f),cp.execFileSync('git',['show','c3e35086a1cbdde37424225d117eb412d56fec83:integration/natural-world/'+f],{cwd:root})]):[]);
const server=http.createServer((req,res)=>{const p=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/codex(?=\/)/,''));if(!p.startsWith(root+'/')||!fs.existsSync(p)||!fs.statSync(p).isFile()){res.writeHead(404);return res.end();}res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json'})[path.extname(p)]||'application/octet-stream');if(originals.has(p))res.end(originals.get(p));else fs.createReadStream(p).pipe(res);});
(async()=>{let browser;const results=[],errors=[];try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:1500,height:1080}});page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.address().port}/codex/integration/natural-world/unified-atlas/index.html`);await page.waitForFunction(()=>window.natureDebug?.ready);
 for(const width of [1500,390]){await page.setViewportSize({width,height:width===390?844:1080});for(const s of samples)for(const zoom of [12,24,32]){
  const hash=new URLSearchParams({mode:'nature',lon:s.coordinates[0],lat:s.coordinates[1],cell:s.cell,zoom,detail:true});await page.evaluate(hash=>{history.pushState(null,'','#'+hash);dispatchEvent(new PopStateEvent('popstate'));},hash.toString());
  await page.locator('#map').screenshot({path:path.join(out,`${s.id}-${width}-${zoom}.png`)});
  const q=await page.evaluate(()=>({cell:natureDebug.query.cell,region:natureDebug.query.region?.id,detail:natureDebug.detailInfo,stats:natureDebug.stats,overflow:document.documentElement.scrollWidth>innerWidth}));assert.equal(q.cell,s.cell);assert.equal(q.region,s.regionId);assert.equal(q.detail.newPhysicalDEM,false);assert.equal(q.overflow,false);assert.ok(q.stats.designedDetailTiles>0);results.push({id:s.id,width,zoom,...q});
 }console.log(stage+' captures width '+width+' complete');}
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'checks.json'),JSON.stringify({stage,views:results.length,errors,results},null,2)+'\n');
}finally{await browser?.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
