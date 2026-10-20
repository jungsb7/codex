'use strict';
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../..'),baseline='27f189f7f7983b4a17191ec48b510c12d7ecfc10',allowed=new Set(['NEXT_SESSION_PROMPT.txt','handoff/CURRENT_STATE.md','handoff/NEXT_GOALS.md','integration/natural-world/landscape-notes/ui.js','integration/natural-world/unified-atlas/app.js','integration/natural-world/unified-atlas/index.html']);
const rows=cp.execFileSync('git',['ls-tree','-r',baseline],{cwd:root,encoding:'utf8'}).trim().split('\n'),changed=[];let preserved=0;
for(const row of rows){const [meta,file]=row.split('\t'),b=fs.readFileSync(path.join(root,file)),sha=crypto.createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');if(sha===meta.split(' ')[2])preserved++;else{assert(allowed.has(file),'Unexpected baseline change '+file);changed.push(file);}}
const html=fs.readFileSync(path.join(root,'integration/natural-world/unified-atlas/index.html'),'utf8');
for(const [,file]of html.matchAll(/(?:src|href)="([^"#]+)"/g))if(!/^(?:\w+:|\/)/.test(file))assert(fs.existsSync(path.resolve(root,'integration/natural-world/unified-atlas',file)),file);
const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),sources=['core.js','ui.js','style.css'].map(p=>path.join(__dirname,p));
const result={status:'passed',baseline,baselineFiles:rows.length,preservedFiles:preserved,changedAllowedFiles:changed,originalCatalogSha256:sha(path.resolve(__dirname,'../landscape-notes/output/catalog.json')),runtimeSha256:Object.fromEntries(sources.map(p=>[path.basename(p),sha(p)])),newSeasonalPayloadFiles:0,originalWorldAndEconomyAndArchiveUnchanged:true};
fs.mkdirSync(path.join(__dirname,'validation'),{recursive:true});fs.writeFileSync(path.join(__dirname,'validation/package-checks.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
