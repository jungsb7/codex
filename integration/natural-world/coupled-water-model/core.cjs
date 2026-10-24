'use strict';
const assert=require('node:assert/strict'),P=require('../pond-budget/core.js'),F=require('../terrain-water-model/core.cjs');
const {cellStep,prepare,validate,YEAR_SECONDS,fluxKeys}=F;
const empty=()=>Object.fromEntries(fluxKeys.map(k=>[k,0])),sum=a=>a.reduce((s,v)=>s+v,0);
const near=(a,b)=>assert(Math.abs(a-b)<=Math.max(.2,Math.abs(b)*2e-10),`${a} != ${b}`);
// Signed designed stage law. Both endpoints use the same end-of-step solution.
function signedRating(a,b,crest,width,coefficient){return coefficient*width*(Math.max(0,a-crest)**1.5-Math.max(0,b-crest)**1.5);}
// Solve bounded backward-Euler network equations by monotone coordinate roots.
// Every face appears once. Residual above a native domain cap is retained and stops the run.
function solve(nodes,edges,available,seconds,coefficient){
 assert(nodes.length===available.length&&seconds>0&&coefficient>0);
 const adjacent=nodes.map(()=>[]),v=available.map((a,i)=>{assert(Number.isFinite(a)&&a>=0);return Math.min(a,nodes[i].capacityM3);});
 edges.forEach((e,k)=>{assert(e.widthM>=0&&e.a!==e.b);adjacent[e.a].push([k,1]);if(e.b!==null)adjacent[e.b].push([k,-1]);});
 const stage=(i,vol)=>nodes[i].h.atVolume(vol).levelM;
 const q=(e,idx=-1,x=0)=>signedRating(stage(e.a,e.a===idx?x:v[e.a]),e.b===null?e.crestM:stage(e.b,e.b===idx?x:v[e.b]),e.crestM,e.widthM,coefficient);
 const residual=(i,x)=>x-available[i]+seconds*sum(adjacent[i].map(([k,sign])=>sign*q(edges[k],i,x)));
 let iterations=0,converged=false,maxEquationResidualM3=0;
 for(;iterations<200;iterations++){
  for(let i=0;i<nodes.length;i++){
   const cap=nodes[i].capacityM3,faces=adjacent[i].map(([k])=>edges[k]);
   const supply=available[i]+seconds*coefficient*sum(faces.map(e=>{const other=e.a===i?e.b:e.a;return other===null?0:e.widthM*Math.max(0,stage(other,v[other])-e.crestM)**1.5;}));
   const f=x=>{const level=stage(i,x);return x+seconds*coefficient*sum(faces.map(e=>e.widthM*Math.max(0,level-e.crestM)**1.5));};
   if(f(cap)<=supply){v[i]=cap;continue;}
   let lo=0,hi=Math.min(cap,supply);if(f(hi)===supply){v[i]=hi;continue;}
   let x=Math.max(lo,Math.min(hi,v[i]));
   for(let k=0;k<60;k++){
    const value=f(x)-supply;if(Math.abs(value)<=Math.max(.0001,supply*1e-14,cap*Number.EPSILON*8))break;
    if(value>0)hi=x;else lo=x;
    const state=nodes[i].h.atVolume(x),derivative=state.areaM2===0?1:1+seconds*coefficient*sum(faces.map(e=>e.widthM*1.5*Math.sqrt(Math.max(0,state.levelM-e.crestM))))/state.areaM2;
    const proposed=x-value/derivative;x=proposed>lo&&proposed<hi?proposed:(lo+hi)/2;
   }v[i]=x;
  }
  maxEquationResidualM3=0;converged=true;
  for(let i=0;i<nodes.length;i++){const r=residual(i,v[i]),err=v[i]===nodes[i].capacityM3?Math.max(0,r):Math.abs(r);maxEquationResidualM3=Math.max(maxEquationResidualM3,err);if(err>Math.max(.002,available[i]*1e-12))converged=false;}
  if(converged)break;
 }
 assert(converged,'Coupled hydraulic solve did not converge '+JSON.stringify({maxEquationResidualM3,bad:v.map((x,i)=>({i,v:x,a:available[i],r:residual(i,x),cap:nodes[i].capacityM3})).filter(x=>Math.abs(x.r)>Math.max(.002,x.a*1e-12))}));
 const transfers=edges.map(e=>seconds*q(e)),balance=[...available];edges.forEach((e,k)=>{balance[e.a]-=transfers[k];if(e.b!==null)balance[e.b]+=transfers[k];});
 const unresolved=balance.map((b,i)=>Math.max(0,b-nodes[i].capacityM3));
 const storage=balance.map((b,i)=>{assert(b>=-.01,'Negative hydraulic storage');return Math.max(0,Math.min(b,nodes[i].capacityM3));});
 return {storage,unresolved,transfers,iterations:iterations+1,maxEquationResidualM3};
}
function edgesFor(states,o){
 const nodeIndex=new Map(states.map((b,i)=>[b.group.node,i])),faces=new Map();
 states.forEach((b,i)=>{const width=Math.max(10,o.widthScale*b.referenceRateM3S/o.outletCoefficient)/b.model.outlets.length;
  for(const f of b.model.outlets){const j=f.targetNode===b.group.target.node&&b.group.target.kind==='ocean'?null:nodeIndex.get(f.targetNode);assert(j!==undefined,'Unmodelled receiver');
   for(const k of [i,j])if(k!==null){const root=states[k].tree.root;assert(root.mergeM===null||root.mergeM<=f.crestM,'Outlet below an internal merge needs pool-specific drainage');}
   const key=[f.from,f.to].sort((a,b)=>a-b).join(':');const old=faces.get(key);
   if(old){assert(old.a===j&&old.b===i);old.widthM=Math.min(old.widthM,width);old.crestM=Math.max(old.crestM,f.crestM);old.origins.push(b.model.id);continue;}
   const aAssignment=b.model.assignments[b.index.get(f.from)],bAssignment=j===null?null:states[j].model.assignments[states[j].index.get(f.to)];assert(aAssignment&&(j===null||bAssignment));
   faces.set(key,{id:key,a:i,b:j,fromId:b.model.id,toId:j===null?'ocean':states[j].model.id,from:f.from,to:f.to,aLeaf:aAssignment.leaf,bLeaf:bAssignment?.leaf??null,crestM:f.crestM,widthM:width,candidate:f.targetNode!==b.group.target.node,origins:[b.model.id]});
  }
 });return [...faces.values()].sort((a,b)=>a.id.localeCompare(b.id));
}
function run(input,options){
 validate(options);const o={...options},dt=1/(12*o.substeps),rates={ground:-Math.expm1(-dt/o.groundwaterReturnYears),soil:-Math.expm1(-dt/o.soilDrainYears)};
 // Canonical ordering ensures API array order does not change the nonlinear iteration.
 const states=[...input.prepared].sort((a,b)=>b.model.crestM-a.model.crestM||a.model.id.localeCompare(b.model.id)).map(b=>{
  const m=b.model,tree=P.hierarchy(m.partition,m.limitM);assert(m.domainStatus==='positive-head-domain');assert(m.outlets.every(e=>e.crestM>=m.crestM));
  const snow=new Float64Array(b.cells.length),soil=new Float64Array(b.cells.length),groundwater=new Float64Array(b.cells.length);
  for(let j=0;j<b.cells.length;j++){snow[j]=b.fields.snowStartMm[j*12];const old=b.fields.shallowStartMm[j*12];soil[j]=Math.min(old,o.soilCapacityMm);groundwater[j]=Math.min(old-soil[j],o.aquiferCapacityMm);assert(P.inject(tree.root,m.assignments[j].leaf,(old-soil[j]-groundwater[j])*b.area[j]/1000)<.1);}
  return {...b,tree,snow,soil,groundwater,index:new Map(b.cells.map((c,j)=>[c,j])),wet:new Uint8Array(b.cells.length),totals:empty(),annual:[],maxStageM:tree.root.h.minElevationM};
 });
 const edges=edgesFor(states,o),edgeResults=edges.map(e=>({...e,forwardM3:0,reverseM3:0,firstForward:null,firstReverse:null,maxHeadDifferenceM:0}));
 const inventory=b=>({snowM3:sum(Array.from(b.snow,(v,j)=>v*b.area[j]/1000)),soilM3:sum(Array.from(b.soil,(v,j)=>v*b.area[j]/1000)),groundwaterM3:sum(Array.from(b.groundwater,(v,j)=>v*b.area[j]/1000)),surfaceM3:b.tree.root.volumeM3});
 const volume=v=>sum(Object.values(v));for(const b of states)b.initial=inventory(b);
 let stop=null,executedSteps=0,maxIterations=0,maxEquationResidualM3=0,maxAnnualResidualM3=0;
 for(let year=1;year<=o.years;year++){
  for(const b of states)b.row={year,...empty(),start:inventory(b)};
  phases:for(let phase=0;phase<12;phase++)for(let step=0;step<o.substeps;step++){
   const available=[];
   for(const b of states){
    const {model:m,fields:f,tree,row}=b,levels=new Map(P.activePools(tree.root).flatMap(p=>p.leaves.map(l=>[l,p.levelM])));b.wet.fill(0);
    for(const c of m.columns)if(c.elevationM<(levels.get(c.leaf)??-Infinity))b.wet[b.index.get(c.cell)]=1;
    const inflows=new Map(tree.root.leaves.map(l=>[l,0]));
    for(let j=0;j<b.cells.length;j++){
     const k=j*12+phase,af=b.area[j]/1000,p=f.precipitationMm[k]/o.substeps,r=cellStep({snow:b.snow[j],soil:b.soil[j],groundwater:b.groundwater[j]},p,f.temperatureC[k],!!b.wet[j],dt,o,rates);
     b.snow[j]=r.snow;b.soil[j]=r.soil;b.groundwater[j]=r.groundwater;row.precipitationM3+=p*af;row.landEvaporationM3+=r.evaporation*af;
     for(const key of ['infiltration','recharge','groundwaterReturn','runoff','directWater'])row[key+'M3']+=r[key]*af;
     const leaf=m.assignments[j].leaf;inflows.set(leaf,inflows.get(leaf)+(r.runoff+r.directWater+r.groundwaterReturn)*af);
    }
    let excess=0;for(const [leaf,v]of inflows)excess+=P.inject(tree.root,leaf,v);
    row.waterEvaporationM3+=P.removeDepth(tree.root,o.evaporationMPerYear*dt);available.push(tree.root.volumeM3+excess);
   }
   const r=solve(states.map(b=>b.tree.root),edges,available,dt*YEAR_SECONDS,o.outletCoefficient);maxIterations=Math.max(maxIterations,r.iterations);maxEquationResidualM3=Math.max(maxEquationResidualM3,r.maxEquationResidualM3);
   const incoming=states.map(()=>[]),outgoing=states.map(()=>0),stamp={year,phase:phase+1,substep:step+1,elapsedYears:(executedSteps+1)*dt};
   edges.forEach((e,k)=>{
    const v=r.transfers[k],er=edgeResults[k],from=v>=0?e.a:e.b,to=v>=0?e.b:e.a,leaf=v>=0?e.bLeaf:e.aLeaf;assert(from!==null,'Ocean inflow is unsupported');
    const amount=Math.abs(v);outgoing[from]+=amount;states[from].row.releasedM3+=amount;if(to!==null){incoming[to].push([leaf,amount]);states[to].row.receivedM3+=amount;}
    er[v>=0?'forwardM3':'reverseM3']+=amount;const first=v>=0?'firstForward':'firstReverse';if(amount>1&&!er[first])er[first]=stamp;
    er.maxHeadDifferenceM=Math.max(er.maxHeadDifferenceM,Math.abs(states[e.a].tree.root.h.atVolume(r.storage[e.a]).levelM-(e.b===null?e.crestM:states[e.b].tree.root.h.atVolume(r.storage[e.b]).levelM)));
   });
   states.forEach((b,i)=>{
    for(const [leaf,v]of incoming[i])P.inject(b.tree.root,leaf,v);
    // Positive outflow requires all component ponds connected above the face crest.
    if(outgoing[i]>0)assert(r.storage[i]>=b.tree.root.baseM3-.1);
    b.tree.root.volumeM3=r.storage[i];b.row.unresolvedM3+=r.unresolved[i];b.maxStageM=Math.max(b.maxStageM,b.tree.root.h.atVolume(r.storage[i]).levelM);
   });
   executedSteps++;const hit=states.filter((b,i)=>r.unresolved[i]>.1);
   if(hit.length){stop={...stamp,lowerTimeYears:(executedSteps-1)*dt,upperTimeYears:executedSteps*dt,boundaries:hit.map(b=>b.model.id),reason:'native-domain-limit'};break phases;}
  }
  for(const b of states){const r=b.row;r.end=inventory(b);r.complete=!stop;r.elapsedYears=executedSteps*dt;r.residualM3=volume(r.start)+r.precipitationM3+r.receivedM3-r.landEvaporationM3-r.waterEvaporationM3-r.releasedM3-r.unresolvedM3-volume(r.end);maxAnnualResidualM3=Math.max(maxAnnualResidualM3,Math.abs(r.residualM3));near(volume(r.start)+r.precipitationM3+r.receivedM3,volume(r.end)+r.landEvaporationM3+r.waterEvaporationM3+r.releasedM3+r.unresolvedM3);b.annual.push(r);for(const k of fluxKeys)b.totals[k]+=r[k];}
  if(process.env.WATER_PROGRESS)console.log(JSON.stringify({year,substeps:o.substeps,stop,maxIterations}));
  if(stop)break;
 }
 const boundaries=states.map(b=>({id:b.model.id,reachCount:b.group.reachCount,sourceCells:b.cells.length,initial:b.initial,final:inventory(b),totals:b.totals,annual:b.annual,maxStageM:b.maxStageM,limitM:b.model.limitM})),totals={...empty(),initialInventoryM3:sum(boundaries.map(b=>volume(b.initial))),finalInventoryM3:sum(boundaries.map(b=>volume(b.final)))};
 for(const k of fluxKeys)totals[k]=sum(boundaries.map(b=>b.totals[k]));totals.oceanDeliveryM3=sum(edgeResults.filter(e=>e.b===null).map(e=>e.forwardM3));totals.internalSentM3=totals.releasedM3-totals.oceanDeliveryM3;
 totals.residualM3=totals.initialInventoryM3+totals.precipitationM3-totals.landEvaporationM3-totals.waterEvaporationM3-totals.oceanDeliveryM3-totals.unresolvedM3-totals.finalInventoryM3;near(totals.internalSentM3,totals.receivedM3);near(totals.initialInventoryM3+totals.precipitationM3,totals.landEvaporationM3+totals.waterEvaporationM3+totals.oceanDeliveryM3+totals.unresolvedM3+totals.finalInventoryM3);
 return {options:o,status:stop?'stopped-at-domain-limit':'completed-horizon',stop,executedSteps,elapsedYears:executedSteps*dt,lastAcceptedTimeYears:stop?stop.lowerTimeYears:executedSteps*dt,boundaries,edges:edgeResults,totals,maxIterations,maxEquationResidualM3,maxAnnualResidualM3,actual:null,automaticAdoption:false};
}
module.exports={prepare,run,solve,signedRating,edgesFor};
