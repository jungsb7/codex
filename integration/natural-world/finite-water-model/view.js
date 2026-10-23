(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.FiniteWaterView=factory();})(globalThis,function(){
'use strict';
function validate(d){
 if(d?.schema!=='finite-water-model/1'||d.scope?.boundaries!==57||d.scenarios?.length!==3)throw Error('자료 형식이 다릅니다.');
 for(const s of d.scenarios)if(s.automaticAdoption!==false||s.actual?.infiltrationM3!==null||s.boundaries.length!==57||s.boundaries.some(b=>b.annual.length!==100))throw Error('계산 범위 또는 채택 표시가 다릅니다.');
 return d;
}
function query(d,id,boundaryId,year){
 validate(d);const s=d.scenarios.find(s=>s.id===id),b=s?.boundaries.find(b=>b.id===boundaryId);
 if(!b||!Number.isInteger(year)||year<1||year>100)throw Error('조건·경계·연도를 확인하세요.');
 return {schema:'finite-water-selection/1',id,label:s.label,boundaryId,selectedYear:year,reachCount:b.reachCount,sourceCells:b.sourceCells,
  status:s.status,boundaryStatus:b.status,assumptions:s.options,widthM:b.widthM,target:b.target,
  annual:b.annual[year-1],localTotals:b.totals,localInitial:b.initial,localFinal:b.final,
  localMaxSurchargeM:b.maxSurchargeM,localBackwaterSteps:b.backwaterSteps,
  horizonYears:s.options.years,chain:s.totals,global:s.global,replacement:s.replacement,scope:d.scope,
  provenance:d.provenance,actual:s.actual,automaticAdoption:false,
  limitations:['Designed soil/aquifer capacities; initial mixed store split is a hypothesis.',
   'Surcharge columns are virtual vertical walls, not a flood map or original bathymetry.',
   'One-way tailwater proxy; no reverse flow or channel travel time.',
   'Original temperature-based snow/melt/ET retained; no energy, ice or polar closure.',
   'No bed seepage or external groundwater loss; aquifer water returns locally.']};
}
return {validate,query};
});
