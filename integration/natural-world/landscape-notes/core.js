(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('../core.js'));else root.LandscapeNotes=factory(root.NaturalWorld);})(globalThis,function(C){
'use strict';
function validate(catalog,m){
  if(catalog.schema!=='landscape-description-catalog/1'||catalog.atlasSHA256!==m.atlasSHA256||catalog.worldHash!==m.d.provenance.worldHash)throw Error('경관 설명과 지도 버전이 다릅니다.');
  if(catalog.entries?.length!==30||new Set(catalog.entries.map(e=>e.id)).size!==30)throw Error('대표 경관 목록이 올바르지 않습니다.');
  for(const e of catalog.entries){
    const j=m.index[e.cell],ll=C.ll(m.d.width,m.d.height,e.cell);
    if(j<0||m.a.lake[j]||e.center[0]!==ll[0]||e.center[1]!==ll[1]||e.existing.elevationM!==m.a.elevation[j]||e.candidate.group.representativeCell!==e.cell||e.candidate.group.id!==e.id||e.automaticAdoption!==false)throw Error('경관 설명의 원본 좌표가 다릅니다.');
    if(m.landscapeDraft?.query(e.cell,e.family).unit?.id!==e.id)throw Error('경관 설명의 연속군이 다릅니다.');
    if(e.seasonal.samples.length!==12||e.seasonal.samples.some((s,k)=>s.period!==k+1||s.phaseDegrees!==k*30||![s.temperatureC,s.precipitationMm].every(Number.isFinite)||s.precipitationMm<0||!(s.flowM3s===null||Number.isFinite(s.flowM3s))))throw Error('경관 계절 표본이 올바르지 않습니다.');
  }
  return catalog;
}
function query(catalog,cell,family,period){
  const entries=catalog.entries.filter(e=>e.cell===cell),e=entries.find(e=>e.family===family)||entries[0];
  if(!e)return null;
  const sample=e.seasonal.samples.find(s=>s.period===period);
  return {schema:'landscape-description-point/1',...e,selectedPeriod:period,selectedSeason:sample||null,provenance:catalog.provenance};
}
return {validate,query};
});
