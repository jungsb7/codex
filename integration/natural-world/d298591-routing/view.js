(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.RoutingReview=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const choices={evap:[.5,1,2],ground:[0,.25],initial:[0,.5],width:[100,1000,5000],tailwater:[0,.05,.5,1]};
const id=o=>`E${o.evap}-G${o.ground}-I${o.initial}-W${o.width}-C1.5-T${o.tailwater}`;
function validate(d){
 if(d?.schema!=='d298591-routing-review/1'||d.summary?.schema!=='d298591-routing-summary/1'||d.model?.id!=='D298591'||d.model.columns.length!==132||d.model.assignments.length!==619||d.summary.physicalResolvedReaches!==0||d.summary.unresolvedReaches!==23022||d.automaticAdoption!==false||d.scenarios?.length!==144)throw Error('자료 형식·미정 상태 불일치');
 const ids=new Set();for(const c of d.scenarios){
  const o=c.options;if(ids.has(c.id)||c.id!==id({evap:o.evaporationMPerYear,ground:o.netGroundLossMPerYear,initial:o.initialFraction,width:o.widthM,tailwater:o.tailwaterRiseM})||c.automaticAdoption!==false||!['actualStorageM3','actualDischargeM3S','actualWidthM','actualTailwaterM'].every(k=>c[k]===null))throw Error('조건 자료 불일치');ids.add(c.id);
  if(!['completed-horizon','alternate-outlet-limit','unsupported-tailwater'].includes(c.status)||!Number.isFinite(c.final.elapsedYears)||c.final.elapsedYears<0||c.final.elapsedYears>100.000001)throw Error('중단 상태 불일치');
  if(c.stop&&c.final.conditionalRateM3S!==null)throw Error('중단 후 방류율 불일치');
  if(c.status==='unsupported-tailwater'&&(c.annual.length!==0||c.final.elapsedYears!==0||c.final.conditionalRateM3S!==null))throw Error('하류 보류 상태 불일치');
  for(const [j,r]of c.annual.entries())if(r.year!==j+1||!Number.isFinite(r.poolM3)||r.poolM3<0||r.poolM3>d.summary.limitVolumeM3+.01||!Array.isArray(r.wetCells))throw Error('재고 불일치');
 }
 for(const evap of choices.evap)for(const ground of choices.ground)for(const initial of choices.initial)for(const width of choices.width)for(const tailwater of choices.tailwater)if(!ids.has(id({evap,ground,initial,width,tailwater})))throw Error('누락된 조건');
 return d;
}
function select(d,key,year){
 const c=d.scenarios.find(c=>c.id===key);if(!c||!Number.isInteger(year)||year<0||year>c.annual.length)throw Error('조건 또는 계산 시점이 올바르지 않습니다.');
 return {schema:'d298591-routing-selection/1',basinId:'D298591',scenario:c,selectedYear:year===0?{year:0,complete:false,...c.initial}:c.annual[year-1],provenance:d.summary.provenance,assumptions:d.summary.assumptions,domain:{columns:d.model.columns,crestM:d.model.crestM,exclusiveLimitM:d.model.limitM},actual:{storageM3:null,dischargeM3S:null,riverWidthM:null,localTailwaterM:null,wetAreaM2:null,snowDepthM:null,iceExtentM2:null,floodExtentM2:null,forestEdge:null},automaticAdoption:false};
}
return {validate,select,choices,id};
});
