'use strict';
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const P=require('../pond-budget/core.js'),C=require('../core.js'),Codec=require('../stage5/codec.js'),B=require('./core.cjs');
const base=path.resolve(__dirname,'..'),out=path.join(__dirname,'output');
const read=p=>{const b=fs.readFileSync(path.join(base,p));return JSON.parse(p.endsWith('.gz')?zlib.gunzipSync(b):b);};
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(path.join(base,p))).digest('hex');
const previous=read('downstream-budget/output/review.json.gz'),g=previous.representatives.find(g=>g.id==='D298591'),raw=read('d298591-surface/inputs/fluxes.json.gz'),collection=read('d298591-surface/inputs/collection.json'),water=read('stage3/output/waterways.json');
const w=1536,h=768,n=w*h,a=Object.fromEntries(['canonical','receiver','entry','terminal'].map(k=>[k,Codec.decode(water.fields[k].data,n,water.fields[k].type)]));
assert.equal(collection.status,'passed');for(const k of ['worldHash','geometryHash'])assert.equal(raw[k],previous.provenance[k]);
assert.equal(sha('stage3/output/waterways.json'),previous.provenance.inputs['stage3/output/waterways.json']);
assert.deepEqual(raw.cells,g.catchmentCellIds);
const partition=P.partition(g.columns,w,h,(i,j)=>C.distance(C.ll(w,h,i),C.ll(w,h,j)));
const assignments=raw.cells.map(cell=>{
 assert.equal(a.terminal[a.canonical[cell]],g.node);
 if(partition.labels.has(cell))return {cell,leaf:partition.labels.get(cell),entryCell:cell};
 let i=a.canonical[cell],last=-1;const seen=new Set();
 while(i!==g.node){assert(i>=0&&!seen.has(i));seen.add(i);last=i;i=a.receiver[i];}
 const entryCell=a.entry[last],leaf=partition.labels.get(entryCell);assert(leaf!==undefined);return {cell,leaf,entryCell};
});
const model={id:g.id,node:g.node,width:w,height:h,crestM:g.outletLevelM,columns:g.columns.map(c=>({...c,leaf:partition.labels.get(c.cell)})),partition:{groups:partition.groups,edges:partition.edges},assignments,initialLeaf:partition.labels.get(g.node),outletTarget:g.outletTarget,outletPathCells:g.outletPathCells};
const source=B.unpack(raw),f=source.fields,sourcePeriods=Array.from({length:12},(_,k)=>{
 const row={period:k+1};for(const field of Object.keys(f).filter(k=>k!=='temperatureC'))row[field.replace(/Mm$/,'M3')]=raw.cells.reduce((s,_,j)=>s+f[field][j*12+k]*source.area[j]/1000,0);
 row.residualM3=row.precipitationM3-row.evaporationM3-row.runoffM3-row.snowChangeM3-row.shallowStoreChangeM3;return row;
});
const sourceAnnual=Object.fromEntries(['precipitationM3','evaporationM3','runoffM3','snowChangeM3','shallowStoreChangeM3'].map(k=>[k,sourcePeriods.reduce((s,r)=>s+r[k],0)]));
const sourceEvidence={rawPeriods:sourcePeriods,annual:sourceAnnual,alignedRunoffM3:sourcePeriods.map((r,k)=>(r.runoffM3+sourcePeriods[(k+1)%12].runoffM3)/2),priorPeriodInflowM3:g.periodInflowM3,shallowStoreMeaning:raw.shallowStoreMeaning,calendar:raw.calendar,fullWorldRunoffBitIdentical:collection.allLocalRunoffBitIdentical,allSourceCells:collection.allSourceCells,sourceRows:raw.rows};
const cases=[];
for(const initialFraction of [0,.5])for(const evaporationMPerYear of [.5,1,2])for(const netGroundLossMPerYear of [0,.25]){
 console.log('Simulating',JSON.stringify({initialFraction,evaporationMPerYear,netGroundLossMPerYear}));
 cases.push(B.simulate(model,source,{initialFraction,evaporationMPerYear,netGroundLossMPerYear}));
}
const convergence=[];
for(const initialFraction of [0,.5])for(const evaporationMPerYear of [1,2]){
 const original=cases.find(c=>c.options.initialFraction===initialFraction&&c.options.evaporationMPerYear===evaporationMPerYear&&c.options.netGroundLossMPerYear===.25),runs=[original];
 for(const substeps of [60,120]){console.log('Refining',initialFraction,substeps);runs.push(B.simulate(model,source,{...original.options,substeps}));}
 convergence.push({initialFraction,evaporationMPerYear,netGroundLossMPerYear:.25,runs:runs.map(c=>({substeps:c.options.substeps,firstExcess:c.firstExcess,finalPoolM3:c.final.poolM3,finalAreaM2:c.final.areaM2,totalExcessM3:c.totals.boundaryExcessM3,maxPeriodResidualM3:c.maxPeriodResidualM3,totalResidualM3:c.totals.residualM3})),relative60to120:{pool:Math.abs(runs[1].final.poolM3-runs[2].final.poolM3)/Math.max(1,runs[2].final.poolM3),excess:Math.abs(runs[1].totals.boundaryExcessM3-runs[2].totals.boundaryExcessM3)/Math.max(1,runs[2].totals.boundaryExcessM3)}});
}
const outlet={equation:'Q = C L H^1.5 (SI)',coefficientRange:[1.38,1.71],headScenariosM:[.1,.5,1],actualWidthM:null,actualHeadM:null,actualTailwaterM:null,actualDischargeM3S:null,zeroHeadDischargeM3S:B.discharge(1.38,100,0),meaning:'Free-flow broad-crested-weir sensitivity only. Required widths use period-mean conditional ceiling excess, not flood peaks. No stage above the original crest is simulated. No actual release is routed to ocean.',source:'https://www.hec.usace.army.mil/confluence/rasdocs/ras1dtechref/6.5/modeling-bridges/hydraulic-computations-through-the-bridge/high-flow-computations',cases:cases.map(c=>({id:c.id,peakPeriodExcess:c.peakPeriodExcess,requiredWidths:[.1,.5,1].map(headM=>({headM,minWidthM:B.requiredWidth(c.peakPeriodExcess.meanRateM3S,1.71,headM),maxWidthM:B.requiredWidth(c.peakPeriodExcess.meanRateM3S,1.38,headM)}))}))};
const provenance={baseline:'7f803eb5f3fd17d4ce3edbf887f9deb2646fd675',worldHash:raw.worldHash,geometryHash:raw.geometryHash,archiveCommit:'4afae5da3a7730b79ced1d2b9b7a8bc3041689c0',sourceProbes:raw.provenance,inputs:Object.fromEntries(['downstream-budget/output/review.json.gz','stage3/output/waterways.json','d298591-surface/inputs/fluxes.json.gz','d298591-surface/inputs/collection.json'].map(p=>[p,sha(p)])),code:Object.fromEntries(['d298591-surface/core.cjs','d298591-surface/build.cjs','pond-budget/core.js','retention-review/core.js','retention-chain/core.js'].map(p=>[p,sha(p)]))};
const assumptions={years:100,substeps:30,calendar:'Repeat raw twelve source phases; a model year is 365 days. These are not Earth calendar months.',land:'Original runoff arithmetic at one step; at finer steps, recharge/evap/melt are subdivided and base-release fraction is 1-0.75^(1/n). Stores evolve continuously.',water:'Wet cells receive precipitation and temperature-index snowmelt once, replacing all land runoff and land ET. Snow water equivalent is carried across wet/dry switches; no ice/thermal model.',shallow:'Original combined shallow store is held while submerged, resumes on drying; no invented soil/aquifer split. External net groundwater sink is separate, not a measured infiltration.',evaporation:'Hypothetical 0.5/1/2 m/year over modeled wet pools; positive liquid water only; not calibrated or energy-limited.',netGroundLoss:'Hypothetical 0/0.25 m/year to an unmodeled external store; no groundwater feedback.',initial:'Source sixth-cycle snow and shallow stores. Pool 0 or 50% capacity filled through lowest leaf; initial geometry depends on this prescribed history.',numerics:'Half surface losses, freeze wet mask, evolve all source cells, inject each leaf, half losses. Evaporation before groundwater loss. Whole native columns, instantaneous fill/spill; no channel travel.',boundary:'Crest-capacity excess remains unallocated. The weir relation is a separate sensitivity, not a routed outlet model.',space:'619 catchment cells, 121 native columns; no subgrid channels, actual wetland edges or new physical terrain.'};
const tree=P.hierarchy(model.partition,model.crestM);
const summary={schema:'d298591-surface-summary/1',status:'conditional-dynamic-budget-not-physical-adoption',provenance,catchmentCells:619,columns:121,localPonds:partition.groups.length,crestM:model.crestM,capacityM3:tree.root.capacityM3,sourceEvidence,assumptions,scenarios:cases.map(({annual,periods,...c})=>c),convergence,outlet,physicalResolvedReaches:0,unresolvedReaches:23022,automaticAdoption:false};
const payload={schema:'d298591-surface-review/1',summary,model,scenarios:cases,actualWetAreaM2:null,actualSnowDepthM:null,actualIceExtentM2:null,actualRiverWidthM:null,actualForestEdge:null,actualFloodExtentM2:null,automaticAdoption:false};
fs.mkdirSync(out,{recursive:true});const write=(name,d)=>fs.writeFileSync(path.join(out,name),JSON.stringify(d,null,2)+'\n');
write('summary.json',summary);write('model.json',model);
const bytes=zlib.gzipSync(JSON.stringify(payload),{level:9,mtime:0});fs.writeFileSync(path.join(out,'review.json.gz'),bytes);
write('manifest.json',{schema:'d298591-surface-manifest/1',file:'review.json.gz',bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});
console.log(JSON.stringify({localPonds:partition.groups.length,sourceAnnual,convergence,scenarios:summary.scenarios.map(c=>({id:c.id,first:c.firstExcess,areaKm2:c.final.areaM2/1e6,poolKm3:c.final.poolM3/1e9,excessKm3:c.totals.boundaryExcessM3/1e9,residual:c.totals.residualM3,wetTransitions:c.wetTransitions,dryTransitions:c.dryTransitions}))},null,2));
