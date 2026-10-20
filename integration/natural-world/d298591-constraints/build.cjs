'use strict';
const fs=require('node:fs'),path=require('node:path'),z=require('node:zlib'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const B=require('./core.cjs'),S=require('../d298591-surface/core.cjs'),C=require('../core.js'),K=require('../stage5/codec.js');
const root=path.resolve(__dirname,'..'),out=path.join(__dirname,'output'),read=p=>{const b=fs.readFileSync(path.join(root,p));return JSON.parse(p.endsWith('.gz')?z.gunzipSync(b):b);},sha=p=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
const paths=['d298591-surface/inputs/fluxes.json.gz','d298591-surface/output/review.json.gz','stage2/inputs/seasonal.json','stage5/output/foundation-fc5d72cbbab3.json.gz','d298591-constraints/inputs/source-audit.json'];
const [raw,previous,season,foundation,audit]=paths.map(read),source=S.unpack(raw),{width:w,height:h}=foundation,n=w*h;
for(const d of [previous.summary,season,foundation])for(const key of ['worldHash','geometryHash'])assert.equal(d.provenance[key],raw[key]);
assert.equal(audit.sha256,raw.provenance.sourceHashes['application/source/app.js']);assert.equal(season.provenance.applicationHtmlSha256,raw.provenance.sourceHashes['application/planet-observatory.html']);
const a=Object.fromEntries(['heights','land','lake'].map(k=>[k,K.decode(foundation.fields[k].data,n,foundation.fields[k].type)]));
const wind={...season.wind,months:season.wind.months.map(m=>({u:K.decode(m.u,season.wind.width*season.wind.height,'f32'),v:K.decode(m.v,season.wind.width*season.wind.height,'f32')}))};
assert.equal(wind.stepDegrees,4);assert.equal(season.tilt,23.4);
const surfaceSet=new Set(previous.model.columns.map(c=>c.cell)),f=source.fields;
const cells=source.cells.map((cell,j)=>{
 const [longitude,latitude]=C.ll(w,h,cell),temperaturesC=Array.from(f.temperatureC.slice(j*12,j*12+12)),precipitationMm=Array.from(f.precipitationMm.slice(j*12,j*12+12)),balance=B.snowBalance(temperaturesC,precipitationMm),sum=k=>Array.from(f[k].slice(j*12,j*12+12)).reduce((s,v)=>s+v,0);
 const r={cell,longitude,latitude,elevationM:a.heights[cell],areaM2:source.area[j],insidePriorColumns:surfaceSet.has(cell),temperaturesC,precipitationMm,sourceStartSnowMm:f.snowStartMm[j*12],sourceEndSnowMm:f.snowEndMm[j*12+11],sourceSnowChangeMm:sum('snowChangeMm'),sourceSnowfallMm:sum('snowfallMm'),sourceMeltMm:sum('meltMm'),balance,balanceWarmingC:B.balanceWarming(temperaturesC,precipitationMm),wind:Array.from({length:12},(_,k)=>B.interpolateWind(wind,longitude,latitude,k)),actualSnowDepthM:null,actualIceThicknessM:null};
 assert(Math.abs(r.sourceSnowChangeMm-balance.annualAccumulationMm)<1e-6);return r;
});
const byCell=new Map(cells.map(c=>[c.cell,c])),classes=['no-positive-temperature','snowfall-exceeds-melt-capacity','no-persistent-accumulation'].map(reason=>{
 const selected=cells.filter(c=>c.balance.reason===reason);return {reason,cells:selected.length,cellIds:selected.map(c=>c.cell),areaM2:selected.reduce((s,c)=>s+c.areaM2,0),annualSnowIncreaseM3:selected.reduce((s,c)=>s+c.sourceSnowChangeMm*c.areaM2/1000,0),insidePriorColumns:selected.filter(c=>c.insidePriorColumns).length};
});
const sensitivity=[];
for(const warmingC of [0,1,2,5])for(const meltFactor of [22.5,45,90]){
 const rows=cells.map(c=>B.snowBalance(c.temperaturesC,c.precipitationMm,{warmingC,meltFactor}));
 sensitivity.push({id:`T${warmingC}-M${meltFactor}`,warmingC,meltFactorMmPerCPerPeriod:meltFactor,accumulatingCells:rows.filter(r=>r.annualAccumulationMm>1e-7).length,noPositiveTemperatureCells:rows.filter(r=>r.reason==='no-positive-temperature').length,annualSnowIncreaseM3:rows.reduce((s,r,j)=>s+r.annualAccumulationMm*cells[j].areaM2/1000,0),cellAccumulationMm:rows.map(r=>r.annualAccumulationMm),appliedToClimate:false,appliedToHydrology:false});
}
const energy=previous.scenarios.map(s=>({id:s.id,maskYear:100,maskSource:'Prior conditional scenario final wet mask, held fixed for this diagnostic; not a moving-mask replay.',...B.energy(s.final.wetCells.map(c=>byCell.get(c)),s.options.evaporationMPerYear)}));
let maxSolarRelativeDifference=0;
for(const e of energy){const fine=B.energy(e.maskCells.map(c=>byCell.get(c)),e.evaporationMPerYear,256);for(let k=0;k<12;k++)maxSolarRelativeDifference=Math.max(maxSolarRelativeDifference,Math.abs(e.periods[k].toaWm2-fine.periods[k].toaWm2)/fine.periods[k].toaWm2);}
const model=previous.model,original=new Set(model.columns.map(c=>c.cell)),idx=model.outletPathCells.findIndex(c=>!original.has(c));assert(idx>0);
const gate=[model.outletPathCells[idx-1],model.outletPathCells[idx]],crest=model.crestM;
assert.equal(Math.max(...gate.map(c=>a.heights[c])),crest);
const bypass=B.firstBypass(a,w,h,model.node,crest,gate),outletLevels=[];
const bounded=B.component(a,w,h,model.node,bypass.levelM-1e-7,gate);
const candidateDomain={maximumExclusiveLevelM:bypass.levelM,maximumExclusiveRiseM:bypass.riseM,gateDeleted:gate,cells:bounded.cells,columns:bounded.cells.map(cell=>({cell,elevationM:a.heights[cell],areaM2:C.rowArea(w,h,Math.floor(cell/w))*1e6})),extraCells:bounded.cells.filter(c=>!original.has(c)),missingSourceCells:bounded.cells.filter(c=>!byCell.has(c)),marineContactCount:bounded.marineContacts.length,actualCapacityM3:null,adopted:false,meaning:'Connected native columns just below the alternate outlet threshold, after deleting one gate edge. All must be integrated into the dynamic model before trial routing. The exclusive threshold is not a physical safety margin.'};
for(const stageRiseM of [0,.05,.1,.5,1]){
 const open=B.component(a,w,h,model.node,crest+stageRiseM),held=B.component(a,w,h,model.node,crest+stageRiseM,gate);
 const pack=r=>({cells:r.cells,cellCount:r.cells.length,extraCells:r.cells.filter(c=>!original.has(c)),marineContactCount:r.marineContacts.length,lakeContactCount:r.lakeContacts.length,marineWitness:r.marineWitness,areaM2:r.cells.reduce((s,c)=>s+C.rowArea(w,h,Math.floor(c/w))*1e6,0),actualInundationAreaM2:null});
 outletLevels.push({stageRiseM,stageM:crest+stageRiseM,open:pack(open),gateHeld:pack(held),guard:[-1,0,.05,.5,1].map(tailwaterDepthM=>B.outletGuard({stageRiseM,extraCells:held.cells.filter(c=>!original.has(c)).length,bypass:held.marineContacts.length>0,tailwaterDepthM}))});
}
const x0=Math.min(...model.columns.map(c=>c.cell%w))-3,x1=Math.max(...model.columns.map(c=>c.cell%w))+3,y0=Math.min(...model.columns.map(c=>Math.floor(c.cell/w)))-3,y1=Math.max(...model.columns.map(c=>Math.floor(c.cell/w)))+3,localColumns=[];
for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const cell=y*w+x;localColumns.push({cell,elevationM:a.heights[cell],land:!!a.land[cell],lake:!!a.lake[cell],insidePriorColumns:original.has(cell)});}
const outlet={crestM:crest,gate,candidateDomain,gateAssumption:'Delete exactly one D8 edge in both directions. This is a topology diagnostic, not a physical dam, cross-section or reservoir.',bypass,levels:outletLevels,localColumns,path:model.outletPathCells.map(cell=>({cell,elevationM:a.land[cell]?a.heights[cell]:null,marine:!a.land[cell]&&!a.lake[cell],location:C.ll(w,h,cell)})),originalSeaDatumM:foundation.context.seaLevel_m,actualLocalTailwaterM:null,actualWidthM:null,actualDischargeM3S:null,coupledRoutingReady:false,meaning:'Flood connectivity at a common trial stage stops at ocean/lake masks. Open ocean-connected components are not static reservoir volume or actual inundation. Only the selected local window is drawn; counts use the full native grid. Stage rise is distinct from energy head; equality is only a negligible-approach-velocity assumption.'};
const availability=[
 {quantity:'육지 기온·강수',status:'원본 제공',use:'619격자·12기간 원본 산술. 관측·수면 온도 아님.'},
 {quantity:'수평 바람',status:'진단값 제공',use:'4도 격자 공간 보간. 측정 높이 미정, 2m 바람으로 사용하지 않음.'},
 {quantity:'대기권 상단 일사',status:'원본 궤도식',use:'1361W/m²·기울기23.4°의 기간 평균. 지표 순복사 아님.'},
 {quantity:'습도·수증기압',status:'미정',use:'선택 유역의 채택 sample에 없음. 다른 수원 모듈을 대입하지 않음.'},
 {quantity:'지표 순복사·열수지',status:'미정',use:'구름·반사율·장파·현열·이류·물 열저장 부족.'},
 {quantity:'빙설·수면 온도',status:'미정',use:'눈은 물당량 장부. 실제 눈 깊이·결빙 범위 아님.'},
 {quantity:'출구 단면·하류 수위',status:'미정',use:'원본 해양 기준0m를 출구 바로 아래 수위로 대입하지 않음.'}
];
const provenance={baseline:'5bcce093daca1bc9cf4687fbb9d3f7ffd0fe8078',worldHash:raw.worldHash,geometryHash:raw.geometryHash,archiveCommit:audit.archiveCommit,inputs:Object.fromEntries(paths.map(p=>[p,sha(p)])),code:Object.fromEntries(['d298591-constraints/core.cjs','d298591-constraints/build.cjs','cold-water/diagnostics.js'].map(p=>[p,sha(p)]))};
const summary={schema:'d298591-constraints-summary/1',provenance,status:'source-causes-and-domain-constraints-not-physical-adoption',classes,annualSnowIncreaseM3:classes.reduce((s,c)=>s+c.annualSnowIncreaseM3,0),sensitivity:sensitivity.map(({cellAccumulationMm,...r})=>r),energy:energy.map(({periods,maskCells,...r})=>({...r,maximumLatentToToaRatio:Math.max(...periods.map(p=>p.latentToToaRatio))})),maxSolarRelativeDifference,candidateDomain:{cells:candidateDomain.cells.length,extraCells:candidateDomain.extraCells.length,missingSourceCells:candidateDomain.missingSourceCells,maximumExclusiveRiseM:candidateDomain.maximumExclusiveRiseM,adopted:false},gate,crestM:crest,bypass:{...bypass,path:undefined},outletLevels:outletLevels.map(r=>({stageRiseM:r.stageRiseM,openCells:r.open.cellCount,gateHeldCells:r.gateHeld.cellCount,extraGateHeldCells:r.gateHeld.extraCells.length,gateHeldMarineContacts:r.gateHeld.marineContactCount})),availability,actualSnowDepthM:null,actualEvaporationMPerYear:null,actualInfiltrationM3:null,actualDischargeM3S:null,physicalResolvedReaches:0,unresolvedReaches:23022,automaticAdoption:false};
const payload={schema:'d298591-constraints-review/1',summary,cells,sensitivity,energy,outlet,audit,automaticAdoption:false};
fs.mkdirSync(out,{recursive:true});const write=(p,d)=>fs.writeFileSync(path.join(out,p),JSON.stringify(d,null,2)+'\n');write('summary.json',summary);
const bytes=z.gzipSync(JSON.stringify(payload),{level:9,mtime:0});fs.writeFileSync(path.join(out,'review.json.gz'),bytes);write('manifest.json',{schema:'d298591-constraints-manifest/1',file:'review.json.gz',bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});
console.log(JSON.stringify({classes,sensitivity:summary.sensitivity,energy:summary.energy.map(e=>({id:e.id,coldDays:e.belowZeroAirEquivalentDays,gap:e.shortwaveGapPeriods,ratio:e.maximumLatentToToaRatio})),gate,bypass:summary.bypass,levels:summary.outletLevels,maxSolarRelativeDifference,bytes:bytes.length},null,2));
