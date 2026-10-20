(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else {root.LandscapeCompare=factory();root.LandscapeCompare.install(root.UnifiedNature);}
})(globalThis,function(){
'use strict';
function period(value,fallback=7){
  if(value===null||value===undefined||String(value).trim()==='')return fallback;
  const n=Number(value);return Number.isFinite(n)?Math.max(1,Math.min(12,Math.floor(n))):fallback;
}
function compare(catalog,cell,family,a,b){
  if(!catalog)return null;
  const rows=catalog.entries.filter(e=>e.cell===cell),e=rows.find(e=>e.family===family)||rows[0];
  if(!e||![a,b].every(n=>Number.isInteger(n)&&n>=1&&n<=12))return null;
  const left=e.seasonal.samples.find(s=>s.period===a),right=e.seasonal.samples.find(s=>s.period===b);
  if(!left||!right)return null;
  const difference=Object.fromEntries(['temperatureC','precipitationMm','flowM3s'].map(k=>[k,Number.isFinite(left[k])&&Number.isFinite(right[k])?right[k]-left[k]:null]));
  return {schema:'landscape-period-comparison/1',id:e.id,title:e.title,cell:e.cell,center:e.center,family:e.family,
    scope:'representative-cell-only',periodA:a,periodB:b,left,right,difference,differenceMeaning:'B − A; 원본 표본의 단순 차이이며 시간 추세·누적 변화량이 아님.',
    existing:e.existing,candidate:e.candidate,creative:e.creative,unknown:e.unknown,automaticAdoption:false,
    seasonalMeaning:e.seasonal.meaning,appearanceStatus:e.seasonal.appearanceStatus,flowPrecision:e.seasonal.flowPrecision,
    atlasSHA256:catalog.atlasSHA256,provenance:catalog.provenance};
}
function href(q){
  if(!q)return null;
  return '#'+new URLSearchParams({mode:'nature',cell:q.cell,lon:q.center[0],lat:q.center[1],zoom:12,draftFamily:q.family,period:q.periodA,comparePeriod:q.periodB,seasonal:false});
}
function install(U){
  const read=U.readState;
  U.readState=(hash,d)=>{const s=read(hash,d),p=new URLSearchParams(hash.replace(/^#/,''));s.comparePeriod=period(p.get('comparePeriod'));return s;};
}
return {period,compare,href,install};
});
