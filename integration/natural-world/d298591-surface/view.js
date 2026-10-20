(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.SurfaceReview=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 function validate(d){
  if(d?.schema!=='d298591-surface-review/1'||d.summary?.schema!=='d298591-surface-summary/1'||d.model?.id!=='D298591'||d.summary.physicalResolvedReaches!==0||d.summary.unresolvedReaches!==23022||d.automaticAdoption!==false||d.scenarios?.length!==12)throw Error('자료 형식·미정 상태 불일치');
  const ids=new Set();for(const c of d.scenarios){
   if(ids.has(c.id)||![.5,1,2].includes(c.options.evaporationMPerYear)||![0,.25].includes(c.options.netGroundLossMPerYear)||![0,.5].includes(c.options.initialFraction)||c.annual.length!==100||c.automaticAdoption!==false||!['actualStorageM3','actualEvaporationM3','actualInfiltrationM3','actualOverflowM3'].every(k=>c[k]===null))throw Error('조건별 자료 불일치');
   ids.add(c.id);for(const [i,r]of c.annual.entries())if(r.year!==i+1||!Array.isArray(r.wetCells)||!Number.isFinite(r.poolM3)||r.poolM3<0)throw Error('연도별 자료 불일치');
  }
  for(const e of [.5,1,2])for(const g of [0,.25])for(const i of [0,.5])if(!d.scenarios.some(c=>c.id===`E${e}-G${g}-I${i}`&&c.options.evaporationMPerYear===e&&c.options.netGroundLossMPerYear===g&&c.options.initialFraction===i))throw Error('누락된 조건');
  return d;
 }
 function select(data,id,year){
  const c=data.scenarios.find(c=>c.id===id);if(!c||!Number.isInteger(year)||year<1||year>100)throw Error('조건 또는 연도가 올바르지 않습니다.');
  return {schema:'d298591-surface-selection/1',basinId:'D298591',scenario:c,selectedYear:c.annual[year-1],provenance:data.summary.provenance,assumptions:data.summary.assumptions,outlet:data.summary.outlet.cases.find(c=>c.id===id),actual:{wetAreaM2:null,snowDepthM:null,iceExtentM2:null,riverWidthM:null,forestEdge:null,floodExtentM2:null,storageM3:null,evaporationM3:null,infiltrationM3:null,overflowM3:null},automaticAdoption:false};
 }
 return {validate,select};
});
