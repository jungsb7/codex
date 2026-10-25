'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const [inputArg,checksArg,outputArg]=process.argv.slice(2);
assert(outputArg,'Usage: node stage.cjs VERIFIED_CANDIDATE CHECKS NEW_SITE');
const input=path.resolve(inputArg),checks=path.resolve(checksArg),output=path.resolve(outputArg),baseline=JSON.parse(fs.readFileSync(path.join(__dirname,'baseline.json')));
assert(!fs.existsSync(output),'Site destination exists');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const rows=JSON.parse(fs.readFileSync(path.join(checks,'candidate-files.json')));
assert.equal(hash(JSON.stringify(rows.map(r=>[r.path,r.bytes,r.sha256]).sort((a,b)=>a[0]<b[0]?-1:1))),baseline.fingerprint,'Package differs from the locally verified release');
assert.equal(rows.length,baseline.files);
const write=(p,b)=>{fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,b,{flag:'wx'});};
for(const r of rows){assert(!path.isAbsolute(r.path)&&!r.path.split('/').includes('..'));const b=fs.readFileSync(path.join(input,r.path));assert.equal(b.length,r.bytes);assert.equal(hash(b),r.sha256);write(path.join(output,r.path),b);}
const prefix='integration/natural-world/convergence-report-20261026',reportHashes={};
for(const name of fs.readdirSync(path.join(__dirname,'report')).sort()){const b=fs.readFileSync(path.join(__dirname,'report',name));write(path.join(output,prefix,name),b);reportHashes[name]=hash(b);}
const link='<a href="../convergence-report-20261026/index.html">32지점 재검증 · 연구 후보 ↗</a>';
for(const [rel,needle]of [['integration/natural-world/unified-atlas/index.html','<a href="README.md">지도 안내 ↗</a>'],['integration/natural-world/pressure-coupling/index.html','</nav>']]){
 const p=path.join(output,rel),old=fs.readFileSync(p,'utf8');assert.equal(old.split(needle).length,2);fs.writeFileSync(p,old.replace(needle,link+needle));
}
write(path.join(output,'release.json'),JSON.stringify({schema:'planet-atlas-pages-release/1',sourceCommit:baseline.sourceCommit,workflowCommit:process.env.GITHUB_SHA||null,basePackageFingerprint:baseline.fingerprint,physicalModel:'original-phase54',researchCandidate:'v3a-report-only',candidateAdopted:false,actual:null,fullNumericalConvergence:false,report:prefix+'/index.html',reportHashes})+'\n');
const inventory=[];
function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name<b.name?-1:1)){const p=path.join(dir,e.name);assert(!e.isSymbolicLink());if(e.isDirectory())walk(p);else{assert(e.isFile());const b=fs.readFileSync(p);inventory.push({path:path.relative(output,p).split(path.sep).join('/'),bytes:b.length,sha256:hash(b)});}}}
walk(output);
let links=0;const missing=[];
for(const r of inventory.filter(r=>r.path.endsWith('.html'))){for(const m of fs.readFileSync(path.join(output,r.path),'utf8').matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/g)){if(/^(?:https?:|mailto:|data:|javascript:|#)/.test(m[1]))continue;const url=new URL(m[1],'https://release.invalid/codex/'+r.path);if(url.hostname!=='release.invalid')continue;assert(url.pathname.startsWith('/codex/'));const target=decodeURIComponent(url.pathname.slice(7));links++;if(!fs.existsSync(path.join(output,target)))missing.push({from:r.path,target});}}
assert.deepEqual(missing,[],'Missing published static links');
const bytes=inventory.reduce((sum,r)=>sum+r.bytes,0);assert(bytes<1e9,'Published files must stay below one billion bytes');
const result={status:'passed',sourceCommit:baseline.sourceCommit,basePackageFingerprint:baseline.fingerprint,baseFilesByteExactBeforeNavigation:rows.length,reportOnlyCandidate:true,files:inventory.length,bytes,headroomToOneBillionBytes:1e9-bytes,htmlPages:inventory.filter(r=>r.path.endsWith('.html')).length,staticLinks:links,missing,originalSourceOverwritten:false};
write(path.join(checks,'release-audit.json'),JSON.stringify(result,null,2)+'\n');
write(path.join(checks,'release-files.json'),JSON.stringify(inventory,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
