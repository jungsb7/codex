(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.TerrainWaterView=factory();})(globalThis,function(){
'use strict';
function validate(d,m){if(d?.schema!=='terrain-water-review/1'||m?.schema!=='terrain-water-models/1'||d.automaticAdoption!==false||d.scope.preparedBoundaries!==946||m.models.length!==946||d.scenarios.length!==3||d.provenance.worldHash!==m.provenance.worldHash)throw Error('자료 형식/범위가 다릅니다.');return d;}
function query(d,m,id,boundaryId,year){validate(d,m);const s=d.scenarios.find(s=>s.id===id),g=d.domains.find(g=>g.id===boundaryId),model=m.models.find(m=>m.id===boundaryId);if(!s||!g||!model)throw Error('조건·경계를 확인하세요.');const b=s.boundaries.find(b=>b.id===boundaryId),selectedYear=year===undefined?(b?.annual.at(-1).year??null):year;
 if(b&&(!Number.isInteger(selectedYear)||selectedYear<1||selectedYear>b.annual.length))throw Error('중단 이후의 연도는 계산하지 않았습니다.');
 return {schema:'terrain-water-selection/1',id,label:s.label,boundaryId,reachCount:g.reachCount,geometry:g,columns:model.columns,
  computed:!!b,notComputedReason:b?null:g.engineCompatibility==='contact-at-or-below-reference-crest'?'기준 문턱 이하에서 다른 집수권 접촉':g.engineCompatibility!=='reference-crest-compatible'?'기준 문턱보다 낮은 출구의 별도 배수 계산 필요':'원본 기후·초기 저장 장부 수집 전',
  selectedYear:b?selectedYear:null,annual:b?b.annual[selectedYear-1]:null,localTotals:b?.totals??null,outletTransfers:b?.outlets??null,localFinal:b?.final??null,
  componentStatus:s.status,stop:s.stop,requestedYears:s.options.years,elapsedYears:s.elapsedYears,lastAcceptedTimeYears:s.lastAcceptedTimeYears,
  componentTotals:s.totals,assumptions:s.options,scope:d.scope,refinement:d.refinement,provenance:d.provenance,
  previousGeometryComparison:s.geometryComparison.find(c=>c.id===boundaryId)??null,actual:d.actual,automaticAdoption:false,
  limitations:['Native D8 connectivity and original-cell heights; not actual fine-scale flood extents.',
   'Total designed outlet width is shared equally among faces to the same native target.',
   'First different-target/lake/ocean contact stops the whole component; last step is a crossing diagnostic.',
   'Geometry prepared for946 boundaries is not forcing or dynamic simulation of all946.',
   'No general reverse flow, hot/polar energy/ice completion or automatic world adoption.']};}
return {validate,query};
});
