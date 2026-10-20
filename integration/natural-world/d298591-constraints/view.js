(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.ConstraintReview=factory();})(globalThis,function(){
 'use strict';
 function validate(d){
  if(d?.schema!=='d298591-constraints-review/1'||d.summary?.schema!=='d298591-constraints-summary/1'||d.cells?.length!==619||d.sensitivity?.length!==12||d.energy?.length!==12||d.outlet?.levels?.length!==5||d.automaticAdoption!==false||d.summary.physicalResolvedReaches!==0||d.summary.unresolvedReaches!==23022)throw Error('자료 형식·미정 상태 불일치');
  if(new Set(d.cells.map(c=>c.cell)).size!==619||new Set(d.sensitivity.map(c=>c.id)).size!==12||new Set(d.energy.map(c=>c.id)).size!==12||d.outlet.actualDischargeM3S!==null||d.outlet.coupledRoutingReady!==false)throw Error('자료 중복·물리 상태 불일치');
  for(const c of d.cells)if(c.temperaturesC.length!==12||c.precipitationMm.length!==12||c.actualSnowDepthM!==null)throw Error('격자 자료 불일치');
  return d;
 }
 function select(d,{cell=274035,warmingC=0,meltFactor=45,energyId='E2-G0.25-I0',stageRiseM=.1,tailwaterDepthM=0}={}){
  const j=d.cells.findIndex(c=>c.cell===cell),snow=d.sensitivity.find(c=>c.warmingC===warmingC&&c.meltFactorMmPerCPerPeriod===meltFactor),energy=d.energy.find(c=>c.id===energyId),level=d.outlet.levels.find(c=>c.stageRiseM===stageRiseM),guard=level?.guard.find(c=>c.tailwaterDepthM===tailwaterDepthM);
  if(j<0||!snow||!energy||!guard)throw Error('지원하지 않는 조회 조건입니다.');
  const {cellAccumulationMm,...snowSummary}=snow;
  return {schema:'d298591-constraints-selection/1',selection:{cell,warmingC,meltFactor,energyId,stageRiseM,tailwaterDepthM},cell:d.cells[j],snow:{...snowSummary,selectedCellAccumulationMm:cellAccumulationMm[j]},energy,outlet:{candidateDomain:d.outlet.candidateDomain,gate:d.outlet.gate,crestM:d.outlet.crestM,bypass:d.outlet.bypass,level,guard,gateAssumption:d.outlet.gateAssumption,meaning:d.outlet.meaning},provenance:d.summary.provenance,availability:d.summary.availability,actual:{snowDepthM:null,iceAreaM2:null,surfaceNetRadiationWm2:null,evaporationMPerYear:null,infiltrationM3:null,dischargeM3S:null,floodAreaM2:null},automaticAdoption:false};
 }
 return {validate,select};
});
