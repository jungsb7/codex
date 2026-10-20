(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.TailwaterReview=factory();})(globalThis,function(){
'use strict';
function validate(d){
 if(d?.schema!=='d298591-tailwater-review/1'||d.summary?.schema!=='d298591-tailwater-summary/1'||d.rows?.length!==62||d.automaticAdoption!==false||d.actualTailwaterM!==null||d.summary.physicalResolvedReaches!==0||d.summary.unresolvedReaches!==23022||d.summary.decision.coupledRoutingReady!==false||d.summary.decision.priorTailwaterHeldCases!==108)throw Error('자료 형식·미정 상태 불일치');
 const ids=new Set();for(const [i,r]of d.rows.entries()){
  if(ids.has(r.cell)||r.index!==i||r.receiver!==(d.rows[i+1]?.cell??-1)||r.periods?.length!==12||!Number.isFinite(r.elevationM)||!Number.isFinite(r.distanceKm)||['actualWidthM','actualDepthM','actualRoughness','actualTailwaterM'].some(k=>r[k]!==null))throw Error('경로·실제값 불일치');ids.add(r.cell);
  for(const [k,p]of r.periods.entries())if(p.period!==k+1||p.d298591ReleaseIncluded!==false||p.combinedActualFlowM3S!==null||p.actualWaterSurfaceM!==null||!['sourceBaseM3S','upstreamPathBaseM3S','localBaseM3S','sideInputBaseM3S'].every(n=>Number.isFinite(p[n])&&p[n]>=0)||Math.abs(p.sourceBaseM3S-p.upstreamPathBaseM3S-p.localBaseM3S-p.sideInputBaseM3S)>1e-8)throw Error('유량 장부 불일치');
 }return d;
}
function select(d,cell,period){const r=d.rows.find(r=>r.cell===cell);if(!r||!Number.isInteger(period)||period<1||period>12)throw Error('격자 또는 공전 기간이 올바르지 않습니다.');return {schema:'d298591-tailwater-selection/1',basinId:'D298591',station:r,selectedPeriod:r.periods[period-1],route:d.summary.route,baselineFlow:d.summary.baselineFlow,designAudit:d.summary.designAudit,requirements:d.summary.requirements,decision:d.summary.decision,provenance:d.summary.provenance,actual:{tailwaterM:null,dischargeM3S:null,riverWidthM:null,depthM:null,roughness:null,floodExtentM2:null,snowDepthM:null,iceExtentM2:null,forestEdge:null},physicalResolvedReaches:0,unresolvedReaches:23022,automaticAdoption:false};}
return {validate,select};
});
