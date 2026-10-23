'use strict';
const P=require('../pond-budget/core.js');
const SECONDS=365/12*86400;
function f64(encoded){const b=Buffer.from(encoded,'base64');if(b.length%8)throw Error('Invalid f64');return Float64Array.from({length:b.length/8},(_,i)=>b.readDoubleLE(i*8));}
function unpack(source){return {cells:source.cells,area:f64(source.areaM2.data),rainFactor:f64(source.rainFactor.data),fields:Object.fromEntries(Object.entries(source.fields).map(([k,v])=>[k,f64(v.data)]))};}
// n=1 reproduces the original monthly arithmetic. At n>1 this is an explicit
// refinement hypothesis; exponential base release preserves its monthly decay.
const B=require('../d298591-surface/core.cjs');
const step=B.step;
function stepLedger(snow,shallow,p,t,factor,n,wet){
 const r=step(snow,shallow,p,t,factor,n,wet);
 if(wet)return {...r,shallowRecharge:0,shallowReturn:0,shallowEvaporation:0,directRunoff:0};
 const melt=snow+(t<0?p:0)-r.snow,liquid=(t<0?0:p)+melt,potential=Math.max(0,t+5)*2/n,immediateEvap=Math.min(liquid,potential),remaining=liquid-immediateEvap;
 const shallowEvaporation=Math.min(shallow,Math.max(0,potential-immediateEvap))*(1-factor),shallowRecharge=remaining*.35,directRunoff=remaining*.65,shallowReturn=r.runoff-directRunoff;
 return {...r,shallowRecharge,shallowReturn,shallowEvaporation,directRunoff};
}
const terms=['precipitationM3','landEvaporationM3','waterEvaporationM3','netGroundLossM3','boundaryExcessM3','landRunoffM3','directWaterM3','wetPrecipitationM3','snowChangeM3','shallowChangeM3','poolChangeM3','upstreamReceivedM3','shallowRechargeM3','shallowReturnM3','shallowEvaporationM3','directRunoffM3'];
const empty=()=>Object.fromEntries(terms.map(k=>[k,0]));
function wetState(tree,model){
 const pools=P.activePools(tree.root),levels=new Map(pools.flatMap(p=>p.leaves.map(leaf=>[leaf,p.levelM])));
 const wet=model.columns.filter(c=>c.elevationM<(levels.get(c.leaf)??-Infinity));
 return {pools,wetCells:wet.map(c=>c.cell),areaM2:wet.reduce((s,c)=>s+c.areaM2,0)};
}
function simulate(model,source,{years=100,substeps=30,evaporationMPerYear=1,netGroundLossMPerYear=0,initialFraction=0}={},receipts=[]){
 if(!Number.isInteger(years)||years<1||years>500||!Number.isInteger(substeps)||substeps<1||substeps>240||![evaporationMPerYear,netGroundLossMPerYear].every(v=>Number.isFinite(v)&&v>=0)||!Number.isFinite(initialFraction)||initialFraction<0||initialFraction>1)throw Error('Invalid scenario');
 const {cells,area,rainFactor,fields:f}=source,n=cells.length;
 if(n!==model.assignments.length||cells.some((c,j)=>c!==model.assignments[j].cell))throw Error('Input alignment');
 if(receipts.length&&receipts.length!==years*12)throw Error('Receipt length');
 const assignments=new Map(model.assignments.map(a=>[a.cell,a]));
 for(const row of receipts){if(!Array.isArray(row))throw Error('Receipt row');for(const r of row)if(!assignments.has(r.entryCell)||!Number.isFinite(r.volumeM3)||r.volumeM3<0)throw Error('Invalid receipt');}
 const tree=P.hierarchy(model.partition,model.crestM),root=tree.root;
 const initialPoolM3=root.capacityM3*initialFraction;
 // An explicit filling history, not a unique stage inferred from total volume.
 P.inject(root,model.initialLeaf,initialPoolM3);
 const snow=Float64Array.from(cells,(_,j)=>f.snowStartMm[j*12]),shallow=Float64Array.from(cells,(_,j)=>f.shallowStartMm[j*12]);
 const store=arr=>arr.reduce((sum,v,j)=>sum+v*area[j]/1000,0),startSnow=store(snow),startShallow=store(shallow);
 const index=new Map(cells.map((c,j)=>[c,j])),leaves=model.assignments.map(c=>c.leaf),leafIndex=new Map(root.leaves.map((leaf,j)=>[leaf,j])),delivery=leaves.map(leaf=>leafIndex.get(leaf)),wetMask=new Uint8Array(n),previousWet=new Uint8Array(n);
 const totals=empty(),annual=[],periods=[],dt=1/(12*substeps);let firstExcess=null,maxResidualM3=0,wetTransitions=0,dryTransitions=0;
 function losses(row,fraction){row.waterEvaporationM3+=P.removeDepth(root,evaporationMPerYear*dt*fraction);row.netGroundLossM3+=P.removeDepth(root,netGroundLossMPerYear*dt*fraction);}
 for(let year=1;year<=years;year++){
  const a={year,...empty()};
  for(let period=1;period<=12;period++){
   const row={year,period,...empty()},oldPool=root.volumeM3;
   for(let substep=0;substep<substeps;substep++){
    losses(row,.5);wetMask.fill(0);const state=wetState(tree,model);for(const cell of state.wetCells)wetMask[index.get(cell)]=1;
    const inflows=new Float64Array(root.leaves.length);
    for(let j=0;j<n;j++){
     const k=j*12+period-1,areaFactor=area[j]/1000,p=f.precipitationMm[k]/substeps,wet=wetMask[j]===1;
     if(wetMask[j]!==previousWet[j]){if(wet)wetTransitions++;else dryTransitions++;previousWet[j]=wetMask[j];}
     const r=stepLedger(snow[j],shallow[j],p,f.temperatureC[k],rainFactor[j],substeps,wet);snow[j]=r.snow;shallow[j]=r.shallow;
     row.precipitationM3+=p*areaFactor;row.landEvaporationM3+=r.evaporation*areaFactor;row.landRunoffM3+=r.runoff*areaFactor;row.directWaterM3+=r.directWater*areaFactor;row.wetPrecipitationM3+=(wet?p:0)*areaFactor;
     for(const key of ['shallowRecharge','shallowReturn','shallowEvaporation','directRunoff'])row[key+'M3']+=r[key]*areaFactor;
     row.snowChangeM3+=r.snowChange*areaFactor;row.shallowChangeM3+=r.shallowChange*areaFactor;inflows[delivery[j]]+=(r.runoff+r.directWater)*areaFactor;
    }
    for(const receipt of receipts[(year-1)*12+period-1]||[]){const volume=receipt.volumeM3/substeps;inflows[leafIndex.get(assignments.get(receipt.entryCell).leaf)]+=volume;row.upstreamReceivedM3+=volume;}
    let excess=0;root.leaves.forEach((leaf,j)=>excess+=P.inject(root,leaf,inflows[j]));row.boundaryExcessM3+=excess;
    if(excess>1&&!firstExcess)firstExcess={year,period,substep:substep+1,elapsedYears:year-1+(period-1+(substep+1)/substeps)/12};
    losses(row,.5);
   }
   row.poolChangeM3=root.volumeM3-oldPool;
   row.residualM3=row.precipitationM3+row.upstreamReceivedM3-row.landEvaporationM3-row.waterEvaporationM3-row.netGroundLossM3-row.boundaryExcessM3-row.snowChangeM3-row.shallowChangeM3-row.poolChangeM3;
   maxResidualM3=Math.max(maxResidualM3,Math.abs(row.residualM3));
   row.poolM3=root.volumeM3;row.snowM3=store(snow);row.shallowM3=store(shallow);
   Object.assign(row,wetState(tree,model));periods.push(row);for(const k of terms)a[k]+=row[k];
  }
  const last=periods.at(-1);Object.assign(a,{poolM3:last.poolM3,snowM3:last.snowM3,shallowM3:last.shallowM3,pools:last.pools,wetCells:last.wetCells,areaM2:last.areaM2});
  annual.push(a);for(const k of terms)totals[k]+=a[k];
 }
 // Independent inventory closure uses final states, not accumulated delta terms.
 totals.snowChangeM3=store(snow)-startSnow;totals.shallowChangeM3=store(shallow)-startShallow;totals.poolChangeM3=root.volumeM3-initialPoolM3;
 totals.residualM3=totals.precipitationM3+totals.upstreamReceivedM3-totals.landEvaporationM3-totals.waterEvaporationM3-totals.netGroundLossM3-totals.boundaryExcessM3-totals.snowChangeM3-totals.shallowChangeM3-totals.poolChangeM3;
 const savedYears=[...new Set([1,firstExcess?.year,years].filter(Boolean))].sort((a,b)=>a-b);
 const peak=periods.reduce((a,b)=>a.boundaryExcessM3>b.boundaryExcessM3?a:b);
 return {id:`E${evaporationMPerYear}-G${netGroundLossMPerYear}-I${initialFraction}`,options:{years,substeps,evaporationMPerYear,netGroundLossMPerYear,initialFraction,initialPoolM3,initialSnowM3:startSnow,initialShallowM3:startShallow,initialLeaf:model.initialLeaf},firstExcess,annual,periods,savedYears,final:annual.at(-1),totals,maxPeriodResidualM3:maxResidualM3,wetTransitions,dryTransitions,peakPeriodExcess:{year:peak.year,period:peak.period,volumeM3:peak.boundaryExcessM3,meanRateM3S:peak.boundaryExcessM3/SECONDS},actualStorageM3:null,actualEvaporationM3:null,actualInfiltrationM3:null,actualOverflowM3:null,automaticAdoption:false};
}
function discharge(coefficient,widthM,headM){if(![coefficient,widthM,headM].every(v=>Number.isFinite(v)&&v>=0))throw Error('Invalid rating');return coefficient*widthM*Math.pow(headM,1.5);}
function requiredWidth(rateM3S,coefficient,headM){if(!Number.isFinite(rateM3S)||rateM3S<0||!Number.isFinite(coefficient)||coefficient<=0||!Number.isFinite(headM)||headM<0)throw Error('Invalid rating');return headM===0?null:rateM3S/(coefficient*Math.pow(headM,1.5));}
module.exports={unpack,stepLedger,simulate,wetState,terms,SECONDS};
