'use strict';
const fs=require('node:fs'),path=require('node:path'),z=require('node:zlib'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const C=require('./core.cjs'),N=require('../inland-routing/core.js'),cfg=require('./scenarios.json');
const network=require('../inland-routing/output/catalog.json'),all=require('../basin-water-budget/inputs/models.json'),raw=require('../basin-water-budget/source.cjs').read();
const models=all.models.filter(m=>!['D298591','D301678','D307820'].includes(m.id));
assert.equal(models.length,57);
const prepared=C.prepare(network,models,raw),selected=new Set(models.map(m=>m.id));
const original=N.run(network,{years:cfg.common.years,lossMPerYear:0,initialFraction:0});
const old=original.boundaries.filter(b=>selected.has(b.id)),sum=(a,k)=>a.reduce((s,r)=>s+r[k],0);
const removed={sourceInflowM3:sum(old,'totalSourceInflowM3'),netLossM3:sum(old,'totalNetLossM3'),initialInventoryM3:sum(old,'initialInventoryM3'),finalInventoryM3:sum(old,'finalInventoryM3'),oceanDeliveryM3:sum(old.filter(b=>network.groups.find(g=>g.id===b.id).target.kind==='ocean'),'totalReleaseM3')};
const scenarios=cfg.scenarios.map(s=>{
 console.log('Computing',s.id);const r=C.run(prepared,{...cfg.common,...s.changes}),t=r.totals,g=original.summary;
 const global={initialInventoryM3:g.initialInventoryM3-removed.initialInventoryM3+t.initialInventoryM3,
  externalInputM3:g.totalSourceInflowM3-removed.sourceInflowM3+t.precipitationM3,
  evaporationM3:g.totalNetLossM3-removed.netLossM3+t.landEvaporationM3+t.waterEvaporationM3,
  oceanDeliveryM3:g.totalOceanDeliveryM3-removed.oceanDeliveryM3+t.oceanDeliveryM3,
  originalUnallocatedM3:g.totalUnallocatedM3,candidateUnresolvedM3:t.unresolvedM3,
  finalInventoryM3:g.finalInventoryM3-removed.finalInventoryM3+t.finalInventoryM3};
 global.residualM3=global.initialInventoryM3+global.externalInputM3-global.evaporationM3-global.oceanDeliveryM3-global.originalUnallocatedM3-global.candidateUnresolvedM3-global.finalInventoryM3;
 assert(Math.abs(global.residualM3)<global.externalInputM3*1e-10);
 console.log(JSON.stringify({id:s.id,status:r.status,totals:t,maxAnnualResidualM3:r.maxAnnualResidualM3}));
 return {id:s.id,label:s.label,...r,global,replacement:{removed,internalReceiptsCountedAsExternal:false}};
});
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const sources=['../basin-water-budget/inputs/models.json','../basin-water-budget/inputs/flux-manifest.json','../inland-routing/output/catalog.json','../pond-budget/core.js','../water-budget-link/surface.cjs','core.cjs','scenarios.json'];
const payload={schema:'finite-water-model/1',provenance:{baseCommit:'ffddacdf0e9fbc9d34497d3d118696014331b823',archiveCommit:'4afae5da3a7730b79ced1d2b9b7a8bc3041689c0',worldHash:raw.worldHash,geometryHash:raw.geometryHash,sha256:Object.fromEntries(sources.map(p=>[p,hash(fs.readFileSync(path.join(__dirname,p)))]))},scope:{boundaries:57,sourceCells:models.reduce((s,m)=>s+m.assignments.length,0),reaches:2637,totalUnresolvedReaches:23022,remainingWithoutThisModel:20385,originalGraphsChanged:false},assumptions:cfg,scenarios};
const out=path.join(__dirname,'output'),bytes=z.gzipSync(JSON.stringify(payload),{level:9,mtime:0});
fs.writeFileSync(path.join(out,'review.json.gz'),bytes);
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify({file:'review.json.gz',bytes:bytes.length,sha256:hash(bytes)},null,2)+'\n');
fs.writeFileSync(path.join(out,'summary.json'),JSON.stringify({...payload,scenarios:scenarios.map(s=>({...s,boundaries:s.boundaries.map(({annual,...b})=>b)}))},null,2)+'\n');
console.log('Output',bytes.length);
