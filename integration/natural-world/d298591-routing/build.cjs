'use strict';
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const P=require('../pond-budget/core.js'),C=require('../core.js'),Codec=require('../stage5/codec.js'),B=require('../d298591-surface/core.cjs'),R=require('./core.cjs');
const base=path.resolve(__dirname,'..'),out=path.join(__dirname,'output');
const read=p=>{const b=fs.readFileSync(path.join(base,p));return JSON.parse(p.endsWith('.gz')?zlib.gunzipSync(b):b);};
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(path.join(base,p))).digest('hex');
const prior=read('d298591-surface/output/review.json.gz'),constraints=read('d298591-constraints/output/review.json.gz'),domain=constraints.outlet.candidateDomain,raw=read('d298591-surface/inputs/fluxes.json.gz'),source=B.unpack(raw);
const width=1536,height=768,water=read('stage3/output/waterways.json'),fields=Object.fromEntries(['canonical','receiver','entry','terminal'].map(k=>[k,Codec.decode(water.fields[k].data,width*height,water.fields[k].type)]));
assert.equal(domain.columns.length,132);assert(domain.columns.every(c=>source.cells.includes(c.cell)));assert.equal(raw.worldHash,prior.summary.provenance.worldHash);
const partition=P.partition(domain.columns,width,height,(i,j)=>C.distance(C.ll(width,height,i),C.ll(width,height,j)));
const assignments=source.cells.map(cell=>{
 assert.equal(fields.terminal[fields.canonical[cell]],prior.model.node);
 if(partition.labels.has(cell))return {cell,leaf:partition.labels.get(cell),entryCell:cell};
 let i=fields.canonical[cell],entryCell=null;const seen=new Set();
 while(entryCell===null){
  assert(i>=0&&!seen.has(i),'Unresolved delivery '+cell);seen.add(i);
  if(partition.labels.has(i)){entryCell=i;break;}
  if(partition.labels.has(fields.entry[i])){entryCell=fields.entry[i];break;}
  i=fields.receiver[i];
 }
 return {cell,entryCell,leaf:partition.labels.get(entryCell)};
});
const model={id:'D298591',width,height,node:prior.model.node,crestM:constraints.outlet.crestM,limitM:domain.maximumExclusiveLevelM,gate:domain.gateDeleted,columns:domain.columns.map(c=>({...c,leaf:partition.labels.get(c.cell)})),partition:{groups:partition.groups,edges:partition.edges},assignments,initialLeaf:partition.labels.get(prior.model.node),outletLeaf:partition.labels.get(domain.gateDeleted[0]),extraCells:domain.additionalCells??domain.cells.filter(c=>!prior.model.columns.some(x=>x.cell===c))};
const tree=P.hierarchy(model.partition,model.limitM);assert(tree.root.mergeM<model.crestM);
const scenarios=[];
for(const initialFraction of [0,.5])for(const evaporationMPerYear of [.5,1,2])for(const netGroundLossMPerYear of [0,.25])for(const widthM of [100,1000,5000]){
 const c=R.simulate(model,source,{initialFraction,evaporationMPerYear,netGroundLossMPerYear,widthM});scenarios.push(c);console.log(c.id,c.status,c.final.elapsedYears.toFixed(6),c.totals.residualM3);
}
for(const c of [...scenarios])for(const tailwaterRiseM of [.05,.5,1])scenarios.push(R.simulate(model,source,{...c.options,tailwaterRiseM}));
const convergence=[];
for(const [evaporationMPerYear,widthM,initialFraction]of [[.5,5000,0],[1,100,0],[1,1000,0],[1,5000,0],[2,1000,0],[1,5000,.5]]){
 const first=scenarios.find(c=>c.options.evaporationMPerYear===evaporationMPerYear&&c.options.widthM===widthM&&c.options.initialFraction===initialFraction&&c.options.netGroundLossMPerYear===.25),runs=[first];
 for(const substeps of [60,120]){console.log('refining',first.id,substeps);runs.push(R.simulate(model,source,{...first.options,substeps}));}
 const slim=c=>({substeps:c.options.substeps,status:c.status,elapsedYears:c.final.elapsedYears,finalPoolM3:c.final.poolM3,releaseM3:c.totals.conditionalReleaseM3,heldWaterM3:c.totals.heldWaterM3,residualM3:c.totals.residualM3,wetCells:c.final.wetCells.length});
 const a=runs[1],b=runs[2];convergence.push({id:first.id,runs:runs.map(slim),difference60to120:{eventYears:Math.abs(a.final.elapsedYears-b.final.elapsedYears),poolRelative:Math.abs(a.final.poolM3-b.final.poolM3)/Math.max(1,b.final.poolM3),releaseRelative:Math.abs(a.totals.conditionalReleaseM3-b.totals.conditionalReleaseM3)/Math.max(1,b.totals.conditionalReleaseM3)}});
}
const coefficientSensitivity=[1.38,1.71].map(coefficient=>{const c=R.simulate(model,source,{coefficient,substeps:60});return {coefficient,status:c.status,elapsedYears:c.final.elapsedYears,releaseM3:c.totals.conditionalReleaseM3,residualM3:c.totals.residualM3};});
const inputs=['d298591-surface/inputs/fluxes.json.gz','d298591-surface/output/review.json.gz','d298591-constraints/output/review.json.gz','stage3/output/waterways.json'];
const provenance={baseline:'4ba6823884181b0598ac6be86df4ee456c44e0fc',worldHash:raw.worldHash,geometryHash:raw.geometryHash,inputs:Object.fromEntries(inputs.map(p=>[p,hash(p)])),code:Object.fromEntries(['d298591-routing/core.cjs','d298591-routing/build.cjs','d298591-surface/core.cjs','pond-budget/core.js','retention-review/core.js','core.js'].map(p=>[p,hash(p)]))};
const assumptions={calendar:'Repeat 12 source orbit phases, 365-day model years; not Earth months or climate forecasts.',space:'132 native columns; 619 source cells each delivered once to first candidate entry in original graph. No new terrain or catchment forcing.',initial:'Pool 0/50% of original crest capacity, filled via original lowest leaf. Snow and shallow stores start at original sixth cycle.',land:'Reuse source temperature-index snow and fractional-step land ledger. Wet cells replace land ET/runoff with direct rain and melt; preserve submerged shallow stores.',outlet:'Hypothetical free broad-crested weir Q=C*W*max(stage-crest,0)^1.5; negligible approach velocity, C=1.5 SI and W=100/1000/5000m. Widths and coefficient are sensitivity assumptions, not measured geometry.',tailwater:'Tailwater at/below crest only; above-crest conditions pause at time zero pending shape-specific submergence and backwater. Null is not zero discharge.',integration:'Exact piecewise-area autonomous drainage half step, half surface losses, frozen-mask source evolution and leaf injection, guard, half losses, half drainage. No travel time.',guard:'Guard at post-supply stage before second losses. Binary locate first crossing in split scheme; retain capacity volume plus tiny overshoot separately as held water, suspend all future forcing. Not ocean discharge or physical event-time accuracy.',energy:'Prescribed 0.5/1/2m/year evaporation and 0/0.25m/year external groundwater sink on wet area, no energy or groundwater feedback. E2 prior fixed-mask energy warning remains, not recomputed for dynamic masks.',snow:'Keep upstream SWE through full or truncated simulated duration. No annual reset, actual snow depth, ice extent or glacier transport.',adoption:'Conditional release leaves this hypothetical ledger into an unmodeled external receiving ledger; no routing/adoption in original hydrological graph.'};
const summary={schema:'d298591-routing-summary/1',provenance,assumptions,sourceCells:619,columns:132,extraColumns:11,localPonds:partition.groups.length,crestM:model.crestM,exclusiveLimitM:model.limitM,crestVolumeM3:tree.root.h.atLevel(model.crestM).volumeM3,limitVolumeM3:tree.root.capacityM3,statusCounts:Object.fromEntries(['completed-horizon','alternate-outlet-limit','unsupported-tailwater'].map(s=>[s,scenarios.filter(c=>c.status===s).length])),convergence,coefficientSensitivity,physicalResolvedReaches:0,unresolvedReaches:23022,automaticAdoption:false};
const payload={schema:'d298591-routing-review/1',summary,model,scenarios,actualWetAreaM2:null,actualDischargeM3S:null,actualSnowDepthM:null,actualIceExtentM2:null,automaticAdoption:false};
fs.mkdirSync(out,{recursive:true});const write=(n,d)=>fs.writeFileSync(path.join(out,n),JSON.stringify(d,null,2)+'\n');
write('summary.json',summary);write('model.json',model);const bytes=zlib.gzipSync(JSON.stringify(payload),{level:9,mtime:0});fs.writeFileSync(path.join(out,'review.json.gz'),bytes);write('manifest.json',{schema:'d298591-routing-manifest/1',file:'review.json.gz',bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});
console.log(JSON.stringify({counts:summary.statusCounts,convergence,coefficientSensitivity,bytes:bytes.length},null,2));
