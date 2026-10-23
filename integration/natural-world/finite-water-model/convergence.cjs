'use strict';
const fs=require('node:fs'),path=require('node:path'),z=require('node:zlib'),crypto=require('node:crypto'),assert=require('node:assert/strict'),C=require('./core.cjs'),cfg=require('./scenarios.json');
const n=Number(process.argv[2]||120);
assert(Number.isInteger(n)&&n>cfg.common.substeps&&n<=240);
const files=['core.cjs','scenarios.json','../pond-budget/core.js','../retention-review/core.js','../retention-chain/core.js','../water-budget-link/surface.cjs','../basin-water-budget/source.cjs','../inland-routing/core.js','../inland-routing/output/catalog.json','../basin-water-budget/inputs/models.json','../basin-water-budget/inputs/flux-manifest.json'];
const fingerprint=crypto.createHash('sha256').update(Buffer.concat(files.map(p=>fs.readFileSync(path.resolve(__dirname,p))))).digest('hex');
const cache=__dirname+'/output/.refinement-'+n+'.json.gz',keyfile=__dirname+'/output/.refinement-'+n+'-key.json';
let r;
if(fs.existsSync(cache)&&fs.existsSync(keyfile)&&JSON.parse(fs.readFileSync(keyfile)).fingerprint===fingerprint){
 r=JSON.parse(z.gunzipSync(fs.readFileSync(cache)));assert.deepEqual(r.options,{...cfg.common,substeps:n});console.log('Reusing exact-input refinement',n);
}else{
 const all=require('../basin-water-budget/inputs/models.json'),network=require('../inland-routing/output/catalog.json'),raw=require('../basin-water-budget/source.cjs').read();
 const p=C.prepare(network,all.models.filter(m=>!['D298591','D301678','D307820'].includes(m.id)),raw);
 console.log('Refining full57-boundary100-year component to',n);
 r=C.run(p,{...cfg.common,substeps:n});fs.writeFileSync(cache,z.gzipSync(JSON.stringify(r)));fs.writeFileSync(keyfile,JSON.stringify({fingerprint}));
}
const baseline=require('./output/summary.json').scenarios.find(s=>s.id==='reference');
assert.deepEqual(baseline.options,cfg.common,'Build current baseline first; fine result is cached');
const keys=['infiltrationM3','rechargeM3','groundwaterReturnM3','oceanDeliveryM3','finalInventoryM3'];
const comparisons=Object.fromEntries(keys.map(k=>[k,{coarse:baseline.totals[k],fine:r.totals[k],relativeDifference:Math.abs(r.totals[k]-baseline.totals[k])/Math.max(1,Math.abs(r.totals[k]))}]));
const boundaryComparisons=r.boundaries.map(b=>{const old=baseline.boundaries.find(x=>x.id===b.id);return {id:b.id,releaseDifferenceM3:b.totals.releasedM3-old.totals.releasedM3,releaseDifferenceRelativeToLocalSupply:Math.abs(b.totals.releasedM3-old.totals.releasedM3)/Math.max(1,b.totals.precipitationM3+b.totals.receivedM3),finalInventoryDifferenceM3:Object.keys(b.final).reduce((s,k)=>s+b.final[k]-old.final[k],0)};});
const maximumGlobalRelativeDifference=Math.max(...Object.values(comparisons).map(v=>v.relativeDifference)),maximumLocalSupplyRelativeDifference=Math.max(...boundaryComparisons.map(v=>v.releaseDifferenceRelativeToLocalSupply));
const status=r.status==='completed-horizon'&&maximumGlobalRelativeDifference<.01&&maximumLocalSupplyRelativeDifference<.01?'passed':'outside-tolerance';
const report={status,scope:'all57-boundaries100-years-reference-case',fingerprint,coarseSubsteps:cfg.common.substeps,fineSubsteps:n,criterion:'each cumulative selected flux/final total <1%; each boundary release difference <1% of its total supply; finite and conservative',comparisons,boundaryComparisons,maximumGlobalRelativeDifference,maximumLocalSupplyRelativeDifference,fineResidualM3:r.totals.residualM3,fineUnresolvedM3:r.totals.unresolvedM3,limitations:'Two resolutions are a stability screen, not a convergence proof or physical calibration. Sensitivity cases have no separate refinement check.'};
fs.writeFileSync(__dirname+'/validation/convergence-'+n+'.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));assert.equal(status,'passed');
