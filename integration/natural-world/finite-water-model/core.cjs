'use strict';
const assert = require('node:assert/strict');
const P = require('../pond-budget/core.js');
const S = require('../water-budget-link/surface.cjs');
const N = require('../inland-routing/core.js');
const YEAR_SECONDS = 365 * 86400;
const fluxKeys = ['precipitationM3', 'landEvaporationM3', 'waterEvaporationM3',
 'infiltrationM3', 'rechargeM3', 'groundwaterReturnM3', 'runoffM3', 'directWaterM3',
 'receivedM3', 'releasedM3', 'unresolvedM3'];
const empty = () => Object.fromEntries(fluxKeys.map(k => [k, 0]));
const sum = (rows, key) => rows.reduce((s, r) => s + r[key], 0);
const near = (a, b) => assert(Math.abs(a-b) <= Math.max(.1, Math.abs(b)*1e-10), `${a} != ${b}`);
function validate(o) {
 for (const key of ['soilCapacityMm', 'aquiferCapacityMm', 'infiltrationMmPerYear',
  'soilDrainYears', 'groundwaterReturnYears', 'evaporationMPerYear', 'widthScale',
  'outletCoefficient', 'maxSurchargeM']) assert(Number.isFinite(o[key]) && o[key] > 0, 'Invalid '+key);
 assert(o.soilCapacityMm <= 5000 && o.aquiferCapacityMm <= 50000 && o.infiltrationMmPerYear <= 100000);
 assert(o.soilDrainYears >= .01 && o.groundwaterReturnYears >= .01);
 assert(o.evaporationMPerYear <= 20 && o.widthScale <= 100 && o.outletCoefficient <= 10 && o.maxSurchargeM <= 20);
 assert(Number.isInteger(o.years) && o.years >= 1 && o.years <= 100);
 assert(Number.isInteger(o.substeps) && o.substeps >= 1 && o.substeps <= 240);
}
// Depths in mm. Soil/aquifer are designed finite buckets, not the old 35% split.
// Water returned from the aquifer enters the native assigned surface pond.
function cellStep(state, p, t, wet, dt, o, rates) {
 rates ||= {ground:-Math.expm1(-dt/o.groundwaterReturnYears),soil:-Math.expm1(-dt/o.soilDrainYears)};
 let {snow, soil, groundwater} = state;
 let liquid = t < 0 ? 0 : p;
 if (t < 0) snow += p;
 const melt = Math.min(snow, Math.max(t, 0)*540*dt);
 snow -= melt; liquid += melt;
 const groundwaterReturn = groundwater * rates.ground;
 groundwater -= groundwaterReturn;
 const recharge = Math.min(soil * rates.soil, o.aquiferCapacityMm-groundwater);
 soil -= recharge; groundwater += recharge;
 let evaporation = 0, infiltration = 0, runoff = 0, directWater = 0;
 if (wet) directWater = liquid;
 else {
  const demand = Math.max(t+5, 0)*24*dt; // original temperature demand, explicit inherited limitation
  const immediate = Math.min(liquid, demand); liquid -= immediate;
  const fromSoil = Math.min(soil, demand-immediate); soil -= fromSoil;
  evaporation = immediate+fromSoil;
  infiltration = Math.min(liquid, o.infiltrationMmPerYear*dt, o.soilCapacityMm-soil);
  soil += infiltration; runoff = liquid-infiltration;
 }
 return {snow, soil, groundwater, evaporation, infiltration, recharge, groundwaterReturn, runoff, directWater};
}
// Explicit designed one-way stage rating, NOT a measured/submerged weir law.
// The downstream pond's entry stage is used as an instantaneous tailwater proxy.
function rating(stage, crest, tailwater, width, coefficient) {
 assert([stage, crest, tailwater, width, coefficient].every(Number.isFinite));
 assert(width >= 0 && coefficient > 0);
 return coefficient*width*Math.max(0, Math.max(0,stage-crest)**1.5-Math.max(0,tailwater-crest)**1.5);
}
// Backward Euler for a finite outlet storage with constant substep supply.
// No valid solution below the declared upper stage => explicitly unallocated water.
function outlet(root, available, crest, tailwater, width, coefficient, seconds) {
 assert(Number.isFinite(available) && available >= 0 && Number.isFinite(seconds) && seconds > 0);
 const crestVolume = root.h.atLevel(crest).volumeM3, cap = root.capacityM3;
 assert(cap >= crestVolume && root.h.maxElevationM <= crest);
 if (available <= crestVolume) return {storageM3:available, releaseM3:0, unresolvedM3:0};
 assert([crest,tailwater,width,coefficient].every(Number.isFinite) && width>=0 && coefficient>0);
 // All native columns are below the native crest; only the surcharge is drained.
 // Cache the affine hypsometry above the crest and the fixed tailwater power.
 const area=root.h.atLevel(crest+1e-8).areaM2, tail=Math.max(0,tailwater-crest)**1.5, factor=coefficient*width;
 const q = v => factor*Math.max(0,Math.max(0,(v-crestVolume)/area)**1.5-tail);
 const atCap = cap+seconds*q(cap);
 if (available > atCap) return {storageM3:cap, releaseM3:seconds*q(cap), unresolvedM3:available-atCap};
 let lo = crestVolume, hi = Math.min(available, cap);
 for (let i=0;i<48;i++) { const mid=(lo+hi)/2; if(mid+seconds*q(mid)>available)hi=mid;else lo=mid; }
 const storageM3=(lo+hi)/2;
 return {storageM3, releaseM3:Math.max(0,available-storageM3), unresolvedM3:0};
}
function prepare(network, models, raw) {
 const plan=N.plan(network), chosen=new Set(models.map(m=>m.id));
 assert(chosen.size===models.length && models.length);
 for(const key of ['worldHash','geometryHash'])assert.equal(raw[key], network.provenance[key]);
 const source=S.unpack(raw), sourceIndex=new Map(source.cells.map((c,i)=>[c,i])), seen=new Set();
 const prepared=models.map(model=>{
  const group=plan.by.get(model.id); assert.equal(group?.status,'eligible');
  assert(group.target.kind==='ocean'||chosen.has(group.target.id),'Missing downstream');
  const indices=model.assignments.map(a=>{assert(!seen.has(a.cell),'Overlapping source');seen.add(a.cell);assert(sourceIndex.has(a.cell));return sourceIndex.get(a.cell);});
  const cells=model.assignments.map(a=>a.cell), area=Float64Array.from(indices,i=>source.area[i]);
  const fields=Object.fromEntries(['precipitationMm','temperatureC','snowStartMm','shallowStartMm'].map(k=>[k,Float64Array.from(indices.flatMap(i=>Array.from(source.fields[k].subarray(i*12,i*12+12))))]));
  for(let j=0;j<cells.length;j++){assert(Number.isFinite(area[j])&&area[j]>0);for(let p=0;p<12;p++)for(const k of Object.keys(fields))assert(Number.isFinite(fields[k][j*12+p])&&(k==='temperatureC'||fields[k][j*12+p]>=0));}
  return {model,group,cells,area,fields};
 });
 for(const g of plan.active)if(chosen.has(g.target.id))assert(chosen.has(g.id),'Missing upstream');
 const by=new Map(prepared.map(b=>[b.model.id,b]));
 // Width is a declared design dimension, based on cumulative ORIGINAL runoff.
 const flows=new Map();
 for(const id of plan.order.filter(id=>chosen.has(id))){
  const b=by.get(id),flow=sum(b.group.periodInflowM3.map(v=>({v})),'v')/YEAR_SECONDS+(flows.get(id)||0);
  b.referenceRateM3S=flow;
  if(chosen.has(b.group.target.id))flows.set(b.group.target.id,(flows.get(b.group.target.id)||0)+flow);
  if(b.group.target.kind!=='ocean')assert(by.get(b.group.target.id).cells.includes(b.group.target.entryCell),'Invalid native entry');
 }
 return {network,prepared,order:plan.order.filter(id=>chosen.has(id))};
}
function run(preparedInput, options) {
 validate(options); const o={...options}, dt=1/(12*o.substeps);
 const rates={ground:-Math.expm1(-dt/o.groundwaterReturnYears),soil:-Math.expm1(-dt/o.soilDrainYears)};
 const states=preparedInput.prepared.map(b=>{
  const {model:m,cells,fields:f}=b, tree=P.hierarchy(m.partition,m.crestM+o.maxSurchargeM);
  assert(tree.root.mergeM===null||tree.root.mergeM<=m.crestM);
  const soil=new Float64Array(cells.length), groundwater=new Float64Array(cells.length), snow=new Float64Array(cells.length);
  const leafIndex=new Map(tree.root.leaves.map((l,i)=>[l,i]));
  for(let j=0;j<cells.length;j++){
   snow[j]=f.snowStartMm[j*12]; const old=f.shallowStartMm[j*12];
   soil[j]=Math.min(old,o.soilCapacityMm);groundwater[j]=Math.min(old-soil[j],o.aquiferCapacityMm);
   // Initial original mixed storage is conserved; excess goes to its native pond.
   const excess=(old-soil[j]-groundwater[j])*b.area[j]/1000;
   assert(P.inject(tree.root,m.assignments[j].leaf,excess)<.1,'Initial storage outside candidate domain');
  }
  return {...b, tree, soil, groundwater, snow, leafIndex,
   index:new Map(cells.map((c,i)=>[c,i])), delivery:m.assignments.map(a=>leafIndex.get(a.leaf)),
   wet:new Uint8Array(cells.length), pending:new Float64Array(tree.root.leaves.length),
   widthM:Math.max(10,o.widthScale*b.referenceRateM3S/o.outletCoefficient),
   totals:empty(), annual:[], row:null, firstDomainExceeded:null, maxSurchargeM:0, backwaterSteps:0,
   maxSoilMm:Math.max(...soil),maxGroundwaterMm:Math.max(...groundwater)};
 });
 const by=new Map(states.map(b=>[b.model.id,b]));
 const inventory=b=>({snowM3:b.snow.reduce((s,v,j)=>s+v*b.area[j]/1000,0),soilM3:b.soil.reduce((s,v,j)=>s+v*b.area[j]/1000,0),groundwaterM3:b.groundwater.reduce((s,v,j)=>s+v*b.area[j]/1000,0),surfaceM3:b.tree.root.volumeM3,transitM3:b.pending.reduce((s,v)=>s+v,0)});
 const volume=inv=>Object.values(inv).reduce((a,b)=>a+b,0);
 for(const b of states)b.initial=inventory(b);
 let maxAnnualResidualM3=0;
 for(let year=1;year<=o.years;year++){
  for(const b of states)b.row={year,...empty(),start:inventory(b)};
  for(let phase=0;phase<12;phase++)for(let step=0;step<o.substeps;step++){
   // Snapshot before any boundary advances: order-independent one-substep transport.
   const levels=new Map();
   for(const b of states){
    const ls=new Map(P.activePools(b.tree.root).flatMap(p=>p.leaves.map(l=>[l,p.levelM])));
    levels.set(b.model.id,ls);b.wet.fill(0);
    for(const c of b.model.columns)if(c.elevationM<(ls.get(c.leaf)??-Infinity))b.wet[b.index.get(c.cell)]=1;
   }
   const releases=[];
   for(const b of states){
    const {model:m,tree,fields:f,row}=b, inflows=b.pending;
    // Pending is in the RECEIVER's transit inventory from the preceding step.
    for(let j=0;j<b.cells.length;j++){
     const k=j*12+phase,af=b.area[j]/1000,p=f.precipitationMm[k]/o.substeps;
     const r=cellStep({snow:b.snow[j],soil:b.soil[j],groundwater:b.groundwater[j]},p,f.temperatureC[k],b.wet[j]===1,dt,o,rates);
     b.snow[j]=r.snow;b.soil[j]=r.soil;b.groundwater[j]=r.groundwater;
     b.maxSoilMm=Math.max(b.maxSoilMm,r.soil);b.maxGroundwaterMm=Math.max(b.maxGroundwaterMm,r.groundwater);
     row.precipitationM3+=p*af;row.landEvaporationM3+=r.evaporation*af;
     row.infiltrationM3+=r.infiltration*af;row.rechargeM3+=r.recharge*af;row.groundwaterReturnM3+=r.groundwaterReturn*af;row.runoffM3+=r.runoff*af;row.directWaterM3+=r.directWater*af;
     inflows[b.delivery[j]]+=(r.runoff+r.directWater+r.groundwaterReturn)*af;
    }
    let excess=0;
    tree.root.leaves.forEach((leaf,j)=>{excess+=P.inject(tree.root,leaf,inflows[j]);inflows[j]=0;});
    row.waterEvaporationM3+=P.removeDepth(tree.root,o.evaporationMPerYear*dt);
    let tailwater=m.crestM;
    if(b.group.target.kind!=='ocean'){
     const receiver=by.get(b.group.target.id), a=receiver.model.assignments[receiver.index.get(b.group.target.entryCell)];
     tailwater=levels.get(receiver.model.id).get(a.leaf)??m.crestM;
    }
    if(tailwater>m.crestM)b.backwaterSteps++;
    const r=outlet(tree.root,tree.root.volumeM3+excess,m.crestM,tailwater,b.widthM,o.outletCoefficient,dt*YEAR_SECONDS);
    tree.root.volumeM3=r.storageM3;row.releasedM3+=r.releaseM3;row.unresolvedM3+=r.unresolvedM3;
    if(r.unresolvedM3>0&&!b.firstDomainExceeded)b.firstDomainExceeded={year,phase:phase+1,substep:step+1};
    b.maxSurchargeM=Math.max(b.maxSurchargeM,tree.root.h.atVolume(r.storageM3).levelM-m.crestM);
    releases.push({b,volumeM3:r.releaseM3});
   }
   // Send exactly once; no same-step cascade and no hidden external input.
   for(const {b,volumeM3}of releases)if(b.group.target.kind!=='ocean'){
    const receiver=by.get(b.group.target.id),j=receiver.index.get(b.group.target.entryCell);
    receiver.pending[receiver.delivery[j]]+=volumeM3;receiver.row.receivedM3+=volumeM3;
   }
  }
  for(const b of states){
   const r=b.row;r.end=inventory(b);
   r.residualM3=volume(r.start)+r.precipitationM3+r.receivedM3-r.landEvaporationM3-r.waterEvaporationM3-r.releasedM3-r.unresolvedM3-volume(r.end);
   maxAnnualResidualM3=Math.max(maxAnnualResidualM3,Math.abs(r.residualM3));
   near(volume(r.start)+r.precipitationM3+r.receivedM3,volume(r.end)+r.landEvaporationM3+r.waterEvaporationM3+r.releasedM3+r.unresolvedM3);
   b.annual.push(r);for(const k of fluxKeys)b.totals[k]+=r[k];
  }
 }
 const boundaries=states.map(b=>({id:b.model.id,reachCount:b.group.reachCount,sourceCells:b.cells.length,target:b.group.target,
  widthM:b.widthM,initial:b.initial,final:inventory(b),totals:b.totals,annual:b.annual,
  status:b.firstDomainExceeded?'domain-exceeded':'completed-horizon',firstDomainExceeded:b.firstDomainExceeded,
  maxSurchargeM:b.maxSurchargeM,backwaterSteps:b.backwaterSteps,maxSoilMm:b.maxSoilMm,maxGroundwaterMm:b.maxGroundwaterMm}));
 const totals={...empty(),initialInventoryM3:sum(boundaries.map(b=>({v:volume(b.initial)})),'v'),finalInventoryM3:sum(boundaries.map(b=>({v:volume(b.final)})),'v')};
 for(const k of fluxKeys)totals[k]=sum(boundaries.map(b=>b.totals),k);
 totals.oceanDeliveryM3=sum(boundaries.filter(b=>b.target.kind==='ocean').map(b=>b.totals),'releasedM3');
 totals.internalSentM3=sum(boundaries.filter(b=>b.target.kind!=='ocean').map(b=>b.totals),'releasedM3');
 totals.residualM3=totals.initialInventoryM3+totals.precipitationM3-totals.landEvaporationM3-totals.waterEvaporationM3-totals.oceanDeliveryM3-totals.unresolvedM3-totals.finalInventoryM3;
 near(totals.internalSentM3,totals.receivedM3);
 near(totals.initialInventoryM3+totals.precipitationM3,totals.landEvaporationM3+totals.waterEvaporationM3+totals.oceanDeliveryM3+totals.unresolvedM3+totals.finalInventoryM3);
 return {options:o,status:boundaries.some(b=>b.status==='domain-exceeded')?'domain-exceeded':'completed-horizon',boundaries,totals,maxAnnualResidualM3,
  actual:{infiltrationM3:null,groundwaterM3:null,outletWidthM:null,dischargeM3S:null},automaticAdoption:false};
}
module.exports={cellStep,rating,outlet,prepare,run,validate,YEAR_SECONDS,fluxKeys};
