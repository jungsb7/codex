(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('../core.js'),require('../stage2/core.js'),require('../stage5/codec.js'));else root.PETReview=factory(root.NaturalWorld,root.ClimateGeology,root.NaturalMapCodec);})(typeof globalThis!=='undefined'?globalThis:this,function(C,S,Codec){
 'use strict';
 const CONSTANTS={yearDays:365,periods:12,tiltDegrees:23.4,solarConstantWm2:1361,wattsPerMmDay:28.5,temperatureOffsetC:5,temperatureScaleC:100,radiationSamples:64};
 const CASES=[{id:'phase',name:'Oudin · 대표 위상',note:'원본과 같은 위상의 일평균 대기권 밖 일사. 12기간 기온을 해당 기간의 일평균 대용으로 사용.'},{id:'interval',name:'Oudin · 기간 일사 평균',note:'각 위상 ±15°에서 일사를 64회 평균. 원본 기간 기온은 고정. 일별 날씨를 복원한 값이 아님.'}];
 const FLAGS={polarGap:1,hotPETGap:2,settingConflict:4,transition:8,unresolvedDrainage:16,largeVirtualFill:32,wetlandCandidate:64,volcanicCorridor:128};
 const REASONS={polarGap:'극지 수분 수송 미검증',hotPETGap:'38°C 초과 PET 미검증 — 비교 후에도 보류',settingConflict:'세계 설정·식생 후보 충돌',transition:'기존 식생 임계값 부근',unresolvedDrainage:'하류 내부 배분 경계 미정',largeVirtualFill:'100m 초과 가상 채움',wetlandCandidate:'습지 후보, 실제 침수 미정',volcanicCorridor:'화산대 가설, 개별 화산 미정'};
 function solar(latitude,phase,tilt=CONSTANTS.tiltDegrees){
  if(![latitude,phase,tilt].every(Number.isFinite)||Math.abs(latitude)>90||Math.abs(tilt)>90)throw Error('Invalid solar coordinates');
  const d=Math.PI/180,dec=Math.asin(Math.sin(tilt*d)*Math.sin(phase*d)),a=Math.sin(latitude*d)*Math.sin(dec),b=Math.cos(latitude*d)*Math.cos(dec),h=Math.abs(b)<1e-12?(a>0?Math.PI:a<0?0:Math.PI/2):Math.acos(C.clamp(-a/b,-1,1));
  return {daylightHours:24*h/Math.PI,fluxWm2:Math.max(0,CONSTANTS.solarConstantWm2/Math.PI*(h*a+b*Math.sin(h)))};
 }
 function radiation(latitude,period,method='phase',samples=CONSTANTS.radiationSamples){
  if(!Number.isInteger(period)||period<0||period>11||!CASES.some(c=>c.id===method))throw Error('Invalid period or method');
  if(method==='phase')return solar(latitude,period*30).fluxWm2;
  if(!Number.isInteger(samples)||samples<1)throw Error('Invalid quadrature');
  let sum=0;for(let i=0;i<samples;i++)sum+=solar(latitude,period*30-15+30*(i+.5)/samples).fluxWm2;return sum/samples;
 }
 function oudinDaily(temperatureC,fluxWm2){
  if(!Number.isFinite(temperatureC)||!Number.isFinite(fluxWm2)||fluxWm2<0)return null;
  return Math.max(0,temperatureC+5)/100*fluxWm2/28.5;
 }
 function evaluate(t,p,lat,method='phase',lake=false,fluxes){
  if(t.length!==12||p.length!==12||![...t,...p].every(Number.isFinite)||p.some(x=>x<0)||!CASES.some(c=>c.id===method))throw Error('Invalid seasonal inputs');
  const flux=fluxes||Array.from({length:12},(_,m)=>radiation(lat,m,method));
  if(flux.length!==12||!flux.every(v=>Number.isFinite(v)&&v>=0))throw Error('Invalid radiation inputs');
  const pet=t.map((v,m)=>oudinDaily(v,flux[m])*365/12);
  return {...classify(t,p,pet,lat,lake),periods:t.map((v,m)=>({period:m+1,phaseDegrees:m*30,temperatureC:v,precipitationMm:p[m],toaWm2:flux[m],petMm:pet[m]})),method};
 }
 function classify(t,p,pet,lat,lake=false){
  if(t.length!==12||p.length!==12||pet.length!==12||!Number.isFinite(lat)||Math.abs(lat)>90||![...t,...p].every(Number.isFinite)||p.some(v=>v<0)||pet.some(v=>v!==null&&(!Number.isFinite(v)||v<0)))throw Error('Invalid classification inputs');
  const valid=pet.every(v=>v!==null),rain=p.reduce((a,b)=>a+b,0),total=valid?pet.reduce((a,b)=>a+b,0):null,ai=total>0?rain/total:null,hot=Math.max(...t),cold=Math.min(...t),growing=t.filter(v=>v>=10).length,dry=valid?pet.map((e,m)=>e>0&&p[m]<e):null,dryCount=dry?dry.filter(Boolean).length:null,longest=dry?S.longest(dry):null;
  let biome=11;if(lake)biome=1;else if(Math.abs(lat)>72||!valid)biome=11;else if(hot<=0)biome=2;else if(hot<10||growing<3)biome=3;else if(ai===null)biome=11;else if(ai<.2)biome=4;else if(ai<.5)biome=5;else if(ai<.65||longest>6)biome=6;else if(cold>=18)biome=ai>=1&&rain>=1500&&dryCount<=1?8:7;else biome=cold<=-3?10:9;
  return {annualRainMm:rain,annualPETMm:total,aridityIndex:ai,dryPeriods:dryCount,longestDryPeriods:longest,biome,hotC:hot,coldC:cold,growingPeriods:growing};
 }
 function decode(data){const fields=Object.fromEntries(Object.entries(data.fields).map(([k,v])=>[k,Codec.decode(v.data,data.count,v.type)])),hotCount=data.summary.scope.hotCells;return {fields,temperatures:Codec.decode(data.hot.temperatures,hotCount*12,'f32'),precipitation:Codec.decode(data.hot.precipitation,hotCount*12,'f32'),byCell:new Map(Array.from(fields.cells,(c,j)=>[c,j]))};}
 const finite=v=>Number.isFinite(v)?v:null;
 function query(data,model,cell,method='phase'){
  if(!Number.isInteger(cell)||cell<0||cell>=data.width*data.height||!CASES.some(c=>c.id===method))throw Error('Invalid cell or method');
  const j=model.byCell.get(cell),location=C.ll(data.width,data.height,cell);if(j===undefined)return {cell,location,scope:'ocean',status:'not-terrestrial',actualCover:null};
  const f=model.fields,hi=f.hotIndex[j],hot=hi>=0,lake=!!f.lake[j],mask=f.flags[j],prefix=method==='phase'?'o':'i';
  let baseline={annualRainMm:f.rain[j],annualPETMm:finite(f.baselinePET[j]),aridityIndex:finite(f.baselineAI[j]),biome:f.biome[j]},comparison={annualPETMm:f[prefix+'PET'][j],aridityIndex:finite(f[prefix+'AI'][j]),biome:f[prefix+'Biome'][j]},periods=null;
  if(hot){const t=Array.from(model.temperatures.subarray(hi*12,hi*12+12)),p=Array.from(model.precipitation.subarray(hi*12,hi*12+12)),e=S.pet(t,location[1],data.constants.tiltDegrees);baseline=classify(t,p,e,location[1],lake);comparison=evaluate(t,p,location[1],method,lake);periods=comparison.periods.map((v,m)=>({...v,baselinePETMm:e[m],hotGap:t[m]>38}));delete comparison.periods;}
  return {schema:'hot-pet-point/1',cell,location,region:data.regions.find(r=>r.id===f.region[j]),scope:hot?'hot-pet-review':'outside-hot-scope-control',status:lake?'existing-water':hot?'hold-method-unvalidated':mask&5?'hold-existing-evidence':'existing-screening-only',lake,hotPeriods:f.hotPeriods[j],maximumTemperatureC:f.maxT[j],baseline,comparison:{...comparison,method,status:'conditional-not-adopted',calibrationValidated:false},periods,flags:mask,reasons:Object.keys(FLAGS).filter(k=>mask&FLAGS[k]).map(k=>({id:k,text:REASONS[k]})),actualCover:lake?'existing-water':null,actualEvapotranspirationMm:null,runoffMm:null,adopted:false,provenance:data.provenance,limitations:['Oudin 일식의 12기간 기온 대용 적용. 실제 일별 날씨·고온 검증 없음.','기존 식생 임계값을 고정한 방법 민감도. 새 식생의 정답이나 현존 피복 아님.','호수에서 계산한 수치는 기후 비교 지표이며 실제 호수 증발량이 아님.']};
 }
 function at(data,model,lon,lat,method='phase'){if(![lon,lat].every(Number.isFinite)||lon< -180||lon>180||lat< -90||lat>90)throw Error('경도 -180~180°, 위도 -90~90°를 입력하세요.');return query(data,model,C.cell(data.width,data.height,lon,lat),method);}
 return {CONSTANTS,CASES,FLAGS,REASONS,solar,radiation,oudinDaily,classify,evaluate,decode,query,at};
});
