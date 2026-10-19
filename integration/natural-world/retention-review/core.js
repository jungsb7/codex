(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.RetentionReview=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const RULES={version:'retention-alternatives/1',years:500,periods:12,daysPerYear:365,substepsPerPeriod:30,initialStorageM3:0,netSinkMPerYear:[0,.25,.5],loweredSillM:25,meaning:'Fixed boundary inflow and lumped storage sensitivity; no new lake or terrain adoption.'};
function upper(a,value){let lo=0,hi=a.length;while(lo<hi){const mid=(lo+hi)>>1;if(a[mid]<=value)lo=mid+1;else hi=mid;}return lo;}
// Constant-elevation native columns, not bathymetry or a connected lake polygon.
function hypsometry(columns){if(!columns.length)throw Error('Empty terrain');const rows=columns.map(v=>({...v})).sort((a,b)=>a.elevationM-b.elevationM||a.cell-b.cell),z=[],areas=[0],moments=[0],knots=[];for(const v of rows){if(!Number.isFinite(v.elevationM)||!Number.isFinite(v.areaM2)||v.areaM2<=0)throw Error('Invalid terrain column');z.push(v.elevationM);const k=z.length;knots.push(v.elevationM*areas[k-1]-moments[k-1]);areas.push(areas[k-1]+v.areaM2);moments.push(moments[k-1]+v.areaM2*v.elevationM);}
 function atLevel(level){if(!Number.isFinite(level))throw Error('Invalid water level');const k=upper(z,level);return {levelM:level,volumeM3:Math.max(0,level*areas[k]-moments[k]),areaM2:level<=z[0]?0:areas[k]};}
 function atVolume(volume){if(!Number.isFinite(volume)||volume<0)throw Error('Invalid storage');if(volume===0)return {levelM:z[0],volumeM3:0,areaM2:0};const k=Math.max(1,upper(knots,volume));return {levelM:(volume+moments[k])/areas[k],volumeM3:volume,areaM2:areas[k]};}
 return {rows,minElevationM:z[0],maxElevationM:z.at(-1),atLevel,atVolume};
}
function simulate(h,inflow,options){
 const {crestM,netSinkMPerYear,years=500,substeps=30,initialStorageM3=0}=options;
 if(!Number.isFinite(crestM)||crestM<h.minElevationM||inflow.length!==12||!inflow.every(v=>Number.isFinite(v)&&v>=0)||!Number.isFinite(netSinkMPerYear)||netSinkMPerYear<0||!Number.isInteger(years)||years<1||!Number.isInteger(substeps)||substeps<1)throw Error('Invalid scenario');
 const cap=h.atLevel(crestM).volumeM3;if(initialStorageM3<0||initialStorageM3>cap||!Number.isFinite(initialStorageM3))throw Error('Invalid initial storage');
 let storage=initialStorageM3,firstOverflow=null,maxResidualM3=0,totalIn=0,totalOut=0,totalSink=0;const annual=[],months=[];
 for(let year=1;year<=years;year++){
  const start=storage,row={year,startStorageM3:start,inflowM3:0,netSinkM3:0,overflowM3:0,endStorageM3:0,levelM:0,potentialWetAreaKm2:0,residualM3:0};
  for(let period=1;period<=12;period++){
   const old=storage,monthly={year,period,inflowM3:inflow[period-1],netSinkM3:0,overflowM3:0,startStorageM3:old};
   for(let step=0;step<substeps;step++){
    const available=storage+inflow[period-1]/substeps,startArea=h.atVolume(storage).areaM2,endArea=h.atVolume(Math.min(cap,available)).areaM2;
    const demand=(startArea+endArea)/2*netSinkMPerYear/(12*substeps),sink=Math.min(available,demand),after=available-sink,out=Math.max(0,after-cap);storage=Math.min(cap,after);monthly.netSinkM3+=sink;monthly.overflowM3+=out;
    if(out>1&&!firstOverflow)firstOverflow={year,period,substep:step+1,elapsedYears:year-1+(period-1+(step+1)/substeps)/12};
   }
   monthly.endStorageM3=storage;monthly.storageChangeM3=storage-old;monthly.residualM3=monthly.inflowM3-monthly.netSinkM3-monthly.overflowM3-monthly.storageChangeM3;
   maxResidualM3=Math.max(maxResidualM3,Math.abs(monthly.residualM3));row.inflowM3+=monthly.inflowM3;row.netSinkM3+=monthly.netSinkM3;row.overflowM3+=monthly.overflowM3;months.push(monthly);
  }
  const end=h.atVolume(storage);Object.assign(row,{endStorageM3:storage,storageChangeM3:storage-start,levelM:end.levelM,potentialWetAreaKm2:end.areaM2/1e6,residualM3:row.inflowM3-row.netSinkM3-row.overflowM3-(storage-start)});annual.push(row);totalIn+=row.inflowM3;totalOut+=row.overflowM3;totalSink+=row.netSinkM3;
 }
 return {options:{...options,years,substeps,initialStorageM3},capacityProxyM3:cap,firstOverflow,annual,months,maxMonthlyResidualM3:maxResidualM3,totals:{inflowM3:totalIn,overflowM3:totalOut,netSinkM3:totalSink,storageChangeM3:storage-initialStorageM3,residualM3:totalIn-totalOut-totalSink-(storage-initialStorageM3)},final:annual.at(-1),meaning:'Net sink is an additional hypothetical loss of boundary water, not measured evaporation/infiltration. Existing terrestrial rainfall is already in inflow; no rain is added again.'};
}
function trace(start,receiver,stop=-1){const route=[],seen=new Set();let i=start;while(i>=0){if(i>=receiver.length||seen.has(i))throw Error('Invalid or cyclic route');seen.add(i);route.push(i);if(i===stop)break;i=receiver[i];}return route;}
function profile(route,elevations,crest){if(!route.length||!Number.isFinite(crest))throw Error('Invalid profile');let bed=crest;return route.map((cell,k)=>{const original=elevations[cell];if(!Number.isFinite(original))throw Error('Invalid profile elevation');bed=Math.min(bed,original);return {cell,originalElevationM:original,proposedBedM:bed,loweringM:Math.max(0,original-bed)};});}
return {RULES,hypsometry,simulate,trace,profile};
});
