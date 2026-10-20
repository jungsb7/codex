'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto'),cp=require('node:child_process');
const R=require('./core.cjs'),V=require('./view.js'),B=require('../d298591-surface/core.cjs'),P=require('../pond-budget/core.js'),T=require('../retention-chain/core.js'),C=require('../core.js'),Codec=require('../stage5/codec.js');
const read=p=>{const b=fs.readFileSync(path.resolve(__dirname,p));return JSON.parse(p.endsWith('.gz')?zlib.gunzipSync(b):b);};
const d=read('output/review.json.gz'),m=d.model,s=d.summary,raw=read('../d298591-surface/inputs/fluxes.json.gz'),source=B.unpack(raw),constraints=read('../d298591-constraints/output/review.json.gz');
const near=(a,b,t=1e-7)=>assert(Math.abs(a-b)<=t,`${a} != ${b} tolerance ${t}`);
function toy({rain=100,temperature=10,crest=1,limit=2,area=1000}={}){const columns=[{cell:0,elevationM:0,areaM2:area,leaf:0}];return {model:{columns,partition:{groups:[{id:0,columns}],edges:[]},assignments:[{cell:0,entryCell:0,leaf:0}],initialLeaf:0,outletLeaf:0,crestM:crest,limitM:limit},source:{cells:[0],area:[area],rainFactor:[.5],fields:{precipitationMm:Array(12).fill(rain),temperatureC:Array(12).fill(temperature),snowStartMm:Array(12).fill(0),shallowStartMm:Array(12).fill(0)}}};}
test('source, prior domain and calculation hashes bind every reused byte',()=>{
 for(const group of [s.provenance.inputs,s.provenance.code])for(const [p,h]of Object.entries(group))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.resolve(__dirname,'..',p))).digest('hex'),h);
 assert.equal(s.provenance.worldHash,raw.worldHash);assert.equal(s.provenance.geometryHash,raw.geometryHash);
 assert.deepEqual(m.columns.map(({leaf,...c})=>c),constraints.outlet.candidateDomain.columns);assert.equal(m.extraCells.length,11);assert.equal(m.limitM,constraints.outlet.candidateDomain.maximumExclusiveLevelM);
});
test('132 columns and 619 deliveries preserve original graph entry, source identity and spherical area',()=>{
 const w=read('../stage3/output/waterways.json'),a=Object.fromEntries(['canonical','receiver','entry','terminal'].map(k=>[k,Codec.decode(w.fields[k].data,1536*768,w.fields[k].type)])),byCell=new Map(m.columns.map(c=>[c.cell,c]));
 assert.deepEqual(m.assignments.map(a=>a.cell),source.cells);assert.equal(new Set(source.cells).size,619);
 for(const [j,r]of m.assignments.entries()){
  near(source.area[j],C.rowArea(1536,768,Math.floor(r.cell/1536))*1e6,.001);assert.equal(a.terminal[a.canonical[r.cell]],m.node);
  const candidates=[r.cell];let i=a.canonical[r.cell],steps=0;
  while(!candidates.some(c=>byCell.has(c))){assert(++steps<source.cells.length);candidates.push(i,a.entry[i]);i=a.receiver[i];}
  const expected=candidates.find(c=>byCell.has(c));assert.equal(r.entryCell,expected);assert.equal(r.leaf,byCell.get(expected).leaf);
 }
});
test('independent minimax connectivity and direct column integrals match expanded five-pool geometry',()=>{
 const t=P.hierarchy(m.partition,m.limitM);assert.equal(t.root.leaves.length,5);assert(t.root.mergeM<m.crestM);
 const lca=(node,a,b)=>{if(node.leaf!==null)return node.h.minElevationM;const c=node.children.find(c=>c.leaves.includes(a)&&c.leaves.includes(b));return c?lca(c,a,b):node.mergeM;};
 for(const a of t.root.leaves){const c=T.connectivity(m.columns,1536,768,a);for(const b of t.root.leaves)near(lca(t.root,a,b),c.cost.get(b));}
 for(const z of [m.crestM,m.crestM+.1,m.crestM+.5,m.limitM])near(t.root.h.atLevel(z).volumeM3,m.columns.reduce((v,c)=>v+Math.max(0,z-c.elevationM)*c.areaM2,0),.05);
 near(s.crestVolumeM3,read('../d298591-surface/output/summary.json').capacityM3,.01);assert(s.limitVolumeM3>s.crestVolumeM3);
});
test('exact drainage matches independent constant-area solution and crosses area knots without overdrawing',()=>{
 const t=toy({crest:1,limit:10}),root=P.hierarchy(t.model.partition,10).root;P.inject(root,0,4000);
 const seconds=35,head=(1/Math.sqrt(3)+1.5*10*seconds/(2*1000))**-2,removed=R.drain(root,1,10,1.5,seconds);near(root.volumeM3,(1+head)*1000,1e-8);near(removed,4000-root.volumeM3);
 const cols=[{cell:0,elevationM:0,areaM2:1000},{cell:1,elevationM:2,areaM2:800}],r=P.hierarchy({groups:[{id:0,columns:cols}],edges:[]},10).root;P.inject(r,0,4600); // level 3.444...
 const start=r.volumeM3;let z=r.h.atVolume(start).levelM;const dt=.0005,total=80;
 // Independent tiny-step midpoint ODE integration, explicitly switching area.
 for(let j=0;j<total/dt;j++){const f=h=>-15*Math.max(0,h-1)**1.5/(1000+(h>2?800:0));z+=dt*f(z+dt*f(z)/2);}
 R.drain(r,1,10,1.5,total);near(r.h.atVolume(r.volumeM3).levelM,z,.00001);assert(r.volumeM3>=1000&&r.volumeM3<start);
 const before=r.volumeM3;near(R.drain(r,1,0,1.5,100),0);near(r.volumeM3,before);R.drain(r,1,1e9,1.5,1e12);assert(r.volumeM3>=1000);assert.throws(()=>R.drain(r,1,-1,1,1));
});
test('rating uses SI head, zero crest flow and null for unsupported tailwater',()=>{
 near(R.rating(3,1,20,1.5,0),30*2**1.5);near(R.rating(1,1,20,1.5,-1),0);near(R.rating(0,1,20,1.5,0),0);assert.equal(R.rating(3,1,20,1.5,.05),null);assert.throws(()=>R.rating(2,1,NaN,1,0));
});
test('wet source rain replaces land runoff once and submerged stores survive',()=>{
 const t=toy({crest:10,limit:11});t.source.fields.snowStartMm.fill(20);t.source.fields.shallowStartMm.fill(40);
 const c=R.simulate(t.model,t.source,{years:1,substeps:1,initialFraction:.5,widthM:0,evaporationMPerYear:0,netGroundLossMPerYear:0});
 near(c.final.poolM3,6220);near(c.final.shallowM3,40);near(c.final.snowM3,0);near(c.totals.directWaterM3,1220);near(c.totals.landEvaporationM3,0);near(c.totals.landRunoffM3,0);near(c.totals.residualM3,0);
});
test('zero-width boundary fixture stops inside its first source period and preserves all water',()=>{
 const t=toy({crest:1,limit:1.05});const c=R.simulate(t.model,t.source,{years:100,substeps:1,initialFraction:1,widthM:0,evaporationMPerYear:0,netGroundLossMPerYear:0});
 assert.equal(c.status,'alternate-outlet-limit');near(c.final.elapsedYears,1/24,1e-9);near(c.final.poolM3,1050);near(c.totals.precipitationM3,50,1e-6);near(c.totals.conditionalReleaseM3,0);assert(c.final.heldWaterM3>=0&&c.final.heldWaterM3<1e-6);near(c.totals.residualM3,0,1e-8);assert.equal(c.annual.length,1);assert.equal(c.periods.length,1);assert.equal(c.annual[0].complete,false);assert(c.stop.unprocessedYears>99);
 assert(c.stop.bracketYears[1]-c.stop.bracketYears[0]<1e-10);
 const blocked=R.simulate(t.model,t.source,{initialFraction:1,tailwaterRiseM:.01});assert.equal(blocked.final.poolM3,1000);assert.equal(blocked.final.conditionalRateM3S,null);assert.equal(blocked.totals.precipitationM3,0);
});
test('144 cases close independent final-cell inventories and keep internal delivery separate',()=>{
 assert.equal(d.scenarios.length,144);
 for(const c of d.scenarios){
  const f=c.final,t=c.totals,o=c.options;near(t.precipitationM3+o.initialPoolM3+o.initialSnowM3+o.initialShallowM3,t.landEvaporationM3+t.waterEvaporationM3+t.netGroundLossM3+t.conditionalReleaseM3+f.heldWaterM3+f.poolM3+f.snowM3+f.shallowM3,1);
  const states=c.finalCellStores;assert.deepEqual(states.cells,source.cells);near(states.snowMm.reduce((v,x,j)=>v+x*source.area[j]/1000,0),f.snowM3,.001);near(states.shallowMm.reduce((v,x,j)=>v+x*source.area[j]/1000,0),f.shallowM3,.001);assert(states.snowMm.every(x=>x>=0)&&states.shallowMm.every(x=>x>=0));
  assert(Math.abs(t.residualM3)<1&&c.maxPeriodResidualM3<.01);
  for(const a of c.annual){near(a.landRunoffM3+a.directWaterM3,a.waterEvaporationM3+a.netGroundLossM3+a.conditionalReleaseM3+a.heldWaterM3+a.poolChangeM3,.05);assert(a.poolM3<=s.limitVolumeM3+.01);}
  if(c.stop?.reason==='alternate-outlet-limit'){assert.equal(c.final.conditionalRateM3S,null);assert.equal(c.annual.at(-1).complete,false);near(f.poolM3,s.limitVolumeM3,.01);assert(c.stop.unprocessedYears>0);assert(f.heldWaterM3>=0&&f.heldWaterM3<1);assert.equal(c.annual.at(-1).elapsedYears,f.elapsedYears);}
 }
});
test('all saved wet masks and model area equal independent native-level comparisons',()=>{
 for(const c of d.scenarios)for(const r of [c.initial,...c.annual,...c.periods]){
  const levels=new Map(r.pools.flatMap(p=>p.leaves.map(l=>[l,p.levelM]))),wet=m.columns.filter(col=>col.elevationM<(levels.get(col.leaf)??-Infinity));assert.deepEqual(r.wetCells,wet.map(c=>c.cell));near(r.areaM2,wet.reduce((a,c)=>a+c.areaM2,0),.001);
  const volume=r.pools.reduce((v,p)=>v+m.columns.filter(c=>p.leaves.includes(c.leaf)).reduce((v,c)=>v+Math.max(0,p.levelM-c.elevationM)*c.areaM2,0),0);near(volume,r.poolM3,.05);
 }
});
test('108 high-tailwater cases hold original stores without starting forcing or inventing zero release rate',()=>{
 const blocked=d.scenarios.filter(c=>c.status==='unsupported-tailwater');assert.equal(blocked.length,108);for(const c of blocked){assert.equal(c.final.elapsedYears,0);assert.equal(c.final.conditionalRateM3S,null);assert.equal(c.annual.length,0);near(c.final.poolM3,c.options.initialPoolM3,.001);near(c.final.snowM3,c.options.initialSnowM3);near(c.final.shallowM3,c.options.initialShallowM3);assert(Object.values(c.totals).every(x=>x===0));}
});
test('upstream persistent SWE is carried for the processed duration, including a partial stop year',()=>{
 const f=source.fields,indices=source.cells.map((_,j)=>j).filter(j=>Array.from({length:12},(_,k)=>f.temperatureC[j*12+k]).every(t=>t<=0)&&Array.from({length:12},(_,k)=>f.temperatureC[j*12+k]).some(t=>t<0));assert.equal(indices.length,18);
 for(const key of ['E1-G0.25-I0-W100-C1.5-T0','E1-G0.25-I0-W5000-C1.5-T0']){const c=d.scenarios.find(c=>c.id===key),phases=c.final.elapsedYears*12,whole=Math.floor(phases+1e-7),fraction=Math.max(0,phases-whole);
  for(const j of indices){assert(!m.columns.some(col=>col.cell===source.cells[j]));let expected=f.snowStartMm[j*12];for(let p=0;p<whole;p++)if(f.temperatureC[j*12+p%12]<0)expected+=f.precipitationMm[j*12+p%12];if(f.temperatureC[j*12+whole%12]<0)expected+=fraction*f.precipitationMm[j*12+whole%12];near(c.finalCellStores.snowMm[j],expected,.00001);}
 }
});
test('six 30/60/120 refinements retain termination class and bound reported numerical differences',()=>{
 assert.equal(s.convergence.length,6);for(const c of s.convergence){assert.deepEqual(c.runs.map(r=>r.substeps),[30,60,120]);assert(c.runs.every(r=>r.status===c.runs[0].status));assert(c.difference60to120.poolRelative<.0001);assert(c.difference60to120.releaseRelative<.002);assert(c.difference60to120.eventYears<1/365);assert(c.runs.every(r=>Math.abs(r.residualM3)<1));}
 assert.deepEqual(s.coefficientSensitivity.map(c=>c.coefficient),[1.38,1.71]);
});
test('UI and CLI preserve provenance, partial-period semantics, nulls and available time range',()=>{
 V.validate(d);for(const c of d.scenarios)for(const year of [...new Set([0,Math.min(1,c.annual.length),c.annual.length])]){const q=V.select(d,c.id,year);assert(Object.values(q.actual).every(x=>x===null));assert.equal(q.automaticAdoption,false);assert.equal(q.selectedYear.year,year);assert.equal(q.domain.columns.length,132);}
 assert.throws(()=>V.select(d,d.scenarios[0].id,100));assert.throws(()=>V.select(d,'bad',0));assert.throws(()=>V.validate({...d,schema:'bad'}));assert.throws(()=>V.validate({...d,scenarios:d.scenarios.slice(1)}));
 const key='E1-G0.25-I0-W100-C1.5-T0',q=JSON.parse(cp.execFileSync(process.execPath,[path.join(__dirname,'query.cjs'),key],{encoding:'utf8'}));assert.deepEqual(q,V.select(d,key,d.scenarios.find(c=>c.id===key).annual.length));
});
