'use strict';
const P=require('../pond-budget/core.js'),B=require('../d298591-surface/core.cjs');
const YEAR_SECONDS=365*86400;
const terms=['precipitationM3','landEvaporationM3','waterEvaporationM3','netGroundLossM3','conditionalReleaseM3','heldWaterM3','landRunoffM3','directWaterM3','snowChangeM3','shallowChangeM3','poolChangeM3'];
const empty=()=>Object.fromEntries(terms.map(k=>[k,0]));
function rating(stageM,crestM,widthM,coefficient,tailwaterRiseM){
 if(![stageM,crestM,widthM,coefficient,tailwaterRiseM].every(Number.isFinite)||widthM<0||coefficient<=0)throw Error('Invalid rating');
 if(tailwaterRiseM>0)return null; // No fabricated submergence correction or reverse flow.
 return coefficient*widthM*Math.max(0,stageM-crestM)**1.5;
}
// Exact autonomous drainage for piecewise-constant native-column area.
// All local saddles must lie below the outlet crest: draining never splits a pool.
function drain(root,crestM,widthM,coefficient,seconds){
 if(![crestM,widthM,coefficient,seconds].every(Number.isFinite)||widthM<0||coefficient<=0||seconds<0)throw Error('Invalid drain');
 if(root.mergeM!==null&&root.mergeM>crestM)throw Error('Outlet drainage would cross an unresolved saddle');
 const before=root.volumeM3,crestVolume=root.h.atLevel(crestM).volumeM3;
 if(before<=crestVolume||widthM===0||seconds===0)return 0;
 let level=root.h.atVolume(before).levelM,remaining=seconds;
 const breaks=[...new Set([crestM,...root.columns.map(c=>c.elevationM).filter(z=>z>crestM&&z<level)])].sort((a,b)=>b-a),k=coefficient*widthM;
 for(const lower of breaks){
  const area=root.columns.reduce((s,c)=>s+(c.elevationM<level?c.areaM2:0),0),head=level-crestM,lowHead=lower-crestM;
  const duration=lowHead===0?Infinity:2*area/k*(1/Math.sqrt(lowHead)-1/Math.sqrt(head));
  if(remaining<=duration){level=crestM+(1/Math.sqrt(head)+k*remaining/(2*area))**-2;remaining=0;break;}
  remaining-=duration;level=lower;
 }
 root.volumeM3=Math.max(crestVolume,Math.min(before,root.h.atLevel(level).volumeM3));
 return before-root.volumeM3;
}
function simulate(model,source,options={}){
 const o={years:100,substeps:30,evaporationMPerYear:1,netGroundLossMPerYear:.25,initialFraction:0,widthM:1000,coefficient:1.5,tailwaterRiseM:0,...options};
 if(!Number.isInteger(o.years)||o.years<1||o.years>500||!Number.isInteger(o.substeps)||o.substeps<1||o.substeps>240||![o.evaporationMPerYear,o.netGroundLossMPerYear,o.widthM].every(v=>Number.isFinite(v)&&v>=0)||!Number.isFinite(o.initialFraction)||o.initialFraction<0||o.initialFraction>1||!Number.isFinite(o.coefficient)||o.coefficient<=0||!Number.isFinite(o.tailwaterRiseM))throw Error('Invalid scenario');
 const {cells,area,rainFactor,fields:f}=source,n=cells.length;
 if(n!==model.assignments.length||cells.some((c,j)=>c!==model.assignments[j].cell))throw Error('Source alignment');
 const tree=P.hierarchy(model.partition,model.limitM),root=tree.root;
 if(!(model.limitM>model.crestM)||root.mergeM!==null&&root.mergeM>model.crestM)throw Error('Unsupported domain');
 const initialPoolM3=root.h.atLevel(model.crestM).volumeM3*o.initialFraction;
 P.inject(root,model.initialLeaf,initialPoolM3);
 const snow=Float64Array.from(cells,(_,j)=>f.snowStartMm[j*12]),shallow=Float64Array.from(cells,(_,j)=>f.shallowStartMm[j*12]);
 const store=a=>a.reduce((s,v,j)=>s+v*area[j]/1000,0),initialSnowM3=store(snow),initialShallowM3=store(shallow);
 const index=new Map(cells.map((c,j)=>[c,j])),leafIndex=new Map(root.leaves.map((l,j)=>[l,j])),delivery=model.assignments.map(a=>leafIndex.get(a.leaf));
 const wetMask=new Uint8Array(n),totals=empty(),annual=[],periods=[];let elapsedYears=0,stop=null,firstRelease=null,maxResidualM3=0,heldWaterM3=0;
 const residual=r=>r.precipitationM3-r.landEvaporationM3-r.waterEvaporationM3-r.netGroundLossM3-r.conditionalReleaseM3-r.heldWaterM3-r.snowChangeM3-r.shallowChangeM3-r.poolChangeM3;
 function snapshot(){const state=B.wetState(tree,model),connected=P.activePools(root).find(p=>p.leaves.includes(model.outletLeaf)),level=connected?.levelM??null;return {elapsedYears,poolM3:root.volumeM3,snowM3:store(snow),shallowM3:store(shallow),heldWaterM3,...state,outletStageM:level,stageRiseM:level===null?null:level-model.crestM,conditionalRateM3S:stop?null:level===null?(o.tailwaterRiseM>0?null:0):rating(level,model.crestM,o.widthM,o.coefficient,o.tailwaterRiseM)};}
 const initial=snapshot();
 function advance(period,dt){
  const row=empty(),old=root.volumeM3,steps=1/(12*dt);
  function losses(){row.waterEvaporationM3+=P.removeDepth(root,o.evaporationMPerYear*dt/2);row.netGroundLossM3+=P.removeDepth(root,o.netGroundLossMPerYear*dt/2);}
  row.conditionalReleaseM3+=drain(root,model.crestM,o.widthM,o.coefficient,dt*YEAR_SECONDS/2);losses();
  wetMask.fill(0);for(const cell of B.wetState(tree,model).wetCells)wetMask[index.get(cell)]=1;
  const inflows=new Float64Array(root.leaves.length);
  for(let j=0;j<n;j++){
   const k=j*12+period-1,af=area[j]/1000,p=f.precipitationMm[k]/steps;
   const r=B.step(snow[j],shallow[j],p,f.temperatureC[k],rainFactor[j],steps,wetMask[j]===1);
   snow[j]=r.snow;shallow[j]=r.shallow;row.precipitationM3+=p*af;row.landEvaporationM3+=r.evaporation*af;row.landRunoffM3+=r.runoff*af;row.directWaterM3+=r.directWater*af;row.snowChangeM3+=r.snowChange*af;row.shallowChangeM3+=r.shallowChange*af;inflows[delivery[j]]+=(r.runoff+r.directWater)*af;
  }
  root.leaves.forEach((leaf,j)=>row.heldWaterM3+=P.inject(root,leaf,inflows[j]));
  // This is a guard on the split integration's post-supply stage, before any
  // second loss/drain. Never release water after the domain has become invalid.
  const hit=row.heldWaterM3>0||root.volumeM3>=root.capacityM3;
  if(!hit){losses();row.conditionalReleaseM3+=drain(root,model.crestM,o.widthM,o.coefficient,dt*YEAR_SECONDS/2);}
  row.poolChangeM3=root.volumeM3-old;row.residualM3=residual(row);return {row,hit};
 }
 if(o.tailwaterRiseM>0)stop={reason:'unsupported-tailwater',elapsedYears:0,tailwaterRiseM:o.tailwaterRiseM,unprocessedYears:o.years};
 outer:for(let year=1;year<=o.years&&!stop;year++){
  const annualRow={year,...empty(),complete:false};
  for(let period=1;period<=12;period++){
   const row={year,period,...empty(),complete:false};
   for(let substep=0;substep<o.substeps;substep++){
    const dt=1/(12*o.substeps),start=elapsedYears,volumes=tree.nodes.map(n=>n.volumeM3),oldSnow=snow.slice(),oldShallow=shallow.slice();
    const restore=()=>{tree.nodes.forEach((n,j)=>n.volumeM3=volumes[j]);snow.set(oldSnow);shallow.set(oldShallow);};
    let result=advance(period,dt),used=dt;
    if(result.hit){
     // Locate the boundary within this numerical step without deleting stores.
     let low=0,high=dt;
     for(let i=0;i<32;i++){const mid=(low+high)/2;restore();if(advance(period,mid).hit)high=mid;else low=mid;}
     restore();used=high;result=advance(period,used);
     stop={reason:'alternate-outlet-limit',year,period,substep:substep+1,elapsedYears:start+used,bracketYears:[start+low,start+high],originalStepYears:dt,limitM:model.limitM,unprocessedYears:o.years-start-used,meaning:'Boundary of split numerical scheme; bracket is not physical event-time accuracy.'};
    }
    elapsedYears=start+used;heldWaterM3+=result.row.heldWaterM3;
    if(result.row.conditionalReleaseM3>1e-6&&!firstRelease)firstRelease={year,period,elapsedYears};
    for(const k of terms)row[k]+=result.row[k];
    if(stop)break;
   }
   row.complete=!stop;row.residualM3=residual(row);maxResidualM3=Math.max(maxResidualM3,Math.abs(row.residualM3));Object.assign(row,snapshot());periods.push(row);for(const k of terms)annualRow[k]+=row[k];
   if(stop)break;
  }
  annualRow.complete=!stop;annualRow.residualM3=residual(annualRow);Object.assign(annualRow,snapshot());annual.push(annualRow);for(const k of terms)totals[k]+=annualRow[k];
  if(stop)break outer;
 }
 const final=snapshot();totals.snowChangeM3=final.snowM3-initialSnowM3;totals.shallowChangeM3=final.shallowM3-initialShallowM3;totals.poolChangeM3=final.poolM3-initialPoolM3;totals.heldWaterM3=heldWaterM3;totals.residualM3=residual(totals);
 const savedYears=[...new Set([1,firstRelease?.year,annual.at(-1)?.year].filter(Boolean))];
 return {id:`E${o.evaporationMPerYear}-G${o.netGroundLossMPerYear}-I${o.initialFraction}-W${o.widthM}-C${o.coefficient}-T${o.tailwaterRiseM}`,options:{...o,initialPoolM3,initialSnowM3,initialShallowM3},status:stop?.reason??'completed-horizon',stop,firstRelease,initial,annual,periods:periods.filter(r=>savedYears.includes(r.year)),savedYears,final,totals,maxPeriodResidualM3:maxResidualM3,finalCellStores:{cells,snowMm:Array.from(snow),shallowMm:Array.from(shallow)},actualStorageM3:null,actualDischargeM3S:null,actualWidthM:null,actualTailwaterM:null,automaticAdoption:false};
}
module.exports={simulate,rating,drain,YEAR_SECONDS,terms};
