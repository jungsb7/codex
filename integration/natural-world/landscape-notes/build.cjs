'use strict';
// Extract only the 30 existing representative points. Never recalculate terrain or climate.
const fs=require('node:fs'),path=require('node:path'),z=require('node:zlib'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const U=require('../unified-atlas/core.js'),C=require('../core.js'),L=require('../landscape-draft/core.js');
const base=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(base,p)),json=p=>JSON.parse(read(p)),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const atlas=read('unified-atlas/output/atlas.json.gz'),m=U.create(JSON.parse(z.gunzipSync(atlas))),summary=json('landscape-draft/output/summary.json'),mf=json('seasonal-loading/output/manifest.json'),prose=require('./prose.json'),groups=L.create(m);
assert.equal(sha(atlas),mf.atlasSHA256);
function unpack(part){const b=read('seasonal-loading/output/'+part.file);assert.equal(b.length,part.bytes);assert.equal(sha(b),part.sha256);const raw=z.gunzipSync(b);assert.equal(raw.length,part.rawBytes);return raw;}
const periods=mf.periods.map(unpack),water=JSON.parse(unpack(mf.metadata)),reaches=new Map(water.reaches.map(r=>[r.id,r]));
const extreme=(samples,key,fn)=>{const value=fn(...samples.map(s=>s[key]));return {value,periods:samples.filter(s=>s[key]===value).map(s=>s.period)};};
const fmt=v=>v.toLocaleString('ko-KR',{maximumFractionDigits:1});
const entries=summary.proposals.map(g=>{
  assert.deepEqual(groups.query(g.representativeCell,g.family).unit,g);
  const cell=g.representativeCell,center=C.ll(m.d.width,m.d.height,cell),q=U.query(m,...center),j=m.index[cell],r=reaches.get(m.a.reach[j]);
  const samples=periods.map((b,k)=>({period:k+1,phaseDegrees:k*30,temperatureC:b.readFloatLE(j*4),precipitationMm:b.readFloatLE((m.d.count+j)*4),flowM3s:r?Math.fround(Math.expm1(b.readUInt16LE(m.d.count*8+r.flowIndex*2)/2048)):null}));
  const contrast={coldest:extreme(samples,'temperatureC',Math.min),warmest:extreme(samples,'temperatureC',Math.max),driest:extreme(samples,'precipitationMm',Math.min),wettest:extreme(samples,'precipitationMm',Math.max)};
  const temperatureSpan=contrast.warmest.value-contrast.coldest.value,rainSpan=contrast.wettest.value-contrast.driest.value;
  for(const s of samples){
    const cool=s.temperatureC<=0?'영하 표본에 맞춰 차가운 색조와 지형 윤곽을 강조하는 장면을 제안한다.':temperatureSpan>1&&s.temperatureC<=contrast.coldest.value+temperatureSpan*.25?'이 지점의 비교적 서늘한 위상에는 낮은 채도의 풍경을 제안한다.':'영상 표본에 맞춰 지형과 후보 식생의 색 대비를 드러내는 장면을 제안한다.';
    const wet=rainSpan<=1?'강수 차이가 작아 기간별 물기 표현의 차이는 크게 두지 않는 초안이다.':s.precipitationMm>=contrast.driest.value+rainSpan*.75?'이 지점에서 강수가 비교적 많은 표본이므로 젖은 색조를 더하는 초안이다.':s.precipitationMm<=contrast.driest.value+rainSpan*.25?'이 지점에서 강수가 비교적 적은 표본이므로 마른 색조를 더하는 초안이다.':'강수 대비가 중간인 표본으로, 두 색조 사이의 장면을 제안한다.';
    s.appearanceDraft=cool+' '+wet;
  }
  const periodText=e=>e.periods.join('·')+'기간';
  return {id:g.id,title:g.regionName+' · '+g.label,nameStatus:'existing-region-and-class-label',properPlaceName:null,cell,center,family:g.family,regionId:g.regionId,
    mapHref:'../unified-atlas/index.html#'+new URLSearchParams({mode:'nature',cell,lon:center[0],lat:center[1],zoom:12,region:g.regionId,draftFamily:g.family,period:1,seasonal:false}),
    existing:{status:'existing-input',elevationM:q.original.elevationM,existingLake:q.original.existingLake,sourceGridDegrees:360/m.d.width,meaning:'기존 설계 세계의 원본 격자. 실측 지형이 아님.'},
    candidate:{status:'computed-candidate',landform:q.candidates.landform,potentialVegetation:q.candidates.potentialVegetation,wetness:q.candidates.wetness,pointReasons:q.reasons,group:g,
      hydrology:r?Object.fromEntries(['id','start','end','nextNode','endpointNode','endpointKind','downstreamReach','upstreamReaches','lengthKm','catchmentAreaKm2'].map(k=>[k,r[k]])):null,
      hydrologyMeaning:r?'대표 격자에 연결된 기존 모형의 표시 물길 후보. 실제 강폭·방류 확정 아님.':'대표 격자에 표시 물길 ID가 없음. 하천 부재나 유량 0을 의미하지 않음.'},
    creative:{status:'unadopted-description-draft',overview:prose[g.id]},
    seasonal:{scope:'representative-cell-only',meaning:'12기간은 공전 위상 표본이며 지구 달력 월이 아님. 유량은 기간 평균의 로그 양자화 표시값.',contrast,
      summary:`기온은 ${periodText(contrast.coldest)} ${fmt(contrast.coldest.value)}°C에서 ${periodText(contrast.warmest)} ${fmt(contrast.warmest.value)}°C, 강수는 ${periodText(contrast.driest)} ${fmt(contrast.driest.value)}mm에서 ${periodText(contrast.wettest)} ${fmt(contrast.wettest.value)}mm까지다. 대표 한 격자의 대비이며 연속군 전체의 균일한 계절이 아니다.`,
      samples,appearanceStatus:'creative-suggestion-not-physical-output',flowPrecision:'Float32(expm1(code/2048)); 기존 표시용 로그 양자화'},
    unknown:{actualForestAreaKm2:null,actualWetlandAreaKm2:null,actualRiverWidthM:null,actualFloodAreaKm2:null,actualIceThicknessM:null,actualSnowBoundary:null,politicalOrNarrativeRole:null},
    automaticAdoption:false};
});
assert.equal(entries.length,30);assert.deepEqual(Object.keys(prose).sort(),entries.map(e=>e.id).sort());assert(entries.every(e=>e.creative.overview));
const inputPaths=['unified-atlas/output/atlas.json.gz','landscape-draft/output/summary.json','seasonal-loading/output/manifest.json','landscape-notes/prose.json'];
const catalog={schema:'landscape-description-catalog/1',atlasSHA256:sha(atlas),worldHash:m.d.provenance.worldHash,entries,provenance:{inputs:Object.fromEntries(inputPaths.map(p=>[p,sha(read(p))])),periodParts:mf.periods,metadataPart:mf.metadata},meaning:'기존 대표30연속군의 대표 한 격자 설명. 기존 권역·분류명을 유지하며 고유 지명을 새로 정하지 않음. 실제 피복·서사 채택0건.'};
const out=path.join(__dirname,'output');fs.mkdirSync(out,{recursive:true});const bytes=Buffer.from(JSON.stringify(catalog)+'\n');fs.writeFileSync(path.join(out,'catalog.json'),bytes);
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify({schema:'landscape-description-manifest/1',atlasSHA256:sha(atlas),file:'catalog.json',bytes:bytes.length,sha256:sha(bytes)},null,2)+'\n');
let report='# 대표 30경관 설명·계절 모습 초안 — 후속21\n\n[전체 JSON](output/catalog.json) · [사용·재현 안내](README.md)\n\n기존 권역명과 후보 분류명을 유지했다. 제목은 검색용 표제이며 정식 지명이 아니다. 이하 묘사는 미채택 창작 초안이다. 기후는 대표 한 격자의 12위상 표본이며 실제 피복·침수·결빙은 미정이다.\n\n';
for(const e of entries){const g=e.candidate.group;report+=`## ${e.title}\n\n[지도 열기](${e.mapHref}) · \`${e.id}\` · 원본 #${e.cell} · 경도 ${e.center[0]}°, 위도 ${e.center[1]}°\n\n기존 입력: 고도 ${fmt(e.existing.elevationM)}m. 계산 후보: ${e.candidate.landform.name} / ${e.candidate.potentialVegetation.name} / ${e.candidate.wetness.name}. 연속군 ${g.cellCount}격자, ${L.STATUS[g.reviewStatus]}.\n\n**창작 설명 초안:** ${e.creative.overview}\n\n**대표점 계절 대비:** ${e.seasonal.summary}\n\n**수계·보류:** ${e.candidate.hydrology?`물길 후보 #${e.candidate.hydrology.id}, 종착 상태 \`${e.candidate.hydrology.endpointKind}\`.`:e.candidate.hydrologyMeaning} 연속군 경고: ${Object.entries(g.flagCounts).filter(([,v])=>v).map(([k,v])=>U.REASONS[k]+' '+v+'격자').join(' / ')||'기록된 보류·전이 경고 없음 · 실제 피복 채택 아님'}.\n\n| 기간 / 공전 위상 | 기온 °C | 강수 mm | 유량 후보 m³/s |\n| --- | ---: | ---: | ---: |\n${e.seasonal.samples.map(s=>`| ${s.period} / ${s.phaseDegrees}° | ${fmt(s.temperatureC)} | ${fmt(s.precipitationMm)} | ${s.flowM3s===null?'미정':fmt(s.flowM3s)} |`).join('\n')}\n\n`;}
fs.writeFileSync(path.join(__dirname,'CATALOG.md'),report);
console.log(JSON.stringify({entries:entries.length,periodSamples:entries.length*12,catalogBytes:bytes.length,sha256:sha(bytes)},null,2));
