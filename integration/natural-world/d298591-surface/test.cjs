'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto');
const B=require('./core.cjs'),V=require('./view.js'),P=require('../pond-budget/core.js'),T=require('../retention-chain/core.js'),C=require('../core.js'),Codec=require('../stage5/codec.js');
const read=p=>{const b=fs.readFileSync(path.join(__dirname,p));return JSON.parse(p.endsWith('.gz')?zlib.gunzipSync(b):b);};
const data=read('output/review.json.gz'),raw=read('inputs/fluxes.json.gz'),source=B.unpack(raw),model=data.model,summary=data.summary,near=(a,b,tol=1e-8)=>assert(Math.abs(a-b)<=tol,`${a} != ${b} ± ${tol}`);
test('original 7,428 probe rows close per cell; monthly source state and all fluxes reproduce the archive',()=>{
 const f=source.fields;assert.equal(raw.rows,7428);assert.equal(source.cells.length,619);
 for(let j=0;j<619;j++){let snow=f.snowStartMm[j*12],ground=f.shallowStartMm[j*12];
  for(let m=0;m<12;m++){
   const k=j*12+m;
   near(f.precipitationMm[k],f.evaporationMm[k]+f.runoffMm[k]+f.snowChangeMm[k]+f.shallowStoreChangeMm[k],1e-9);
   near(f.snowEndMm[k]-f.snowStartMm[k],f.snowChangeMm[k]);near(f.shallowEndMm[k]-f.shallowStartMm[k],f.shallowStoreChangeMm[k]);
   const r=B.step(snow,ground,f.precipitationMm[k],f.temperatureC[k],source.rainFactor[j],1,false);
   for(const [key,field]of [['snow','snowEndMm'],['shallow','shallowEndMm'],['runoff','runoffMm'],['evaporation','evaporationMm']])near(r[key],f[field][k],1e-9);
   snow=r.snow;ground=r.shallow;
  }
 }
});
test('probe world hashes, bit-identical global runoff evidence and committed provenance remain bound',()=>{
 const evidence=read('inputs/collection.json');assert(evidence.worldUnchanged&&evidence.allLocalRunoffBitIdentical&&evidence.globalBudgetsIdentical);assert.equal(evidence.allSourceCells,268857);
 for(const [file,hash]of Object.entries(summary.provenance.inputs))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.resolve(__dirname,'..',file))).digest('hex'),hash);
 for(const [file,hash]of Object.entries(summary.provenance.code))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.resolve(__dirname,'..',file))).digest('hex'),hash);
 assert.equal(raw.worldHash,summary.provenance.worldHash);assert.equal(raw.geometryHash,summary.provenance.geometryHash);
});
test('source phase averaging matches earlier transported boundary inflow within Float32 rounding',()=>{
 const e=summary.sourceEvidence;for(let k=0;k<12;k++)near(e.alignedRunoffM3[k],e.priorPeriodInflowM3[k],e.priorPeriodInflowM3[k]*1e-7);
 assert(e.annual.runoffM3>87e9&&e.annual.runoffM3<88e9);
});
test('619 deliveries independently follow canonical routing to original physical entries and sphere areas',()=>{
 const w=read('../stage3/output/waterways.json'),n=1536*768,a=Object.fromEntries(['canonical','receiver','entry'].map(k=>[k,Codec.decode(w.fields[k].data,n,w.fields[k].type)])),column=new Map(model.columns.map(c=>[c.cell,c]));
 assert.equal(new Set(model.assignments.map(c=>c.cell)).size,619);
 model.assignments.forEach((r,j)=>{
  near(source.area[j],C.rowArea(1536,768,Math.floor(r.cell/1536))*1e6,.001);
  let entry=r.cell;if(!column.has(r.cell)){let x=a.canonical[r.cell],last=-1,steps=0;while(x!==model.node){last=x;x=a.receiver[x];assert(++steps<n);}entry=a.entry[last];}
  assert.equal(entry,r.entryCell);assert.equal(column.get(entry).leaf,r.leaf);
 });
 assert(model.columns.every(c=>raw.cells.includes(c.cell)));
});
test('all local pond merge thresholds agree with independent native-cell minimax paths',()=>{
 const tree=P.hierarchy(model.partition,model.crestM);
 const lca=(node,a,b)=>{if(node.leaf!==null)return node.h.minElevationM;const child=node.children.find(c=>c.leaves.includes(a)&&c.leaves.includes(b));return child?lca(child,a,b):node.mergeM;};
 for(const leaf of tree.root.leaves){const independent=T.connectivity(model.columns,1536,768,leaf);for(const other of tree.root.leaves)near(lca(tree.root,leaf,other),independent.cost.get(other),1e-7);}
 near(tree.root.capacityM3,model.columns.reduce((s,c)=>s+Math.max(0,model.crestM-c.elevationM)*c.areaM2,0),.01);
});
test('fill and dry across every local saddle conserve independently integrated column volumes',()=>{
 for(const group of model.partition.groups){
  const tree=P.hierarchy(model.partition,model.crestM),capacity=tree.root.capacityM3;
  const excess=P.inject(tree.root,group.id,capacity*1.3);near(excess,.3*capacity,.01);
  let previous=capacity;
  for(const depth of [.01,.1,1,5,1000]){
   const removed=P.removeDepth(tree.root,depth),pools=P.activePools(tree.root);
   const geometric=pools.reduce((sum,p)=>sum+model.columns.filter(c=>p.leaves.includes(c.leaf)).reduce((s,c)=>s+Math.max(0,p.levelM-c.elevationM)*c.areaM2,0),0);
   near(geometric,tree.root.volumeM3,.01);near(previous-removed,geometric,.01);previous=geometric;
  }
  near(tree.root.volumeM3,0);
 }
});
test('wet conversion retains shallow inventory and routes rain/snow exactly once, with no land ET/runoff',()=>{
 const toy={...model,columns:[{cell:0,leaf:0,elevationM:0,areaM2:1000}],partition:{groups:[{id:0,columns:[{cell:0,elevationM:0,areaM2:1000}]}],edges:[]},assignments:[{cell:0,leaf:0}],initialLeaf:0,crestM:10};
 const f={precipitationMm:new Float64Array(12).fill(100),temperatureC:new Float64Array(12).fill(10),snowStartMm:new Float64Array(12).fill(20),shallowStartMm:new Float64Array(12).fill(40)};
 const r=B.simulate(toy,{cells:[0],area:[1000],rainFactor:[.5],fields:f},{years:1,substeps:1,evaporationMPerYear:0,netGroundLossMPerYear:0,initialFraction:.5});
 near(r.final.poolM3,6220);near(r.final.shallowM3,40);near(r.final.snowM3,0);
 near(r.totals.precipitationM3,1200);near(r.totals.directWaterM3,1220);near(r.totals.landRunoffM3,0);near(r.totals.landEvaporationM3,0);near(r.totals.residualM3,0);
});
test('submerged shallow storage survives and resumes on drying; snow carries across both switches',()=>{
 const wet=B.step(100,70,20,-5,.5,1,true);near(wet.snow,120);near(wet.shallow,70);near(wet.directWater,0);
 const dry=B.step(wet.snow,wet.shallow,0,3,.5,1,false);
 near(120+70,dry.snow+dry.shallow+dry.evaporation+dry.runoff,1e-10);assert(dry.shallow!==70&&dry.runoff>0&&dry.snow===0);
 const wetAgain=B.step(dry.snow,dry.shallow,10,3,.5,1,true);near(wetAgain.shallow,dry.shallow);near(wetAgain.directWater,10);
});
test('all 12 century scenarios conserve external water and internal delivery with independent end inventories',()=>{
 assert.equal(data.scenarios.length,12);
 for(const c of data.scenarios){
  const t=c.totals,o=c.options,last=c.final;
  near(t.precipitationM3+o.initialPoolM3+o.initialSnowM3+o.initialShallowM3,t.landEvaporationM3+t.waterEvaporationM3+t.netGroundLossM3+t.boundaryExcessM3+last.poolM3+last.snowM3+last.shallowM3,1);
  assert(c.maxPeriodResidualM3<.1&&Math.abs(t.residualM3)<1);
  for(const a of c.annual){near(a.landRunoffM3+a.directWaterM3,a.waterEvaporationM3+a.netGroundLossM3+a.boundaryExcessM3+a.poolChangeM3,.02);assert(a.poolM3>=0&&a.poolM3<=summary.capacityM3+.01);assert(new Set(a.wetCells).size===a.wetCells.length);}
 }
 assert(data.scenarios.some(c=>c.dryTransitions>100));assert(data.scenarios.some(c=>c.firstExcess===null));assert(data.scenarios.some(c=>c.firstExcess!==null));
});
test('saved annual wet masks and areas equal native elevation tests for each active pool',()=>{
 for(const c of data.scenarios)for(const r of [...c.annual,...c.periods]){
  const levels=new Map(r.pools.flatMap(p=>p.leaves.map(l=>[l,p.levelM]))),wet=model.columns.filter(col=>col.elevationM<(levels.get(col.leaf)??-Infinity));
  assert.deepEqual(r.wetCells,wet.map(c=>c.cell));near(r.areaM2,wet.reduce((s,c)=>s+c.areaM2,0),.001);
 }
});
test('wet/dry and overflowing cases pass 30/60/120 refinement without declaring universal convergence',()=>{
 assert.equal(summary.convergence.length,4);
 for(const c of summary.convergence){
  assert.deepEqual(c.runs.map(r=>r.substeps),[30,60,120]);assert(c.relative60to120.pool<.001);assert(c.relative60to120.excess<.001);
  assert(c.runs.every(r=>(r.firstExcess===null)===(c.runs[0].firstExcess===null)));
  assert(c.runs.every(r=>Math.abs(r.totalResidualM3)<1));
 }
});
test('free-flow rating requires positive head and reverses to required width, without actual outlet assignment',()=>{
 near(B.discharge(1.5,20,1),30);near(B.discharge(1.5,20,0),0);assert.equal(B.requiredWidth(30,1.5,0),null);
 for(const c of summary.outlet.cases)for(const r of c.requiredWidths){near(B.discharge(1.71,r.minWidthM,r.headM),c.peakPeriodExcess.meanRateM3S,1e-8);near(B.discharge(1.38,r.maxWidthM,r.headM),c.peakPeriodExcess.meanRateM3S,1e-8);}
 for(const k of ['actualWidthM','actualHeadM','actualTailwaterM','actualDischargeM3S'])assert.equal(summary.outlet[k],null);
 assert.throws(()=>B.discharge(1,-1,1));assert.throws(()=>B.requiredWidth(1,0,1));
});
test('UI and AI expose every scenario/year and preserve physical null values; invalid selections fail',()=>{
 V.validate(data);for(const c of data.scenarios)for(let year=1;year<=100;year++){const selected=V.select(data,c.id,year);assert.deepEqual(selected.selectedYear,c.annual[year-1]);assert(Object.values(selected.actual).every(v=>v===null));assert.equal(selected.automaticAdoption,false);}
 assert.throws(()=>V.select(data,'D0',100));assert.throws(()=>V.select(data,data.scenarios[0].id,0));assert.throws(()=>V.select(data,data.scenarios[0].id,1.5));
 assert.throws(()=>V.validate({...data,schema:'other'}));assert.equal(data.summary.physicalResolvedReaches,0);assert.equal(data.summary.unresolvedReaches,23022);
});
