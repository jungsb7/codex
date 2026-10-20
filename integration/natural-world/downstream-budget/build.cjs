'use strict';
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const Codec=require('../stage5/codec.js'),C=require('../core.js'),B=require('./core.js'),A=require('../retention-priority/analysis.cjs');
const root=path.resolve(__dirname,'../../..'),base=path.resolve(__dirname,'..'),out=path.join(__dirname,'output');
const read=p=>{const b=fs.readFileSync(path.join(base,p));return JSON.parse(p.endsWith('.gz')?zlib.gunzipSync(b):b);};
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(path.join(base,p))).digest('hex');
const paths=['stage3/output/waterways.json','retention-priority/output/atlas.json.gz','hydrology-audit/output/atlas.json.gz','unified-atlas/output/atlas.json.gz','pond-decision-review/output/register.json'];
const [water,prior,hydro,atlas,closed]=paths.map(read),n=atlas.width*atlas.height;
assert.equal(hash(paths[0]),prior.provenance.inputs[paths[0]]);
assert.equal(hash(paths[2]),prior.provenance.inputs[paths[2]]);
assert.equal(hash(paths[3]),hydro.atlasSHA256);
for(const d of [water,prior,hydro])for(const k of ['worldHash','geometryHash'])assert.equal(d.provenance[k],atlas.provenance[k]);
const decode=(d,size)=>Object.fromEntries(Object.entries(d.fields).map(([k,v])=>[k,Codec.decode(v.data,size,v.type)]));
const u=decode(atlas,atlas.count),a=decode(water,n),index=new Map(Array.from(u.cells,(cell,j)=>[cell,j])),byNode=new Map(prior.groups.map(g=>[g.node,g]));
const members=new Map(prior.groups.map(g=>[g.node,[]])),catchments=new Map(prior.groups.map(g=>[g.node,[]]));
for(const cell of u.cells){members.get(a.canonical[cell])?.push(cell);catchments.get(a.terminal[a.canonical[cell]])?.push(cell);}
const unresolved=water.reaches.filter(r=>r.endpointKind==='unresolved-depression');
assert.equal(unresolved.length,23022);
const reaches=unresolved.map(r=>{
  const g=byNode.get(r.endpointNode);assert(g);assert.equal(a.terminal[r.end],g.node);
  return {id:r.id,start:r.start,end:r.end,endpointNode:g.node,downstreamReach:r.downstreamReach,category:B.category(g),directBoundaryEntry:r.nextNode===g.node};
});
const reachLists=new Map(prior.groups.map(g=>[g.node,[]]));
for(const r of reaches)reachLists.get(r.endpointNode).push(r.id);
const groups=prior.groups.map(g=>{
  const source=water.depressions.find(d=>d.node===g.node),ids=reachLists.get(g.node);
  assert.deepEqual(source.monthlyInflowM3,g.monthlyInflowM3);assert.equal(members.get(g.node).length,g.footprintCells);assert.equal(catchments.get(g.node).length,g.cells);
  const direct=reaches.filter(r=>r.endpointNode===g.node&&r.directBoundaryEntry).map(r=>r.id);
  assert.deepEqual([...direct].sort((a,b)=>a-b),[...source.inletReaches].sort((a,b)=>a-b));
  return {id:g.id,node:g.node,location:g.location,regionId:g.regionId,regionName:g.regionName,category:B.category(g),flags:g.flags,
    reachCount:ids.length,directInletReachIds:direct,catchmentCells:g.cells,footprintCells:g.footprintCells,
    annualInflowM3:g.annualInflowM3,periodInflowM3:g.monthlyInflowM3,inflowRank:g.inflowRank,
    outletTarget:g.outlet.target,outletLevelM:g.outlet.connectionLevelM,crestMarginM:g.crestMarginM??null,
    hotPETGapCells:g.hotPETGapCells,polarGapCells:g.polarGapCells,settingConflictCells:g.settingConflictCells,
    actualStorageM3:null,actualInfiltrationM3:null,actualEvaporationM3:null,actualOverflowM3:null,automaticAdoption:false};
});
// Choose by source inflow, with explicit conditions, never by a confidence score.
const excluded=['D193196','D126467','D147845','D144758'],ranked=[...prior.groups].filter(g=>!excluded.includes(g.id)).sort((a,b)=>a.inflowRank-b.inflowRank);
const cleanOcean=ranked.filter(g=>!g.flags.length&&g.outlet.target.kind==='ocean');
const choices=[
  ['해양 출구 후보 중 방법 공백 없는 유입1위',cleanOcean[0]],
  ['해양 출구 후보 중 방법 공백 없는 유입2위',cleanOcean[1]],
  ['다음 경계만 보류된 유역 중 유입1위',ranked.find(g=>g.flags.length===1&&g.flags[0]==='next-boundary-unresolved')],
  ['고온 방법 공백이 있는 유역 중 유입1위',ranked.find(g=>g.hotPETGapCells)],
  ['극지 공백이 있는 유역 중 유입1위',ranked.find(g=>g.polarGapCells)],
  ['하류 수위 결합 검토 대상 중 유입1위',ranked.find(g=>g.flags.includes('coupled-level-review'))]
];
const representatives=choices.map(([selection,g])=>{
  const footprint=members.get(g.node),domain=[...new Set([...footprint,...g.outlet.pathCells.slice(0,g.outlet.rootPathCells)])];
  const columns=domain.map(cell=>{const j=index.get(cell);assert(j!==undefined&&!u.lake[j]);return {cell,elevationM:u.elevation[j],areaM2:C.rowArea(atlas.width,atlas.height,Math.floor(cell/atlas.width))*1e6};});
  const connection=A.minimax(columns,atlas.width,atlas.height,g.node),crest=g.outlet.connectionLevelM;
  assert(columns.every(c=>connection.cost.get(c.cell)<=crest+1e-7));
  const geo=B.geometry(columns,crest),row={...groups.find(r=>r.id===g.id),selection,columns,geometry:{...geo,domainCells:domain.length,extraToleranceCells:domain.length-footprint.length,scope:'native-footprint-and-root-approach-only',meaning:'원본 격자를 공통 문턱 높이까지 채운 정적 기둥체적. 실제 수면·수심·저류 용량이 아니며 이웃 경계로 확장하지 않음.'},outletPathCells:g.outlet.pathCells,catchmentCellIds:catchments.get(g.node)};
  assert(geo.volumeM3>0);
  row.scenarios=[];
  for(const initialFraction of [0,.5])for(const lossMPerYear of [0,.25,.5,1,2]){
    const e=B.experiment(row,{years:100,initialFraction,lossMPerYear}),{periods,...summary}=e;
    row.scenarios.push({...summary,lastYear:periods.slice(-12)});
  }
  return row;
});
assert.equal(closed.closed,true);assert.equal(closed.remainingRequiredSteps,0);
const closedCells=new Set(closed.cells.map(([cell])=>cell));
assert(representatives.every(g=>g.catchmentCellIds.every(cell=>!closedCells.has(cell))));
const total=groups.reduce((s,g)=>s+g.annualInflowM3,0),counts=Object.keys(B.CLASSES).map(key=>{
  const rows=groups.filter(g=>g.category===key);
  return {key,label:B.CLASSES[key],boundaries:rows.length,reaches:rows.reduce((s,g)=>s+g.reachCount,0),annualInflowM3:rows.reduce((s,g)=>s+g.annualInflowM3,0)};
});
const checks=[
  {id:'all-23022-reaches-mapped-once',passed:new Set(reaches.map(r=>r.id)).size===23022&&groups.reduce((s,g)=>s+g.reachCount,0)===23022},
  {id:'1184-terminal-catchments-168576-cells',passed:groups.length===1184&&groups.reduce((s,g)=>s+g.catchmentCells,0)===168576},
  {id:'boundary-input-not-summed-along-reaches',passed:Math.abs(total-prior.summary.totalAnnualBoundaryInflowM3)/total<1e-12},
  {id:'all-source-inlet-reaches-and-periods-match',passed:true},
  {id:'six-distinct-representatives-outside-closed-review',passed:new Set(representatives.map(r=>r.id)).size===6&&representatives.every(r=>!excluded.includes(r.id))},
  {id:'all-representative-geometry-connected-at-crest',passed:true},
  {id:'all-60-experiments-conserve-inventory',passed:representatives.every(g=>g.scenarios.every(e=>Math.abs(e.cumulativeResidualM3)<Math.max(1,e.totalInflowM3*1e-11)))},
  {id:'physical-allocation-remains-null',passed:groups.every(g=>['actualStorageM3','actualInfiltrationM3','actualEvaporationM3','actualOverflowM3'].every(k=>g[k]===null))}
];
assert(checks.every(c=>c.passed));
const provenance={baseline:'f939f3f28d1e35ace62cabd7442725d63abd9108',worldHash:atlas.provenance.worldHash,geometryHash:atlas.provenance.geometryHash,inputs:Object.fromEntries(paths.map(p=>[p,hash(p)])),code:Object.fromEntries(['downstream-budget/core.js','downstream-budget/build.cjs'].map(p=>[p,hash(p)]))};
const summary={schema:'downstream-boundary-summary/1',status:'screened-and-budget-tested-not-physically-resolved',provenance,boundaries:groups.length,reaches:reaches.length,catchmentCells:168576,totalAnnualBoundaryInflowM3:total,categories:counts,outletTargets:{ocean:groups.filter(g=>g.outletTarget.kind==='ocean').length,unresolved:groups.filter(g=>g.outletTarget.kind==='unresolved').length},
  representativeIds:representatives.map(r=>r.id),excludedPreviousStudyBoundaries:excluded,experiments:60,checks,physicalResolvedBoundaries:0,physicalResolvedReaches:0,automaticAdoption:false,
  limitations:['기존 모델에서 도출한 경계 유입이며 관측값이 아님.','분류는 고온·극지 → 수위 결합 → 하류 목적지 순의 상호 배타 집계이며 원래 중첩 flags도 보존.','모든 구간 유량을 더하면 합류·하류에서 중복된다. 유입은 각 종착 경계의 원본 장부만 합산.','실제 저류·침투·증발·넘침은 미정. 순손실·체적 초과 장부를 실제 물리 배분으로 승격하지 않음.']};
const payload={schema:'downstream-boundary-review/1',provenance,summary,groups,reaches,representatives,automaticAdoption:false};
fs.mkdirSync(out,{recursive:true});const write=(p,d)=>fs.writeFileSync(path.join(out,p),JSON.stringify(d,null,2)+'\n');
write('summary.json',summary);write('checks.json',checks);
const bytes=zlib.gzipSync(JSON.stringify(payload),{level:9,mtime:0});fs.writeFileSync(path.join(out,'review.json.gz'),bytes);
write('manifest.json',{schema:'downstream-boundary-manifest/1',file:'review.json.gz',bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});
console.log(JSON.stringify({categories:counts,representatives:representatives.map(g=>({id:g.id,selection:g.selection,inflowKm3:g.annualInflowM3/1e9,capacityKm3:g.geometry.volumeM3/1e9,areaKm2:g.geometry.areaM2/1e6,steadyLossM:g.annualInflowM3/g.geometry.areaM2,zeroLossFirstExcess:g.scenarios[0].firstExcess})),checks},null,2));
