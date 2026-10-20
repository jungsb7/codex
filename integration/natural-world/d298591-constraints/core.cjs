'use strict';
const D=require('../cold-water/diagnostics.js');
const YEAR_SECONDS=365*86400,PERIOD_DAYS=365/12;
function snowBalance(temperatures,precipitation,{warmingC=0,meltFactor=45}={}){
 if(temperatures.length!==12||precipitation.length!==12||!temperatures.every(Number.isFinite)||!precipitation.every(p=>Number.isFinite(p)&&p>=0)||!Number.isFinite(warmingC)||!Number.isFinite(meltFactor)||meltFactor<0)throw Error('Invalid snow forcing');
 const t=temperatures.map(v=>v+warmingC),snowfall=precipitation.reduce((s,p,k)=>s+(t[k]<0?p:0),0),capacity=t.reduce((s,v)=>s+Math.max(0,v)*meltFactor,0);
 return {snowfallMm:snowfall,meltCapacityMm:capacity,annualAccumulationMm:Math.max(0,snowfall-capacity),maximumTemperatureC:Math.max(...t),minimumTemperatureC:Math.min(...t),belowZeroPeriods:t.filter(v=>v<0).length,reason:snowfall-capacity>1e-7?(Math.max(...t)<=0?'no-positive-temperature':'snowfall-exceeds-melt-capacity'):'no-persistent-accumulation'};
}
function snowYear(temperatures,precipitation,startMm=0,{warmingC=0,meltFactor=45}={}){
 snowBalance(temperatures,precipitation,{warmingC,meltFactor});if(!Number.isFinite(startMm)||startMm<0)throw Error('Invalid snow store');let snow=startMm,totalMelt=0;
 for(let k=0;k<12;k++){const t=temperatures[k]+warmingC;if(t<0)snow+=precipitation[k];const melt=Math.min(snow,Math.max(0,t)*meltFactor);snow-=melt;totalMelt+=melt;}
 return {endMm:snow,changeMm:snow-startMm,meltMm:totalMelt};
}
function balanceWarming(t,p){
 if(snowBalance(t,p).annualAccumulationMm<=1e-7)return 0;
 let lo=0,hi=20;if(snowBalance(t,p,{warmingC:hi}).annualAccumulationMm>1e-7)return null;
 for(let k=0;k<55;k++){const mid=(lo+hi)/2;if(snowBalance(t,p,{warmingC:mid}).annualAccumulationMm>1e-7)lo=mid;else hi=mid;}return hi;
}
function interpolateWind(grid,lon,lat,period){
 const {width:w,height:h,stepDegrees:step,months}=grid;
 if(!Number.isInteger(period)||period<0||period>11)throw Error('Invalid period');
 const x=((lon+180)/step-.5+w)%w,y=Math.max(0,Math.min(h-1,(90-lat)/step-.5)),ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy;
 const at=arr=>{let v=0;for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++)v+=arr[Math.min(h-1,iy+dy)*w+(ix+dx)%w]*(dx?fx:1-fx)*(dy?fy:1-fy);return v;};
 const u=at(months[period].u),v=at(months[period].v);return {u,v,speed:Math.hypot(u,v)};
}
function energy(cells,evaporationMPerYear,solarSteps=64){
 if(!cells.length||!Number.isFinite(evaporationMPerYear)||evaporationMPerYear<0)throw Error('Invalid surface');
 const area=cells.reduce((s,c)=>s+c.areaM2,0),need=evaporationMPerYear*1000*D.C.latentVaporizationJKg/YEAR_SECONDS;
 const periods=Array.from({length:12},(_,k)=>{
  const mean=fn=>cells.reduce((s,c)=>s+fn(c)*c.areaM2,0)/area;
  const toa=mean(c=>D.periodSolar(c.latitude,k,solarSteps)),cold=mean(c=>c.temperaturesC[k]<0?1:0);
  return {period:k+1,sourcePhaseDegrees:k*30,solarIntervalDegrees:[k*30,(k+1)*30],meanAirTemperatureC:mean(c=>c.temperaturesC[k]),coldAirAreaFraction:cold,meanDiagnosticWindMps:mean(c=>c.wind[k].speed),toaWm2:toa,requiredLatentWm2:need,latentToToaRatio:toa>0?need/toa:null,localShortwaveGapWm2:Math.max(0,need-toa),actualSurfaceNetRadiationWm2:null,actualEvaporationM3:null,actualIceAreaM2:null};
 });
 return {maskCells:cells.map(c=>c.cell),areaM2:area,evaporationMPerYear,periods,annualToaWm2:periods.reduce((s,r)=>s+r.toaWm2,0)/12,requiredLatentWm2:need,shortwaveGapPeriods:periods.filter(r=>r.localShortwaveGapWm2>0).map(r=>r.period),belowZeroAirEquivalentDays:periods.reduce((s,r)=>s+r.coldAirAreaFraction*PERIOD_DAYS,0),fullEnergyBalanceClosed:false,actualEvaporationMPerYear:null};
}
function neighbours(i,w,h){
 const x=i%w,y=Math.floor(i/w),result=[];for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy||y+dy<0||y+dy>=h)continue;result.push((y+dy)*w+(x+dx+w)%w);}return result;
}
function component(a,w,h,seed,levelM,blockedEdge=null){
 if(!Number.isFinite(levelM)||!a.land[seed]||a.lake[seed]||a.heights[seed]>levelM)throw Error('Invalid flood seed');
 const seen=new Set([seed]),queue=[seed],marine=new Set(),lake=new Set(),parent=new Map();let witness=null;
 const blocked=(i,j)=>blockedEdge&&((i===blockedEdge[0]&&j===blockedEdge[1])||(i===blockedEdge[1]&&j===blockedEdge[0]));
 for(let k=0;k<queue.length;k++){const i=queue[k];for(const j of neighbours(i,w,h)){
  if(blocked(i,j))continue;
  if(a.lake[j]){lake.add(j);continue;}
  if(!a.land[j]){marine.add(j);if(!witness){witness=[j,i];while(witness.at(-1)!==seed)witness.push(parent.get(witness.at(-1)));witness.reverse();}continue;}
  if(a.heights[j]<=levelM&&!seen.has(j)){seen.add(j);parent.set(j,i);queue.push(j);}
 }}
 return {cells:queue.sort((a,b)=>a-b),marineContacts:[...marine].sort((a,b)=>a-b),lakeContacts:[...lake].sort((a,b)=>a-b),marineWitness:witness};
}
function firstBypass(a,w,h,seed,crestM,edge,maxRiseM=5){
 if(component(a,w,h,seed,crestM,edge).marineContacts.length)throw Error('Gate does not isolate baseline');
 if(!component(a,w,h,seed,crestM+maxRiseM,edge).marineContacts.length)return null;
 let lo=crestM,hi=crestM+maxRiseM;for(let k=0;k<42;k++){const mid=(lo+hi)/2;if(component(a,w,h,seed,mid,edge).marineContacts.length)hi=mid;else lo=mid;}
 const hit=component(a,w,h,seed,hi,edge),threshold=Math.max(...hit.marineWitness.filter(i=>a.land[i]).map(i=>a.heights[i]));
 return {levelM:threshold,riseM:threshold-crestM,path:hit.marineWitness,meaning:'Native D8 bypass after deleting exactly one gate edge; not a designed dam or resolved hydraulic channel.'};
}
function outletGuard({stageRiseM,extraCells,bypass,tailwaterDepthM}){
 if(![stageRiseM,tailwaterDepthM].every(Number.isFinite)||stageRiseM<0||!Number.isInteger(extraCells)||extraCells<0)throw Error('Invalid outlet diagnostic');
 return {stageRiseM,tailwaterDepthM,negligibleApproachVelocityAssumed:true,referenceEnergyHeadM:stageRiseM,submergenceRatio:stageRiseM>0?Math.max(0,tailwaterDepthM)/stageRiseM:null,freeFlowScreen:stageRiseM===0?'no-positive-head':tailwaterDepthM>0?'tailwater-correction-required':'free-flow-assumption-only',domainStatus:bypass?'alternate-marine-path':extraCells?'additional-columns-and-forcing-required':'native-columns-contained-under-deleted-edge',physicalWidthM:null,actualDischargeM3S:null,coupledRoutingReady:false};
}
module.exports={snowBalance,snowYear,balanceWarming,interpolateWind,energy,neighbours,component,firstBypass,outletGuard,YEAR_SECONDS};
